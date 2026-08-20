package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode/utf8"
)

const maxSongSize = 64 * 1024
const maxSuggestionSize = 4 * 1024

type server struct {
	cfg     config
	gh      *gitHubClient
	limiter *rateLimiter
}

type songEditRequest struct {
	Path           string `json:"path"`
	Content        string `json:"content"`
	Note           string `json:"note"`
	Author         string `json:"author"`
	TurnstileToken string `json:"turnstileToken"`
}

type suggestionRequest struct {
	Message        string `json:"message"`
	Song           string `json:"song"`
	Name           string `json:"name"`
	TurnstileToken string `json:"turnstileToken"`
}

var songPathRe = regexp.MustCompile(`^canzoni/[a-z0-9_]+/[a-z0-9_]+\.cho$`)
var titleRe = regexp.MustCompile(`\{title:\s*([^}]+)\}`)

func validateSongPath(path string) error {
	if !songPathRe.MatchString(path) {
		return fmt.Errorf("path must match canzoni/<categoria>/<file>.cho, all lowercase")
	}
	return nil
}

func validateSongContent(content string) error {
	if content == "" {
		return fmt.Errorf("content is empty")
	}
	if len(content) > maxSongSize {
		return fmt.Errorf("content exceeds %d bytes", maxSongSize)
	}
	if !utf8.ValidString(content) || strings.ContainsRune(content, 0) {
		return fmt.Errorf("content is not valid UTF-8 text")
	}
	if !titleRe.MatchString(content) {
		return fmt.Errorf("content is missing the {title:...} directive")
	}
	return nil
}

// songTitle extracts the {title:...} directive from a ChordPro document.
func songTitle(content string) string {
	if m := titleRe.FindStringSubmatch(content); m != nil {
		return strings.TrimSpace(m[1])
	}
	return ""
}

func (s *server) handleSongEdit(w http.ResponseWriter, r *http.Request) {
	var req songEditRequest
	if !s.decode(w, r, &req, maxSongSize+8*1024) {
		return
	}
	if err := validateSongPath(req.Path); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateSongContent(req.Content); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !s.verifyTurnstile(w, r, req.TurnstileToken) {
		return
	}

	ctx := r.Context()
	title := songTitle(req.Content)

	baseSHA, err := s.gh.branchSHA(ctx, s.cfg.baseBranch)
	if err != nil {
		s.serverError(w, "reading base branch", err)
		return
	}
	stem := strings.TrimSuffix(req.Path[strings.LastIndex(req.Path, "/")+1:], ".cho")
	branch := fmt.Sprintf("edit/%s-%d", stem, time.Now().Unix())
	if err := s.gh.createBranch(ctx, branch, baseSHA); err != nil {
		s.serverError(w, "creating branch", err)
		return
	}
	sha, err := s.gh.fileSHA(ctx, req.Path, s.cfg.baseBranch)
	if err != nil {
		s.serverError(w, "reading current file", err)
		return
	}
	message := fmt.Sprintf("Aggiorna %s dal sito", title)
	if sha == "" {
		message = fmt.Sprintf("Aggiunge %s dal sito", title)
	}
	if err := s.gh.putFile(ctx, req.Path, branch, message, req.Content, sha); err != nil {
		s.serverError(w, "committing file", err)
		return
	}

	var body strings.Builder
	body.WriteString("Modifica proposta dal sito.\n")
	if author := strings.TrimSpace(req.Author); author != "" {
		fmt.Fprintf(&body, "\n**Autore:** %s\n", author)
	}
	if note := strings.TrimSpace(req.Note); note != "" {
		fmt.Fprintf(&body, "\n**Nota:** %s\n", note)
	}
	prURL, err := s.gh.createPullRequest(ctx, message, branch, s.cfg.baseBranch, body.String())
	if err != nil {
		s.serverError(w, "creating pull request", err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"pullRequestUrl": prURL})
}

func (s *server) handleSuggestion(w http.ResponseWriter, r *http.Request) {
	var req suggestionRequest
	if !s.decode(w, r, &req, maxSuggestionSize) {
		return
	}
	message := strings.TrimSpace(req.Message)
	if message == "" {
		writeError(w, http.StatusBadRequest, "message is empty")
		return
	}
	if !utf8.ValidString(message) {
		writeError(w, http.StatusBadRequest, "message is not valid UTF-8 text")
		return
	}
	if !s.verifyTurnstile(w, r, req.TurnstileToken) {
		return
	}

	title := "Suggerimento dal sito"
	label := "feedback-generale"
	if song := strings.TrimSpace(req.Song); song != "" {
		title = fmt.Sprintf("Suggerimento: %s", song)
		label = "feedback-canto"
	}
	var body strings.Builder
	body.WriteString(message)
	body.WriteString("\n")
	if name := strings.TrimSpace(req.Name); name != "" {
		fmt.Fprintf(&body, "\n**Da:** %s\n", name)
	}
	if song := strings.TrimSpace(req.Song); song != "" {
		fmt.Fprintf(&body, "\n**Canzone:** %s\n", song)
	}
	issueURL, err := s.gh.createIssue(r.Context(), title, body.String(), []string{label})
	if err != nil {
		s.serverError(w, "creating issue", err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"issueUrl": issueURL})
}

// decode reads a JSON body with a size cap; on failure it writes the error
// response and returns false.
func (s *server) decode(w http.ResponseWriter, r *http.Request, dst any, maxBytes int64) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
		return false
	}
	return true
}

// verifyTurnstile validates the Cloudflare Turnstile token; on failure it
// writes the error response and returns false. With no secret configured the
// check is skipped.
func (s *server) verifyTurnstile(w http.ResponseWriter, r *http.Request, token string) bool {
	if s.cfg.turnstileSecret == "" {
		return true
	}
	ok, err := verifyTurnstileToken(r.Context(), s.cfg.turnstileSecret, token, clientIP(r))
	if err != nil {
		s.serverError(w, "verifying turnstile token", err)
		return false
	}
	if !ok {
		writeError(w, http.StatusForbidden, "bot verification failed")
		return false
	}
	return true
}

func (s *server) serverError(w http.ResponseWriter, what string, err error) {
	log.Printf("ERROR %s: %v", what, err)
	writeError(w, http.StatusBadGateway, "upstream error while "+what)
}

func (s *server) rateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && !s.limiter.allow(clientIP(r)) {
			writeError(w, http.StatusTooManyRequests, "too many requests, retry later")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if slices.Contains(s.cfg.allowedOrigins, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Editor-Key")
			w.Header().Set("Access-Control-Max-Age", "86400")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// clientIP prefers the first X-Forwarded-For entry (set by Cloud Run) and
// falls back to the connection address.
func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func splitAndTrim(s string) []string {
	var out []string
	for part := range strings.SplitSeq(s, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

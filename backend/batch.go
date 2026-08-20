package main

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const maxBatchFiles = 50

type batchFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type batchRequest struct {
	Files  []batchFile `json:"files"`
	Note   string      `json:"note"`
	Author string      `json:"author"`
}

// handleSongBatch turns a set of edited songs into a single pull request with
// one commit per file. It is the editor's endpoint: instead of the Turnstile
// check it requires the shared editor key in the X-Editor-Key header.
func (s *server) handleSongBatch(w http.ResponseWriter, r *http.Request) {
	if !s.verifyEditorKey(w, r) {
		return
	}
	var req batchRequest
	if !s.decode(w, r, &req, maxBatchFiles*maxSongSize) {
		return
	}
	if len(req.Files) == 0 {
		writeError(w, http.StatusBadRequest, "files is empty")
		return
	}
	if len(req.Files) > maxBatchFiles {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("too many files (max %d)", maxBatchFiles))
		return
	}
	seen := make(map[string]bool, len(req.Files))
	for _, f := range req.Files {
		if err := validateSongPath(f.Path); err != nil {
			writeError(w, http.StatusBadRequest, f.Path+": "+err.Error())
			return
		}
		if err := validateSongContent(f.Content); err != nil {
			writeError(w, http.StatusBadRequest, f.Path+": "+err.Error())
			return
		}
		if seen[f.Path] {
			writeError(w, http.StatusBadRequest, f.Path+": duplicate path")
			return
		}
		seen[f.Path] = true
	}

	ctx := r.Context()
	baseSHA, err := s.gh.branchSHA(ctx, s.cfg.baseBranch)
	if err != nil {
		s.serverError(w, "reading base branch", err)
		return
	}
	branch := fmt.Sprintf("edit/editor-%d", time.Now().Unix())
	if err := s.gh.createBranch(ctx, branch, baseSHA); err != nil {
		s.serverError(w, "creating branch", err)
		return
	}

	var summary strings.Builder
	for _, f := range req.Files {
		title := songTitle(f.Content)
		sha, err := s.gh.fileSHA(ctx, f.Path, s.cfg.baseBranch)
		if err != nil {
			s.serverError(w, "reading current file", err)
			return
		}
		message := fmt.Sprintf("Aggiorna %s dall'editor", title)
		if sha == "" {
			message = fmt.Sprintf("Aggiunge %s dall'editor", title)
		}
		if err := s.gh.putFile(ctx, f.Path, branch, message, f.Content, sha); err != nil {
			s.serverError(w, "committing "+f.Path, err)
			return
		}
		fmt.Fprintf(&summary, "- `%s` (%s)\n", f.Path, title)
	}

	prTitle := fmt.Sprintf("Aggiorna %d canti dall'editor", len(req.Files))
	if len(req.Files) == 1 {
		prTitle = fmt.Sprintf("Aggiorna %s dall'editor", songTitle(req.Files[0].Content))
	}
	var body strings.Builder
	body.WriteString("Modifiche inviate dall'editor online.\n\n")
	body.WriteString(summary.String())
	if author := strings.TrimSpace(req.Author); author != "" {
		fmt.Fprintf(&body, "\n**Autore:** %s\n", author)
	}
	if note := strings.TrimSpace(req.Note); note != "" {
		fmt.Fprintf(&body, "\n**Nota:** %s\n", note)
	}
	prURL, err := s.gh.createPullRequest(ctx, prTitle, branch, s.cfg.baseBranch, body.String())
	if err != nil {
		s.serverError(w, "creating pull request", err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"pullRequestUrl": prURL})
}

// verifyEditorKey checks the shared editor password in the X-Editor-Key
// header; on failure it writes the error response and returns false.
func (s *server) verifyEditorKey(w http.ResponseWriter, r *http.Request) bool {
	if s.cfg.editorKey == "" {
		writeError(w, http.StatusServiceUnavailable, "editor uploads are not configured")
		return false
	}
	key := r.Header.Get("X-Editor-Key")
	if subtle.ConstantTimeCompare([]byte(key), []byte(s.cfg.editorKey)) != 1 {
		writeError(w, http.StatusUnauthorized, "wrong editor key")
		return false
	}
	return true
}

// handleEditorPing lets the editor validate the key before queueing an upload.
func (s *server) handleEditorPing(w http.ResponseWriter, r *http.Request) {
	if !s.verifyEditorKey(w, r) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

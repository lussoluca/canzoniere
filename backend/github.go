package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// gitHubClient is a minimal client for the handful of REST endpoints the
// backend needs: refs, contents, pull requests and issues.
type gitHubClient struct {
	token   string
	repo    string // owner/name
	baseURL string
	http    *http.Client
}

func newGitHubClient(token, repo string) *gitHubClient {
	return &gitHubClient{
		token:   token,
		repo:    repo,
		baseURL: "https://api.github.com",
		http:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *gitHubClient) do(ctx context.Context, method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(buf)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return &apiError{status: resp.StatusCode, body: string(msg), path: path}
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

type apiError struct {
	status int
	body   string
	path   string
}

func (e *apiError) Error() string {
	return fmt.Sprintf("github %s: HTTP %d: %s", e.path, e.status, e.body)
}

func isNotFound(err error) bool {
	if apiErr, ok := err.(*apiError); ok {
		return apiErr.status == http.StatusNotFound
	}
	return false
}

// branchSHA returns the commit SHA at the tip of a branch.
func (c *gitHubClient) branchSHA(ctx context.Context, branch string) (string, error) {
	var out struct {
		Object struct {
			SHA string `json:"sha"`
		} `json:"object"`
	}
	err := c.do(ctx, http.MethodGet, fmt.Sprintf("/repos/%s/git/ref/heads/%s", c.repo, branch), nil, &out)
	return out.Object.SHA, err
}

func (c *gitHubClient) createBranch(ctx context.Context, name, fromSHA string) error {
	body := map[string]string{"ref": "refs/heads/" + name, "sha": fromSHA}
	return c.do(ctx, http.MethodPost, fmt.Sprintf("/repos/%s/git/refs", c.repo), body, nil)
}

// fileSHA returns the blob SHA of a file on a ref, or "" when the file does
// not exist yet.
func (c *gitHubClient) fileSHA(ctx context.Context, path, ref string) (string, error) {
	var out struct {
		SHA string `json:"sha"`
	}
	err := c.do(ctx, http.MethodGet, fmt.Sprintf("/repos/%s/contents/%s?ref=%s", c.repo, path, ref), nil, &out)
	if isNotFound(err) {
		return "", nil
	}
	return out.SHA, err
}

// putFile creates or updates a file on a branch.
func (c *gitHubClient) putFile(ctx context.Context, path, branch, message, content, sha string) error {
	body := map[string]string{
		"message": message,
		"content": base64.StdEncoding.EncodeToString([]byte(content)),
		"branch":  branch,
	}
	if sha != "" {
		body["sha"] = sha
	}
	return c.do(ctx, http.MethodPut, fmt.Sprintf("/repos/%s/contents/%s", c.repo, path), body, nil)
}

func (c *gitHubClient) createPullRequest(ctx context.Context, title, head, base, body string) (string, error) {
	req := map[string]string{"title": title, "head": head, "base": base, "body": body}
	var out struct {
		HTMLURL string `json:"html_url"`
	}
	err := c.do(ctx, http.MethodPost, fmt.Sprintf("/repos/%s/pulls", c.repo), req, &out)
	return out.HTMLURL, err
}

func (c *gitHubClient) createIssue(ctx context.Context, title, body string) (string, error) {
	req := map[string]string{"title": title, "body": body}
	var out struct {
		HTMLURL string `json:"html_url"`
	}
	err := c.do(ctx, http.MethodPost, fmt.Sprintf("/repos/%s/issues", c.repo), req, &out)
	return out.HTMLURL, err
}

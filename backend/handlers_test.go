package main

import (
	"testing"
	"time"
)

func TestValidateSongPath(t *testing.T) {
	valid := []string{
		"canzoni/branco/attorno_alla_rupe.cho",
		"canzoni/canti_scout/canzone_2.cho",
	}
	for _, p := range valid {
		if err := validateSongPath(p); err != nil {
			t.Errorf("validateSongPath(%q) = %v, want nil", p, err)
		}
	}
	invalid := []string{
		"",
		"canzoni/branco/song.txt",
		"canzoni/../secrets/token.cho",
		"canzoni/Branco/song.cho",
		"canzoni/branco/Song Name.cho",
		"editor/src/app.cho",
		"canzoni/branco/nested/song.cho",
		"canzoni/branco/song.cho\n",
	}
	for _, p := range invalid {
		if err := validateSongPath(p); err == nil {
			t.Errorf("validateSongPath(%q) = nil, want error", p)
		}
	}
}

func TestValidateSongContent(t *testing.T) {
	if err := validateSongContent("{title:Test}\n[Do]Ciao\n"); err != nil {
		t.Errorf("valid content rejected: %v", err)
	}
	invalid := map[string]string{
		"empty":       "",
		"no title":    "[Do]Ciao\n",
		"nul byte":    "{title:Test}\x00",
		"invalid utf": "{title:Test}\xff\xfe",
	}
	for name, content := range invalid {
		if err := validateSongContent(content); err == nil {
			t.Errorf("%s: content accepted, want error", name)
		}
	}
}

func TestSongTitle(t *testing.T) {
	got := songTitle("{title: Attorno alla Rupe}\n{artist:X}\n")
	if got != "Attorno alla Rupe" {
		t.Errorf("songTitle = %q, want %q", got, "Attorno alla Rupe")
	}
}

func TestRateLimiter(t *testing.T) {
	now := time.Unix(0, 0)
	l := newRateLimiter(2, time.Minute)
	l.now = func() time.Time { return now }

	for range 2 {
		if !l.allow("a") {
			t.Fatal("first two requests should pass")
		}
	}
	if l.allow("a") {
		t.Fatal("third request within window should be blocked")
	}
	if !l.allow("b") {
		t.Fatal("different key should not be affected")
	}
	now = now.Add(2 * time.Minute)
	if !l.allow("a") {
		t.Fatal("request after window should pass")
	}
}

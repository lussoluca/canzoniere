package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDeduplicateChorusMergesConsecutiveRepeats(t *testing.T) {
	src := `{title:T}
Strofa uno

{start_of_chorus}
Rit uno
Rit due
{end_of_chorus}

Strofa due

{start_of_chorus}
Rit uno
Rit due
{end_of_chorus}

{start_of_chorus}
Rit uno
Rit due
{end_of_chorus}

Strofa tre

{start_of_chorus}
Rit uno
Rit due
{end_of_chorus}
`
	path := filepath.Join(t.TempDir(), "t.cho")
	if err := os.WriteFile(path, []byte(src), 0o644); err != nil {
		t.Fatal(err)
	}
	song, err := parseSong(path)
	if err != nil {
		t.Fatal(err)
	}
	deduplicateChorus(song)

	var got []string
	for _, l := range song.Lines {
		got = append(got, l.Text)
	}
	want := []string{"Strofa uno", "", "Rit uno", "Rit due", "", "Strofa due", "", "Rit. x2", "", "Strofa tre", "", "Rit."}
	if len(got) != len(want) {
		t.Fatalf("got %q, want %q", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %q, want %q", got, want)
		}
	}
}

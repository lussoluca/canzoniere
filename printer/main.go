package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/jung-kurt/gofpdf"
)

const (
	pageW      = 210.0
	pageH      = 297.0
	marginL    = 12.0
	marginR    = 12.0
	marginT    = 15.0
	marginB    = 15.0
	colGap     = 8.0
	colW       = (pageW - marginL - marginR - colGap) / 2
	titleSize  = 11.0
	bodySize   = 9.0
	titleLineH = 6.0
	bodyLineH  = 4.5
	songGap    = 5.0
)

var chordRe = regexp.MustCompile(`\[[^\]]+\]`)

type LineKind int

const (
	KindTitle     LineKind = iota
	KindBody
	KindChorus
	KindChorusRef // "Rit." placeholder for repeated identical chorus
	KindEmpty
)

type Line struct {
	Text string
	Kind LineKind
}

type Song struct {
	Title string
	Lines []Line
}

func parseSong(path string) (*Song, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	song := &Song{}
	inChorus := false
	scanner := bufio.NewScanner(f)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		switch {
		case strings.HasPrefix(line, "{title:"):
			song.Title = strings.TrimSuffix(strings.TrimPrefix(line, "{title:"), "}")

		case line == "{start_of_chorus}" || line == "{soc}":
			inChorus = true

		case line == "{end_of_chorus}" || line == "{eoc}":
			inChorus = false

		case strings.HasPrefix(line, "{comment"):
			// skip comments

		case strings.HasPrefix(line, "{"):
			// skip other directives

		default:
			text := chordRe.ReplaceAllString(line, "")
			text = strings.TrimSpace(text)
			if text == "" {
				last := len(song.Lines) - 1
				if last >= 0 && song.Lines[last].Kind != KindEmpty {
					song.Lines = append(song.Lines, Line{Kind: KindEmpty})
				}
			} else {
				kind := KindBody
				if inChorus {
					kind = KindChorus
				}
				song.Lines = append(song.Lines, Line{Text: text, Kind: kind})
			}
		}
	}

	// Trim trailing empty lines
	for len(song.Lines) > 0 && song.Lines[len(song.Lines)-1].Kind == KindEmpty {
		song.Lines = song.Lines[:len(song.Lines)-1]
	}

	return song, scanner.Err()
}

func loadAllSongs(songDir string) (map[string]*Song, error) {
	songs := make(map[string]*Song)
	err := filepath.Walk(songDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".cho") {
			return err
		}
		song, err := parseSong(path)
		if err != nil {
			return fmt.Errorf("parse %s: %w", path, err)
		}
		if song.Title != "" {
			songs[strings.ToLower(song.Title)] = song
		}
		return nil
	})
	return songs, err
}

type Layout struct {
	pdf  *gofpdf.Fpdf
	tr   func(string) string
	col  int
	curY float64
}

func newLayout(pdf *gofpdf.Fpdf) *Layout {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	return &Layout{pdf: pdf, tr: tr, col: 0, curY: marginT}
}

func (l *Layout) x() float64 {
	return marginL + float64(l.col)*(colW+colGap)
}

func (l *Layout) nextCol() {
	if l.col == 0 {
		l.col = 1
	} else {
		l.pdf.AddPage()
		l.col = 0
	}
	l.curY = marginT
}

func (l *Layout) ensureSpace(h float64) {
	if l.curY+h > pageH-marginB {
		l.nextCol()
	}
}

func (l *Layout) setFont(kind LineKind) {
	switch kind {
	case KindTitle:
		l.pdf.SetFont("Helvetica", "B", titleSize)
	case KindChorus, KindChorusRef:
		l.pdf.SetFont("Helvetica", "I", bodySize)
	default:
		l.pdf.SetFont("Helvetica", "", bodySize)
	}
}

func lh(kind LineKind) float64 {
	if kind == KindTitle {
		return titleLineH
	}
	return bodyLineH
}

func (l *Layout) writeLine(text string, kind LineKind) {
	if kind == KindEmpty {
		l.curY += bodyLineH * 0.4
		return
	}

	l.setFont(kind)
	h := lh(kind)
	lines := l.pdf.SplitLines([]byte(l.tr(text)), colW)
	total := float64(len(lines)) * h

	l.ensureSpace(total)
	x := l.x()
	for _, lb := range lines {
		l.pdf.SetXY(x, l.curY)
		l.pdf.CellFormat(colW, h, string(lb), "", 0, "L", false, 0, "")
		l.curY += h
	}
}

func (l *Layout) writeSong(song *Song) {
	// Keep title + at least one body line together
	l.ensureSpace(titleLineH + bodyLineH)

	l.writeLine(song.Title, KindTitle)
	l.curY += 1.0

	for _, line := range song.Lines {
		text := line.Text
		if line.Kind == KindChorus || line.Kind == KindChorusRef {
			text = "  " + text
		}
		l.writeLine(text, line.Kind)
	}

	l.curY += songGap
}

func chorusText(lines []Line, start, end int) string {
	var sb strings.Builder
	for i := start; i < end; i++ {
		if lines[i].Kind == KindChorus {
			sb.WriteString(lines[i].Text)
			sb.WriteByte('\n')
		}
	}
	return sb.String()
}

// deduplicateChorus replaces repeated chorus blocks identical to the first with a single "Rit." line.
func deduplicateChorus(song *Song) {
	type block struct{ start, end int }
	var blocks []block

	i := 0
	for i < len(song.Lines) {
		if song.Lines[i].Kind == KindChorus {
			start := i
			for i < len(song.Lines) && (song.Lines[i].Kind == KindChorus || song.Lines[i].Kind == KindEmpty) {
				i++
			}
			end := i
			for end > start && song.Lines[end-1].Kind == KindEmpty {
				end--
			}
			blocks = append(blocks, block{start, end})
		} else {
			i++
		}
	}

	if len(blocks) < 2 {
		return
	}

	firstText := chorusText(song.Lines, blocks[0].start, blocks[0].end)

	// Replace in reverse so earlier indices stay valid
	for idx := len(blocks) - 1; idx >= 1; idx-- {
		b := blocks[idx]
		if chorusText(song.Lines, b.start, b.end) == firstText {
			newLines := make([]Line, 0, len(song.Lines)-(b.end-b.start)+1)
			newLines = append(newLines, song.Lines[:b.start]...)
			newLines = append(newLines, Line{Text: "Rit.", Kind: KindChorusRef})
			newLines = append(newLines, song.Lines[b.end:]...)
			song.Lines = newLines
		}
	}
}

func main() {
	input := flag.String("input", "", "txt file with song titles, one per line")
	output := flag.String("output", "songbook.pdf", "output PDF path")
	songDir := flag.String("songs", "canzoni", "directory containing .cho files")
	dedupChorus := flag.Bool("dedup-chorus", false, "replace repeated identical choruses with Rit.")
	flag.Parse()

	if *input == "" {
		fmt.Fprintln(os.Stderr, "usage: printer -input <titles.txt> [-output <out.pdf>] [-songs <dir>]")
		os.Exit(1)
	}

	f, err := os.Open(*input)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open %s: %v\n", *input, err)
		os.Exit(1)
	}
	var titles []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		t := strings.TrimSpace(sc.Text())
		if t != "" && !strings.HasPrefix(t, "#") {
			titles = append(titles, t)
		}
	}
	f.Close()
	if err := sc.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "scan %s: %v\n", *input, err)
		os.Exit(1)
	}

	// Build title map lazily (only if needed)
	var titleMap map[string]*Song

	var ordered []*Song
	for _, t := range titles {
		var song *Song
		if strings.HasSuffix(t, ".cho") {
			// path relative to songs dir
			path := filepath.Join(*songDir, t)
			s, err := parseSong(path)
			if err != nil {
				fmt.Fprintf(os.Stderr, "warning: cannot read %q: %v\n", t, err)
				continue
			}
			song = s
		} else {
			// match by title
			if titleMap == nil {
				titleMap, err = loadAllSongs(*songDir) //nolint
				if err != nil {
					fmt.Fprintf(os.Stderr, "load songs: %v\n", err)
					os.Exit(1)
				}
			}
			s, ok := titleMap[strings.ToLower(t)]
			if !ok {
				fmt.Fprintf(os.Stderr, "warning: not found: %q\n", t)
				continue
			}
			song = s
		}
		ordered = append(ordered, song)
	}

	if len(ordered) == 0 {
		fmt.Fprintln(os.Stderr, "no matching songs found")
		os.Exit(1)
	}

	if *dedupChorus {
		for _, song := range ordered {
			deduplicateChorus(song)
		}
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(marginL, marginT, marginR)
	pdf.SetAutoPageBreak(false, marginB)
	pdf.AddPage()

	layout := newLayout(pdf)
	for _, song := range ordered {
		layout.writeSong(song)
	}

	if err := pdf.OutputFileAndClose(*output); err != nil {
		fmt.Fprintf(os.Stderr, "write PDF: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("wrote %d songs to %s\n", len(ordered), *output)
}

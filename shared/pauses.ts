// Autoscroll pauses: the reader's scroll holds for some seconds on a line.
// In the .cho a pause is a {x_pause:N} line right after the line it belongs
// to; in memory it is keyed by the index of that line among the song's timed
// lines (the ones the reader renders as text: lyrics, comments, tabs), so the
// same pauses apply on every screen size and survive a round-trip through a
// URL or localStorage.

import type { Line, Song } from './chordpro';

export type Pauses = Record<number, number>; // timed-line index → seconds

export const PAUSE_MAX = 60;

export function isTimedLine(line: Line): boolean {
	return line.type === 'lyric' || line.type === 'comment' || line.type === 'tab';
}

function clampSeconds(seconds: number): number {
	return Math.min(PAUSE_MAX, Math.max(0, Math.round(seconds)));
}

// A pause belongs to the nearest preceding timed line; one before any timed
// line has nothing to hold on and is dropped, repeated ones add up.
export function songPauses(song: Song): Pauses {
	const out: Pauses = {};
	let idx = -1;
	for (const line of song.lines) {
		if (isTimedLine(line)) idx++;
		else if (line.type === 'pause' && idx >= 0) {
			out[idx] = clampSeconds((out[idx] ?? 0) + line.seconds);
		}
	}
	return out;
}

export function withPauses(song: Song, pauses: Pauses): Song {
	const lines: Line[] = [];
	let idx = -1;
	for (const line of song.lines) {
		if (line.type === 'pause') continue;
		lines.push(line);
		if (isTimedLine(line)) {
			idx++;
			const seconds = pauses[idx];
			if (seconds > 0) lines.push({ type: 'pause', seconds });
		}
	}
	return { ...song, lines };
}

// FNV-1a over the timed lines' text: identifies the line layout the indices
// refer to, so pauses computed on one version of a song are never applied to
// another. Chords, pauses and blank lines do not move the indices.
export function linesFingerprint(song: Song): string {
	const text = song.lines
		.filter(isTimedLine)
		.map((l) => `${l.type}\u0000${'text' in l ? l.text : ''}`)
		.join('\n');
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16);
}

function entries(p: Pauses): [number, number][] {
	return Object.entries(p)
		.map(([k, v]): [number, number] => [Number(k), v])
		.sort((a, b) => a[0] - b[0]);
}

export function encodePauses(p: Pauses): string {
	return entries(p)
		.map(([k, v]) => `${k}:${v}`)
		.join(',');
}

export function decodePauses(s: string): Pauses {
	const out: Pauses = {};
	for (const part of s.split(',')) {
		const m = part.trim().match(/^(\d+):(-?\d+(?:\.\d+)?)$/);
		if (!m) continue;
		const seconds = clampSeconds(Number(m[2]));
		if (seconds > 0) out[Number(m[1])] = seconds;
	}
	return out;
}

export function samePauses(a: Pauses, b: Pauses): boolean {
	return encodePauses(a) === encodePauses(b);
}

export function adjustPause(p: Pauses, line: number, deltaSeconds: number): Pauses {
	const out = { ...p };
	const seconds = clampSeconds((p[line] ?? 0) + deltaSeconds);
	if (seconds > 0) out[line] = seconds;
	else delete out[line];
	return out;
}

export function pausedLineAtOrBefore(p: Pauses, line: number): number | null {
	let found: number | null = null;
	for (const [k] of entries(p)) if (k <= line) found = k;
	return found;
}

// What the reader keeps on the device: the learned pauses, plus the line
// layout and the official pauses they were learned against.
export interface StoredPauses {
	fp: string;
	base: Pauses;
	pauses: Pauses;
}

// The device's pauses still apply only while the song's lines and its
// official pauses are the ones they were learned against.
export function resolveDevicePauses(stored: StoredPauses | null, song: Song): Pauses | null {
	if (!stored) return null;
	if (stored.fp !== linesFingerprint(song)) return null;
	if (!samePauses(stored.base, songPauses(song))) return null;
	return stored.pauses;
}

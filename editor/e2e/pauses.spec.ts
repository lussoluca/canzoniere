import { test, expect } from '@playwright/test';
import { parse, serialize } from '../../shared/chordpro';
import {
	songPauses,
	withPauses,
	linesFingerprint,
	encodePauses,
	decodePauses,
	adjustPause,
	pausedLineAtOrBefore,
	resolveDevicePauses
} from '../../shared/pauses';

// Pure unit tests of the pause model shared by the reader and the editor.

const SRC = `{title:T}

{x_pause:3}
[Re]uno
{comment:Rit.}
{start_of_chorus}
due
{x_pause:8}
{end_of_chorus}

tre
{x_pause:5}
{x_pause:2}
`;

test('x_pause round-trips through parse/serialize', () => {
	const song = parse(SRC);
	expect(song.lines.filter((l) => l.type === 'pause')).toHaveLength(4);
	expect(serialize(song)).toContain('due\n{x_pause:8}\n{end_of_chorus}');
	expect(parse('{title:T}\n\nuno\n{x_pause:abc}').lines[1]).toEqual({
		type: 'directive',
		raw: '{x_pause:abc}'
	});
});

test('songPauses attaches to the preceding timed line, drops leading, sums repeats', () => {
	// timed lines: 0 "uno", 1 comment "Rit.", 2 "due", 3 "tre"
	expect(songPauses(parse(SRC))).toEqual({ 2: 8, 3: 7 });
	expect(songPauses(parse('{title:T}\n\nuno\n{x_pause:50}\n{x_pause:50}'))).toEqual({ 0: 60 });
});

test('withPauses replaces pause lines and ignores out-of-range indices', () => {
	const out = withPauses(parse(SRC), { 0: 4, 9: 9 });
	expect(songPauses(out)).toEqual({ 0: 4 });
	expect(serialize(out)).toContain('[Re]uno\n{x_pause:4}\n{comment:Rit.}');
});

test('fingerprint ignores chords, pauses and blank lines, not text', () => {
	const fp = linesFingerprint(parse(SRC));
	expect(linesFingerprint(parse(SRC.replace('[Re]', '[Mi]').replace('{x_pause:8}\n', '')))).toBe(
		fp
	);
	expect(linesFingerprint(parse(SRC.replace('tre', 'quattro')))).not.toBe(fp);
});

test('encode/decode: sorted, clamped, junk dropped', () => {
	expect(encodePauses({ 30: 4, 12: 8 })).toBe('12:8,30:4');
	expect(decodePauses('12:8,abc,3:0,4:-2,5:999,6:2.6')).toEqual({ 12: 8, 5: 60, 6: 3 });
	expect(decodePauses('')).toEqual({});
});

test('learning arithmetic', () => {
	expect(adjustPause({}, 2, 3.4)).toEqual({ 2: 3 });
	expect(adjustPause({ 2: 3 }, 2, -5)).toEqual({});
	expect(pausedLineAtOrBefore({ 1: 2, 5: 4 }, 4)).toBe(1);
	expect(pausedLineAtOrBefore({ 5: 4 }, 4)).toBeNull();
});

test('device pauses are dropped when lyrics or official pauses change', () => {
	const song = parse(SRC);
	const stored = { fp: linesFingerprint(song), base: songPauses(song), pauses: { 0: 6 } };
	expect(resolveDevicePauses(stored, song)).toEqual({ 0: 6 });
	expect(resolveDevicePauses(null, song)).toBeNull();
	expect(resolveDevicePauses(stored, parse(SRC.replace('tre', 'quattro')))).toBeNull();
	expect(resolveDevicePauses(stored, parse(SRC.replace('{x_pause:8}', '{x_pause:9}')))).toBeNull();
});

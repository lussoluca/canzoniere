// ChordPro parse/serialize for the visual editor.
// Lyric lines are modeled as plain text plus chords anchored at character positions.

export interface Chord {
	pos: number; // character index in the lyric text where the chord is anchored
	chord: string;
}

export type Line =
	| { type: 'lyric'; text: string; chords: Chord[] }
	| { type: 'empty' }
	| { type: 'chorus_start' }
	| { type: 'chorus_end' }
	| { type: 'comment'; text: string }
	| { type: 'directive'; raw: string }; // preserved verbatim (e.g. {transpose:2}, {chorus})

export interface SongMeta {
	title: string;
	artist: string;
	tags: string[];
	columns: number | null;
	scroll: number | null; // initial autoscroll speed for the reader ({x_scroll:N})
}

export interface Song {
	meta: SongMeta;
	lines: Line[];
}

const DIRECTIVE_RE = /^\{\s*([\w-]+)\s*(?::\s*(.*?)\s*)?\}\s*$/;

export function parseLyricLine(raw: string): { text: string; chords: Chord[] } {
	let text = '';
	const chords: Chord[] = [];
	let i = 0;
	while (i < raw.length) {
		if (raw[i] === '[') {
			const close = raw.indexOf(']', i);
			if (close !== -1) {
				chords.push({ pos: text.length, chord: raw.slice(i + 1, close) });
				i = close + 1;
				continue;
			}
		}
		text += raw[i];
		i++;
	}
	return { text, chords };
}

export function parse(source: string): Song {
	const meta: SongMeta = { title: '', artist: '', tags: [], columns: null, scroll: null };
	const lines: Line[] = [];

	for (const raw of source.split(/\r?\n/)) {
		const m = raw.match(DIRECTIVE_RE);
		if (m) {
			const name = m[1].toLowerCase();
			const value = m[2] ?? '';
			switch (name) {
				case 'title':
				case 't':
					meta.title = value;
					continue;
				case 'artist':
					meta.artist = value;
					continue;
				case 'tag':
					meta.tags.push(value);
					continue;
				case 'columns':
					meta.columns = parseInt(value, 10) || null;
					continue;
				case 'x_scroll':
					meta.scroll = parseInt(value, 10) || null;
					continue;
				case 'start_of_chorus':
				case 'soc':
					lines.push({ type: 'chorus_start' });
					continue;
				case 'end_of_chorus':
				case 'eoc':
					lines.push({ type: 'chorus_end' });
					continue;
				case 'comment':
				case 'c':
					lines.push({ type: 'comment', text: value });
					continue;
				default:
					lines.push({ type: 'directive', raw: raw.trim() });
					continue;
			}
		}
		if (raw.trim() === '') {
			lines.push({ type: 'empty' });
		} else {
			lines.push({ type: 'lyric', ...parseLyricLine(raw) });
		}
	}

	// drop leading/trailing empties left over from the metadata block
	while (lines.length && lines[0].type === 'empty') lines.shift();
	while (lines.length && lines[lines.length - 1].type === 'empty') lines.pop();

	return { meta, lines };
}

export function serializeLyricLine(text: string, chords: Chord[]): string {
	const sorted = [...chords].sort((a, b) => a.pos - b.pos);
	let out = '';
	let cursor = 0;
	for (const c of sorted) {
		const pos = Math.max(0, Math.min(c.pos, text.length));
		out += text.slice(cursor, pos) + '[' + c.chord + ']';
		cursor = pos;
	}
	out += text.slice(cursor);
	return out;
}

export function serialize(song: Song): string {
	const head: string[] = [];
	head.push(`{title:${song.meta.title}}`);
	if (song.meta.artist) head.push(`{artist:${song.meta.artist}}`);
	for (const tag of song.meta.tags) head.push(`{tag:${tag}}`);
	if (song.meta.columns) head.push(`{columns:${song.meta.columns}}`);
	if (song.meta.scroll) head.push(`{x_scroll:${song.meta.scroll}}`);

	const body: string[] = [];
	for (const line of song.lines) {
		switch (line.type) {
			case 'lyric':
				body.push(serializeLyricLine(line.text, line.chords));
				break;
			case 'empty':
				body.push('');
				break;
			case 'chorus_start':
				body.push('{start_of_chorus}');
				break;
			case 'chorus_end':
				body.push('{end_of_chorus}');
				break;
			case 'comment':
				body.push(`{comment:${line.text}}`);
				break;
			case 'directive':
				body.push(line.raw);
				break;
		}
	}

	return head.join('\n') + '\n\n' + body.join('\n') + '\n';
}

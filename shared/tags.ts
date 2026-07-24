// Song search tags ({x_tag:...}), shared by editor and reader.

// A tag must be typeable as a single #token in the reader search box, so it is
// normalized to lowercase with hyphens instead of spaces. Letters (accents
// included), digits, "_" and "-" are kept; everything else is dropped.
export function normalizeTag(raw: string): string {
	return raw
		.trim()
		.replace(/^#+/, '')
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^\p{L}\p{N}_-]/gu, '');
}

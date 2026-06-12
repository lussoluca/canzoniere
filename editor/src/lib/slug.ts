export function slugify(title: string): string {
	return (
		title
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '') // strip accents
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '') || 'senza_titolo'
	);
}

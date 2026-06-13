// Fixed set of categories = directories under canzoni/.
// The ChordPro {tag:...} directive is derived from the category (used by the PDF TOC).
export const CATEGORIES = ['branco', 'reparto', 'clan', 'canti_scout', 'chiesa', 'varie'];

export function categoryLabel(category: string): string {
	const spaced = category.replace(/_/g, ' ');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

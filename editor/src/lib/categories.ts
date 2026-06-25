// Categories = the directories under canzoni/. They are dynamic: create, rename
// and delete them from the category manager (the changes hit the filesystem).
// The ChordPro {tag:...} directive is derived from the category (used by the PDF TOC).

// Preferred display order for the historical scout categories; any other category
// is appended after these, sorted alphabetically.
export const CATEGORY_ORDER = ['branco', 'reparto', 'clan', 'canti_scout', 'chiesa', 'varie'];

export function categoryLabel(category: string): string {
	const spaced = category.replace(/_/g, ' ');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function sortCategories(categories: string[]): string[] {
	return [...categories].sort((a, b) => {
		const ia = CATEGORY_ORDER.indexOf(a);
		const ib = CATEGORY_ORDER.indexOf(b);
		if (ia !== -1 && ib !== -1) return ia - ib;
		if (ia !== -1) return -1;
		if (ib !== -1) return 1;
		return a.localeCompare(b, 'it');
	});
}

// A valid category name is a slug: lowercase letters, digits and underscores.
export function isValidCategoryName(name: string): boolean {
	return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(name);
}

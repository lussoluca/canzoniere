// Categories = the directories under canzoni/. They are dynamic: create, rename
// and delete them from the category manager (the changes hit the filesystem).
// The ChordPro {tag:...} directive is derived from the category (used by the PDF TOC).

export function categoryLabel(category: string): string {
	const spaced = category.replace(/_/g, ' ');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Fallback sort for categories without a saved position in .categories.json.
export function sortCategories(categories: string[]): string[] {
	return [...categories].sort((a, b) => a.localeCompare(b, 'it'));
}

// A valid category name is a slug: lowercase letters, digits and underscores.
export function isValidCategoryName(name: string): boolean {
	return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(name);
}

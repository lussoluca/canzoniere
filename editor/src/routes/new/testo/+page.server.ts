import { listCategories, listAllTags } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

// The requested ?category= is read client-side in the page: query params are
// not available while prerendering.
export const load: PageServerLoad = async () => {
	const [categories, allTags] = await Promise.all([listCategories(), listAllTags()]);
	return { categories, allTags };
};

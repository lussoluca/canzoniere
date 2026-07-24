import { listCategories, listAllTags } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const [categories, allTags] = await Promise.all([listCategories(), listAllTags()]);
	const requested = url.searchParams.get('category');
	return {
		categories,
		allTags,
		category: requested && categories.includes(requested) ? requested : categories[0]
	};
};

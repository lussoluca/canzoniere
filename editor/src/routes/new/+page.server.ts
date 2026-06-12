import { listCategories } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const categories = await listCategories();
	const requested = url.searchParams.get('category');
	return {
		categories,
		category: requested && categories.includes(requested) ? requested : categories[0]
	};
};

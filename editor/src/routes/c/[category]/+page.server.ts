import { error } from '@sveltejs/kit';
import { listCategories, listSongsByCategory } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const categories = await listCategories();
	if (!categories.includes(params.category)) {
		error(404, 'Categoria non trovata');
	}
	return {
		category: params.category,
		categories,
		songs: await listSongsByCategory(params.category)
	};
};

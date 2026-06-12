import { error } from '@sveltejs/kit';
import { readSong, listCategories, songExists } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (!(await songExists(params.category, params.file))) {
		error(404, 'Canzone non trovata');
	}
	const [content, categories] = await Promise.all([
		readSong(params.category, params.file),
		listCategories()
	]);
	return { content, categories, category: params.category, file: params.file };
};

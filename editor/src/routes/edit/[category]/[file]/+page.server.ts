import { error } from '@sveltejs/kit';
import { readSong, listCategories, listAllTags, songExists } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (!(await songExists(params.category, params.file))) {
		error(404, 'Canzone non trovata');
	}
	const [content, categories, allTags] = await Promise.all([
		readSong(params.category, params.file),
		listCategories(),
		listAllTags()
	]);
	return { content, categories, allTags, category: params.category, file: params.file };
};

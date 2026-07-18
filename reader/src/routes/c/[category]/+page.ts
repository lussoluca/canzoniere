import { error } from '@sveltejs/kit';
import { categories, songsByCategory } from '$lib/data';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const category = categories.find((c) => c.name === params.category);
	if (!category) error(404, 'Categoria non trovata');
	return { category, songs: songsByCategory(category.name) };
};

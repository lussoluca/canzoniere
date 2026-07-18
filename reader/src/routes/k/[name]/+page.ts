import { error } from '@sveltejs/kit';
import { findSongbook } from '$lib/data';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const book = findSongbook(params.name);
	if (!book) error(404, 'Canzoniere non trovato');
	return { book };
};

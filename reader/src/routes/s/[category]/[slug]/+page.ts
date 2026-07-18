import { error } from '@sveltejs/kit';
import { findSong } from '$lib/data';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const song = findSong(params.category, params.slug);
	if (!song) error(404, 'Canto non trovato');
	return { song };
};

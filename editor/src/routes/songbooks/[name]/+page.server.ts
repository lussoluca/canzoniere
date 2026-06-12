import { error } from '@sveltejs/kit';
import { readSongbook, songbookExists } from '$lib/server/songbooks';
import { listAllSongs } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (!(await songbookExists(params.name))) error(404, 'Canzoniere non trovato');
	const [entries, allSongs] = await Promise.all([readSongbook(params.name), listAllSongs()]);
	return { name: params.name, entries, allSongs };
};

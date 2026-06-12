import { listSongbooks } from '$lib/server/songbooks';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { songbooks: await listSongbooks() };
};

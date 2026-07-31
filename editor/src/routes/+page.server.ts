import { listAllSongs, listCategorySummaries } from '$lib/server/songs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { categories: await listCategorySummaries(), songs: await listAllSongs() };
};

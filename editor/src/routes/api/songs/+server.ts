import { json, error } from '@sveltejs/kit';
import { listCategorySummaries, writeSong, songExists } from '$lib/server/songs';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({ categories: await listCategorySummaries() });
};

export const POST: RequestHandler = async ({ request }) => {
	const { category, file, content } = await request.json();
	if (!category || !file || typeof content !== 'string') {
		error(400, 'category, file and content are required');
	}
	if (await songExists(category, file)) {
		error(409, `${category}/${file} already exists`);
	}
	await writeSong(category, file, content);
	return json({ ok: true, category, file }, { status: 201 });
};

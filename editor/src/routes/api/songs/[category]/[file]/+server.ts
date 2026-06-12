import { json, error } from '@sveltejs/kit';
import { readSong, writeSong, deleteSong, moveSong, songExists } from '$lib/server/songs';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!(await songExists(params.category, params.file))) {
		error(404, 'song not found');
	}
	const content = await readSong(params.category, params.file);
	return json({ category: params.category, file: params.file, content });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const { content } = await request.json();
	if (typeof content !== 'string') error(400, 'content is required');
	await writeSong(params.category, params.file, content);
	return json({ ok: true });
};

// move the song to another category
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { category: newCategory } = await request.json();
	if (typeof newCategory !== 'string' || !newCategory) error(400, 'category is required');
	if (!(await songExists(params.category, params.file))) {
		error(404, 'song not found');
	}
	try {
		await moveSong(params.category, params.file, newCategory);
	} catch (e) {
		error(409, e instanceof Error ? e.message : 'move failed');
	}
	return json({ ok: true, category: newCategory, file: params.file });
};

export const DELETE: RequestHandler = async ({ params }) => {
	if (!(await songExists(params.category, params.file))) {
		error(404, 'song not found');
	}
	await deleteSong(params.category, params.file);
	return json({ ok: true });
};

import { json, error } from '@sveltejs/kit';
import {
	readSongbook,
	writeSongbook,
	deleteSongbook,
	songbookExists
} from '$lib/server/songbooks';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!(await songbookExists(params.name))) error(404, 'canzoniere non trovato');
	return json({ name: params.name, entries: await readSongbook(params.name) });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const { entries } = await request.json();
	if (!Array.isArray(entries) || entries.some((e) => typeof e !== 'string')) {
		error(400, 'entries deve essere una lista di percorsi');
	}
	await writeSongbook(params.name, entries);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params }) => {
	if (!(await songbookExists(params.name))) error(404, 'canzoniere non trovato');
	await deleteSongbook(params.name);
	return json({ ok: true });
};

import { json, error } from '@sveltejs/kit';
import { listSongbooks, songbookExists, writeSongbook } from '$lib/server/songbooks';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({ songbooks: await listSongbooks() });
};

export const POST: RequestHandler = async ({ request }) => {
	const { name, entries } = await request.json();
	if (typeof name !== 'string' || !/^[\w-]+$/.test(name)) {
		error(400, 'nome non valido: usa lettere, numeri, trattini e underscore');
	}
	if (await songbookExists(name)) {
		error(409, `il canzoniere "${name}" esiste già`);
	}
	await writeSongbook(name, Array.isArray(entries) ? entries : []);
	return json({ ok: true, name }, { status: 201 });
};

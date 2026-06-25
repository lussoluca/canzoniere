import { json, error } from '@sveltejs/kit';
import { renameCategory, deleteCategory, categoryExists } from '$lib/server/songs';
import type { RequestHandler } from './$types';

// rename the category (and retag every song inside it)
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { name } = await request.json();
	if (typeof name !== 'string' || !name) error(400, 'name is required');
	if (!(await categoryExists(params.category))) error(404, 'categoria non trovata');
	try {
		await renameCategory(params.category, name);
	} catch (e) {
		error(409, e instanceof Error ? e.message : 'rename failed');
	}
	return json({ ok: true, name });
};

// delete the category, moving all its songs to `target`
export const DELETE: RequestHandler = async ({ params, request }) => {
	const { target } = await request.json();
	if (typeof target !== 'string' || !target) error(400, 'target is required');
	if (!(await categoryExists(params.category))) error(404, 'categoria non trovata');
	try {
		await deleteCategory(params.category, target);
	} catch (e) {
		error(409, e instanceof Error ? e.message : 'delete failed');
	}
	return json({ ok: true });
};

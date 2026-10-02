import { error } from '@sveltejs/kit';
import { listCategorySummaries, createCategory, setCategoryOrder } from '#lib/server/songs.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return Response.json({ categories: await listCategorySummaries() });
};

// persist the manual category order
export const PUT: RequestHandler = async ({ request }) => {
	const { order } = await request.json();
	if (!Array.isArray(order) || !order.every((c) => typeof c === 'string')) {
		error(400, 'order must be an array of category names');
	}
	await setCategoryOrder(order);
	return Response.json({ ok: true });
};

export const POST: RequestHandler = async ({ request }) => {
	const { name } = await request.json();
	if (typeof name !== 'string' || !name) error(400, 'name is required');
	try {
		await createCategory(name);
	} catch (e) {
		error(409, e instanceof Error ? e.message : 'create failed');
	}
	return Response.json({ ok: true, name }, { status: 201 });
};

// Suggestions go to the backend API (backend/), which turns them into GitHub
// issues without exposing any token in the browser. Copyright notices keep an
// email channel, so the mailto: builder stays alongside the API client.
export const FEEDBACK_EMAIL = 'canzoniere@alessandriascout.it';

export const API_BASE =
	import.meta.env.VITE_API_BASE ?? 'https://canzoniere-api-896377215116.europe-west1.run.app';

export function feedbackHref(subject: string, body?: string): string {
	const params = new URLSearchParams({ subject });
	if (body) params.set('body', body);
	// URLSearchParams encodes spaces as "+", which mail clients show literally;
	// mailto: wants percent-encoding.
	return `mailto:${FEEDBACK_EMAIL}?${params.toString().replace(/\+/g, '%20')}`;
}

export interface Suggestion {
	message: string;
	song?: string;
	name?: string;
}

/** Sends a suggestion to the backend and returns the created issue URL. */
export async function sendSuggestion(suggestion: Suggestion): Promise<string> {
	let res: Response;
	try {
		res = await fetch(`${API_BASE}/api/suggestions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(suggestion)
		});
	} catch {
		throw new Error('Impossibile raggiungere il servizio: controlla la connessione e riprova.');
	}
	if (!res.ok) {
		let detail = '';
		try {
			detail = (await res.json()).error ?? '';
		} catch {
			// non-JSON error body: keep the generic message
		}
		if (res.status === 429) {
			throw new Error('Troppi invii ravvicinati: aspetta un minuto e riprova.');
		}
		throw new Error(detail || `Invio non riuscito (HTTP ${res.status}).`);
	}
	return ((await res.json()) as { issueUrl: string }).issueUrl;
}

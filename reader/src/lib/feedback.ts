// Comments and suggestions arrive by email: the reader is a static app with
// no backend, so a mailto: link opens the user's mail client with recipient
// and subject already filled in.
export const FEEDBACK_EMAIL = 'canzoniere@alessandriascout.it';

export function feedbackHref(subject: string, body?: string): string {
	const params = new URLSearchParams({ subject });
	if (body) params.set('body', body);
	// URLSearchParams encodes spaces as "+", which mail clients show literally;
	// mailto: wants percent-encoding.
	return `mailto:${FEEDBACK_EMAIL}?${params.toString().replace(/\+/g, '%20')}`;
}

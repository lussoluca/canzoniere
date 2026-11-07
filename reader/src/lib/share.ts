// Sharing a link from the reader: the system share sheet when the device has
// one, the clipboard otherwise (or when the sheet is dismissed).

export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareLink(url: string, title: string): Promise<ShareOutcome> {
	if (navigator.share) {
		try {
			await navigator.share({ title, url });
			return 'shared';
		} catch {
			// user dismissed the share sheet: fall through to copy
		}
	}
	try {
		await navigator.clipboard.writeText(url);
		return 'copied';
	} catch {
		return 'failed';
	}
}

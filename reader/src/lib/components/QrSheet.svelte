<script lang="ts">
	import qrcode from 'qrcode-generator';

	// Bottom sheet with the QR code of a link. The QR is generated on the device
	// (no network), so a link can be passed around by pointing cameras at a
	// phone even where there is no signal.
	let {
		title,
		url,
		label,
		hint,
		onclose
	}: {
		title: string;
		url: string;
		label: string;
		hint: string;
		onclose: () => void;
	} = $props();

	const svg = $derived.by(() => {
		const qr = qrcode(0, 'M');
		qr.addData(url);
		qr.make();
		return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
	});
</script>

<div class="qr-sheet" role="dialog" aria-label={label}>
	<div class="qr-head">
		<span>{title}</span>
		<button class="close" onclick={onclose} aria-label="Chiudi il QR code">✕</button>
	</div>
	<div class="qr-box">{@html svg}</div>
	<p class="qr-hint">{hint}</p>
</div>

<style>
	/* Same look as the diagram/note sheets on the song page. */
	.qr-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		background: var(--surface);
		border-top: 1px solid var(--control-border);
		box-shadow: 0 -4px 16px var(--shadow);
		max-height: 80dvh;
		overflow-y: auto;
		padding: 0 calc(env(safe-area-inset-right) + var(--space-7)) calc(env(safe-area-inset-bottom) + var(--space-5))
			calc(env(safe-area-inset-left) + var(--space-7));
	}

	.qr-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		top: 0;
		background: var(--surface);
		padding: var(--space-4) 0 var(--space-2);
		font-weight: 600;
	}

	.close {
		font: inherit;
		font-size: var(--text-md);
		padding: var(--space-2) var(--space-5);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: inherit;
		cursor: pointer;
	}

	/* Always on white with quiet-zone padding, so cameras read it in dark mode too. */
	.qr-box {
		background: #fff;
		border-radius: var(--radius-lg);
		padding: var(--space-7);
		margin: var(--space-2) auto 0;
		width: min(70vw, 280px);
	}

	.qr-box :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	.qr-hint {
		margin: var(--space-4) 0 var(--space-1);
		font-size: var(--text-sm);
		color: var(--muted);
		text-align: center;
	}
</style>

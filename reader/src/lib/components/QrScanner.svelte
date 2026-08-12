<script lang="ts">
	// Full-screen QR scanner: the camera opens inside the app, so a shared set
	// is received without leaving the installed PWA (the system camera would
	// route the URL to the browser instead). Decoding is local and offline:
	// BarcodeDetector where available (Chrome/Android), bundled jsQR elsewhere
	// (iOS Safari has no BarcodeDetector).
	import { onMount } from 'svelte';
	import jsQR from 'jsqr';

	let {
		onresult,
		onclose
	}: {
		// return true to stop scanning, false to keep going (unrecognized QR)
		onresult: (text: string) => boolean;
		onclose: () => void;
	} = $props();

	// bound in the template, set before onMount runs
	let video = $state<HTMLVideoElement>()!;
	let error = $state('');
	let rejected = $state(false); // last QR was not a songbook link

	onMount(() => {
		let stream: MediaStream | null = null;
		let raf = 0;
		let stopped = false;
		let lastScan = 0;
		let rejectTimer: ReturnType<typeof setTimeout> | undefined;

		type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
		const BD = (window as { BarcodeDetector?: new (opts: { formats: string[] }) => Detector })
			.BarcodeDetector;
		const detector = BD ? new BD({ formats: ['qr_code'] }) : null;
		const canvas = document.createElement('canvas');

		function handle(text: string) {
			if (onresult(text)) {
				stopped = true;
				return;
			}
			rejected = true;
			clearTimeout(rejectTimer);
			rejectTimer = setTimeout(() => (rejected = false), 2500);
		}

		async function scan(now: number) {
			if (stopped) return;
			// ~5 scans per second are plenty and keep the phone cool
			if (now - lastScan > 200 && video.readyState >= video.HAVE_ENOUGH_DATA) {
				lastScan = now;
				if (detector) {
					try {
						const codes = await detector.detect(video);
						if (codes.length > 0) handle(codes[0].rawValue);
					} catch {
						// detector unsupported at runtime: nothing to do, jsQR
						// would need a page reload to take over; keep trying
					}
				} else {
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					const ctx = canvas.getContext('2d', { willReadFrequently: true });
					if (ctx && canvas.width > 0) {
						ctx.drawImage(video, 0, 0);
						const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
						const code = jsQR(img.data, img.width, img.height);
						if (code) handle(code.data);
					}
				}
			}
			if (!stopped) raf = requestAnimationFrame(scan);
		}

		(async () => {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' }
				});
				if (stopped) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				video.srcObject = stream;
				await video.play();
				raf = requestAnimationFrame(scan);
			} catch {
				error =
					'Fotocamera non disponibile. Controlla i permessi della fotocamera per questa app.';
			}
		})();

		return () => {
			stopped = true;
			cancelAnimationFrame(raf);
			clearTimeout(rejectTimer);
			stream?.getTracks().forEach((t) => t.stop());
		};
	});
</script>

<div class="scanner" role="dialog" aria-label="Inquadra un QR code">
	<div class="head">
		<span>Inquadra un QR</span>
		<button class="close" onclick={onclose} aria-label="Chiudi lo scanner">✕</button>
	</div>
	{#if error}
		<p class="msg">{error}</p>
	{:else}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={video} playsinline muted></video>
		<div class="frame" aria-hidden="true"></div>
		<p class="hint">
			{rejected
				? 'Questo QR non è una scaletta del canzoniere.'
				: 'Punta la fotocamera sul QR della scaletta.'}
		</p>
	{/if}
</div>

<style>
	.scanner {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: #000;
		display: flex;
		flex-direction: column;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: calc(env(safe-area-inset-top) + 12px) 16px 12px;
		color: #fff;
		font-weight: 600;
	}

	.close {
		font: inherit;
		font-size: 14px;
		padding: 6px 12px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		cursor: pointer;
	}

	video {
		flex: 1;
		width: 100%;
		min-height: 0;
		object-fit: cover;
	}

	/* Aiming frame over the live preview. */
	.frame {
		position: absolute;
		top: 50%;
		left: 50%;
		width: min(62vw, 300px);
		aspect-ratio: 1;
		transform: translate(-50%, -50%);
		border: 3px solid rgba(255, 255, 255, 0.85);
		border-radius: 18px;
		box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.35);
		pointer-events: none;
	}

	.msg,
	.hint {
		margin: 0;
		padding: 14px 20px calc(env(safe-area-inset-bottom) + 18px);
		color: #fff;
		text-align: center;
		font-size: 14px;
	}

	.msg {
		margin: auto;
	}
</style>

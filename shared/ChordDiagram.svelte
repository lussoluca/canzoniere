<script lang="ts">
	import { getChordDefinition } from './diagrams';

	interface Props {
		name: string;
		scale?: number;
	}

	let { name, scale = 2.4 }: Props = $props();

	// Geometry mirrors ChordPro's PDF renderer (ChordPro::Output::PDF::StringDiagram)
	// with the values from this project's final chordpro config, so the diagram is
	// the one that ends up in the generated PDF. All coordinates are in PDF points.
	const GW = 6; // pdf.diagrams.width: cell width
	const GH = 6; // pdf.diagrams.height: cell height
	const LW = 0.1 * GW; // pdf.diagrams.linewidth (fraction of width)
	const NUTWIDTH = 5; // pdf.diagrams.nutwidth (in linewidths)
	const NW = (NUTWIDTH - 1) * LW; // extra height of the top nut
	const VC = 4; // pdf.diagrams.vcells: frets shown
	const STRINGS = 6;
	const DOT = 0.8 * Math.min(GW, GH); // pdf.diagrams.dotsize (fraction of cell)
	const BAR = 0.8 * DOT; // pdf.diagrams.barwidth (fraction of dot)
	const W = GW * (STRINGS - 1); // grid width
	const NAME_SIZE = 8; // slightly smaller than the PDF's 10pt, easier on the panel
	const GRID_TOP = DOT + LW; // room for the open/muted markers above the nut
	const BASE_SIZE = GH / 0.85; // pdf.fonts.diagram_base: text font at small size
	const BASE_X = -0.444 * 0.85 * BASE_SIZE; // right-aligned, 0.85 × width of "x" in Times

	// fixed viewBox so every diagram in the column lines up
	const VB_X = -14;
	const VB_W = W + 14 + DOT / 2 + 1;
	const VB_H = GRID_TOP + NW + VC * GH + LW + 1;
	// the name is HTML centered on the column; nudge it over the grid's center
	const NAME_OFFSET = W / 2 - (VB_X + VB_W / 2);

	let def = $derived(getChordDefinition(name));

	// barre: the same finger on more than one fretted string
	interface Barre {
		fret: number;
		from: number;
		to: number;
	}
	let barres = $derived.by(() => {
		const out = new Map<string, Barre>();
		const d = def;
		if (!d?.fingers) return out;
		d.fingers.forEach((f, str) => {
			if (!(d.frets[str] > 0)) return;
			const key = String(f).toUpperCase();
			if (!/^[1-9A-Z]$/.test(key)) return;
			const b = out.get(key);
			if (b) b.to = str;
			else out.set(key, { fret: d.frets[str], from: str, to: str });
		});
		for (const [k, b] of out) if (b.from === b.to) out.delete(k);
		return out;
	});

	// a fretted string in the middle of a barre gets neither dot nor finger number
	function coveredByBarre(str: number): boolean {
		const d = def;
		if (!d?.fingers) return false;
		const b = barres.get(String(d.fingers[str]).toUpperCase());
		return b !== undefined && str !== b.from && str !== b.to;
	}

	function fingerLabel(str: number): string | null {
		const d = def;
		if (!d?.fingers || !(d.frets[str] > 0) || coveredByBarre(str)) return null;
		const f = String(d.fingers[str]).toUpperCase();
		return /^[1-9A-Z]$/.test(f) ? f : null;
	}
</script>

{#if def}
	<div class="diagram" data-testid="chord-diagram" data-chord={name}>
		<div
			class="name"
			style={`font-size: ${NAME_SIZE * scale}px; transform: translateX(${NAME_OFFSET * scale}px)`}
		>
			{name}
		</div>
		<svg
			width={VB_W * scale}
			height={VB_H * scale}
			viewBox={`${VB_X} 0 ${VB_W} ${VB_H}`}
			role="img"
			aria-label={`Diagramma dell'accordo ${name}`}
		>
			<g transform={`translate(0 ${GRID_TOP})`} stroke="var(--diagram-ink, #000)" fill="none">
			{#each Array(VC + 1) as _, i (i)}
				<line x1={-LW / 2} x2={W + LW / 2} y1={NW + i * GH} y2={NW + i * GH} stroke-width={LW} />
			{/each}
			{#each Array(STRINGS) as _, j (j)}
				<line x1={j * GW} x2={j * GW} y1={-LW / 2} y2={VC * GH + NW + LW / 2} stroke-width={LW} />
			{/each}
			{#if def.base <= 1}
				{#each Array(NUTWIDTH - 1) as _, i (i)}
					<line x1={-LW / 2} x2={W + LW / 2} y1={i * LW} y2={i * LW} stroke-width={LW} />
				{/each}
			{:else}
				<text class="base" x={BASE_X} y={NW + 0.85 * GH} text-anchor="end">{def.base}</text>
			{/if}
			{#each [...barres.values()] as b (`${b.from}-${b.to}`)}
				<line
					x1={b.from * GW}
					x2={b.to * GW}
					y1={NW + (b.fret - 0.5) * GH}
					y2={NW + (b.fret - 0.5) * GH}
					stroke-width={BAR}
				/>
			{/each}
			{#each def.frets as fret, sx (sx)}
				{@const x = sx * GW}
				{#if fret > 0 && fret <= VC && !coveredByBarre(sx)}
					<circle cx={x} cy={NW + (fret - 0.5) * GH} r={DOT / 2} fill="var(--diagram-ink, #000)" stroke="none" />
					{#if fingerLabel(sx)}
						<text
							class="finger"
							{x}
							y={NW + (fret - 0.5) * GH + DOT / 3}
							text-anchor="middle"
							stroke="none"
						>
							{fingerLabel(sx)}
						</text>
					{/if}
				{:else if fret < 0}
					<line
						x1={x - DOT / 3}
						y1={-(0.77 * DOT + LW)}
						x2={x + DOT / 3}
						y2={-(0.1 * GH + LW)}
						stroke-width={LW}
					/>
					<line
						x1={x + DOT / 3}
						y1={-(0.77 * DOT + LW)}
						x2={x - DOT / 3}
						y2={-(0.1 * GH + LW)}
						stroke-width={LW}
					/>
				{:else if fret === 0}
					<circle cx={x} cy={-(0.35 * GH + LW)} r={DOT / 3} stroke-width={LW} />
				{/if}
			{/each}
		</g>
		</svg>
	</div>
{:else}
	<div
		class="unknown"
		title="ChordPro non ha un diagramma per questo accordo: nel PDF non comparirà"
		data-testid="chord-diagram-unknown"
		data-chord={name}
	>
		<span class="unknown-name">{name}</span>
		<span class="unknown-hint">nessun diagramma</span>
	</div>
{/if}

<style>
	svg {
		display: block;
	}
	.diagram {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.name {
		font-family: Helvetica, Arial, sans-serif;
		font-style: italic;
		color: var(--diagram-ink, #000);
		line-height: 1.2; /* pdf.spacing.diagramchords */
		text-align: center;
		margin-top: 0.5rem;
	}
	.base {
		font-family: 'Times New Roman', Times, serif;
		font-size: 7.06px;
		fill: var(--diagram-ink, #000);
	}
	.finger {
		font-family: Helvetica, Arial, sans-serif;
		font-size: 4.8px;
		fill: var(--diagram-surface, #fff);
	}
	.unknown {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		padding: 0.4rem 0.6rem;
		border: 1px dashed var(--diagram-muted, #ccc);
		border-radius: 6px;
		color: var(--diagram-muted, #999);
	}
	.unknown-name {
		font-family: Helvetica, Arial, sans-serif;
		font-style: italic;
		color: var(--diagram-ink, #555);
	}
	.unknown-hint {
		font-size: 0.68rem;
	}
</style>

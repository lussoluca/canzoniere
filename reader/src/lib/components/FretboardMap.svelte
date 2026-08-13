<script lang="ts">
	import { noteAt, STRING_NAMES } from '$lib/harmony';

	interface Props {
		/** Fret to mark on each string, from the 6ª to the 1ª: -1 mutes the string. */
		highlight?: number[];
		/** How many frets to show after the open string. */
		frets?: number;
	}

	let { highlight, frets = 4 }: Props = $props();

	const columns = $derived(Array.from({ length: frets + 1 }, (_, f) => f));
	// same order as the diagrams: the 6ª first, the 1ª last
	const rows = [0, 1, 2, 3, 4, 5];
</script>

<div class="scroller">
	<table>
		<thead>
			<tr>
				<th scope="col" class="corner">corda</th>
				{#each columns as f (f)}
					<th scope="col">{f === 0 ? 'vuoto' : `${f}º`}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as s (s)}
				<tr class:muted={highlight?.[s] === -1}>
					<th scope="row">
						<span class="num">{6 - s}ª</span>
						<span class="who">{STRING_NAMES[s]}</span>
					</th>
					{#each columns as f (f)}
						<td class:on={highlight?.[s] === f}>{noteAt(s, f)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroller {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin-bottom: 12px;
	}

	table {
		border-collapse: collapse;
		font-size: 13px;
		width: 100%;
		min-width: 300px;
		max-width: 520px;
	}

	th,
	td {
		border: 1px solid var(--border);
		padding: 5px 4px;
		text-align: center;
		white-space: nowrap;
	}

	thead th {
		font-size: 11px;
		font-weight: 600;
		color: var(--muted);
		border: none;
		padding-bottom: 3px;
	}

	tbody th {
		text-align: left;
		font-weight: 600;
		border-left: none;
	}

	.corner {
		text-align: left;
	}

	.num {
		margin-right: 4px;
	}

	.who {
		font-weight: 400;
		color: var(--muted);
	}

	td.on {
		background: var(--active-bg);
		color: var(--active-text);
		font-weight: 700;
	}

	tr.muted th,
	tr.muted td {
		color: var(--faint);
	}

	tr.muted th::after {
		content: ' ✕';
		color: var(--faint);
	}
</style>

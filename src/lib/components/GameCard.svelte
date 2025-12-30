<script lang="ts">
	export let saying: any;
	export let mode: string;
	export let revealed: boolean = false;

	// Determine which English parts to show
	$: en_p1 =
		mode === 'literal'
			? saying.en_literal_translation_p1
			: mode === 'correct'
				? saying.en_closest_real_corresponding_saying_p1
				: saying.en_literal_translation_p1;
	$: en_p2 =
		mode === 'literal'
			? saying.en_literal_translation_p2
			: mode === 'correct'
				? saying.en_closest_real_corresponding_saying_p2
				: saying.en_literal_translation_p2;

	// Determine which parts to reveal
	$: showEnglish = mode === 'en_to_lu';

	$: luWords = saying.lu_part2.split(' ');
	$: enWords = en_p2.split(' ');
	import { slide, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// Custom transition for word reveal with deblur effect
	function wordReveal(node: HTMLElement, { delay = 0, duration = 800 }) {
		return {
			delay,
			duration,
			easing: cubicOut,
			css: (t: number, u: number) => `
				opacity: ${t};
				filter: blur(${u * 20}px);
				transform: translateY(${u * 12}px);
			`
		};
	}
</script>

<div class="card">
	<div class="content">
		{#if showEnglish}
			<div class="text-block en">
				<span class="part1">{en_p1}</span>
				{#if revealed}
					<div class="part2" transition:slide={{ duration: 500, easing: cubicOut }}>
						{#each enWords as word, i}
							<span class="word" in:wordReveal={{ delay: 550 + i * 80, duration: 700 }}>
								{word}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			{#if revealed}
				<div class="divider"></div>

				<div class="text-block lu">
					<span class="part1">{saying.lu_part1}</span>
					{#if revealed}
						<div class="part2" transition:slide={{ duration: 500, easing: cubicOut }}>
							{#each luWords as word, i}
								<span class="word" in:wordReveal={{ delay: 550 + i * 80, duration: 700 }}>
									{word}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{:else}
			<div class="text-block lu">
				<span class="part1">{saying.lu_part1}</span>
				{#if revealed}
					<div class="part2" transition:slide={{ duration: 500, easing: cubicOut }}>
						{#each luWords as word, i}
							<span class="word" in:wordReveal={{ delay: 550 + i * 80, duration: 700 }}>
								{word}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			{#if mode !== 'lu'}
				<div class="divider"></div>

				<div class="text-block en">
					<span class="part1">{en_p1}</span>
					{#if revealed}
						<div class="part2" transition:slide={{ duration: 500, easing: cubicOut }}>
							{#each enWords as word, i}
								<span
									class="word"
									in:wordReveal={{
										delay: 550 + luWords.length * 80 + i * 80,
										duration: 700
									}}
								>
									{word}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.card {
		width: 60svw;
		max-width: 500px;
		height: 60svh;
		background: var(--bg-card);
		border-radius: 2rem;
		box-shadow: var(--shadow-card);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.content {
		text-align: center;
		width: 100%;
	}
	.text-block.lu {
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--text-main);
	}
	.text-block.en {
		font-size: 1.2rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.part1 {
		display: block;
		margin-bottom: 0.5rem;
	}
	.lu .part1 {
		color: var(--text-blue);
	}

	.divider {
		height: 2px;
		width: 40px;
		background: var(--border-color);
		margin: 2rem auto;
	}
	.word {
		display: inline-block;
		margin-right: 0.35rem;
	}

	.word-hidden {
		opacity: 0;
		filter: blur(16px);
		transform: translateY(8px);
	}

	.player-scores-container {
		position: absolute;
		bottom: -60px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
	}

	.player-scores {
		display: flex;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
		max-width: 85svw;
	}

	.score-button {
		padding: 0.75rem 1.5rem;
		border: 2px solid var(--border-color);
		border-radius: 100px;
		background: var(--bg-card);
		color: var(--text-main);
		cursor: pointer;
		font-size: 1.1rem;
		transition: all 0.3s ease;
		font-weight: 600;
		margin: 0.5rem;
	}

	.score-button.active {
		background: var(--color-red);
		color: var(--text-on-primary);
		border-color: var(--color-red);
		box-shadow: var(--color-red-glow);
	}
</style>

<script>
	export let saying;
	export let mode;
	export let revealed = false;

	$: words = saying.lu_part2.split(' ');
</script>

<div class="card">
	<div class="content">
		<div class="lu-text">
			<span class="part1">{saying.lu_part1}</span>
			<div class="part2">
				{#each words as word, i}
					<span 
						class="word" 
						class:revealed 
						style="transition-delay: {revealed ? i * 150 : 0}ms"
					>
						{word}
					</span>
				{/each}
			</div>
		</div>

		{#if mode !== 'lu'}
			<hr />
			<div class="en-text">
				{mode === 'literal' ? saying.en_literal : saying.en_correct}
			</div>
		{/if}
	</div>
</div>

<style>
	.card {
		width: 90%;
		max-width: 400px;
		height: 350px;
		background: white;
		border-radius: 24px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 30px;
		text-align: center;
	}

	.lu-text { font-size: 1.5rem; font-weight: 600; line-height: 1.4; color: #333; }
	.en-text { font-size: 1.1rem; color: #666; font-style: italic; }
	
	hr { width: 40%; margin: 25px auto; border: 0; border-top: 2px solid #eee; }

	.word {
		display: inline-block;
		opacity: 0;
		filter: blur(8px);
		transform: translateY(4px);
		transition: opacity 0.6s ease-out, filter 0.6s ease-out, transform 0.6s ease-out;
		margin-right: 0.2em;
	}

	.word.revealed {
		opacity: 1;
		filter: blur(0px);
		transform: translateY(0);
	}

	.part1 { display: block; margin-bottom: 5px; color: #00A3E0; }
</style>
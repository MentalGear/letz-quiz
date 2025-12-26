<script>
	import sayingsData from '$lib/dataset.json';
	import GameCard from '$lib/components/GameCard.svelte';

	let state = 'settings'; // 'settings' | 'playing'
	let rounds = 5;
	let mode = 'lu'; // 'lu', 'literal', 'correct'
	let gameSet = [];
	let container;
	let currentIndex = 0;

	function startGame() {
		gameSet = [...sayingsData]
			.sort(() => 0.5 - Math.random())
			.slice(0, rounds)
			.map(s => ({ ...s, isRevealed: false }));
		state = 'playing';
	}

	function handleScroll() {
		if (container) {
			currentIndex = Math.round(container.scrollLeft / container.clientWidth);
		}
	}
</script>

<div class="app-container">
	{#if state === 'settings'}
		<section class="screen settings">
			<h1>🇱🇺 Spreechwierder Quiz</h1>
			<div class="field">
				<label>Rounds</label>
				<input type="number" bind:value={rounds} min="1" max={sayingsData.length} />
			</div>
			<div class="field">
				<label>Mode</label>
				<select bind:value={mode}>
					<option value="lu">Luxembourgish Only</option>
					<option value="literal">LU + English Literal</option>
					<option value="correct">LU + English Equivalent</option>
				</select>
			</div>
			<button class="primary-btn" on:click={startGame}>Start Game</button>
		</section>
	{:else}
		<section class="screen game">
			<header>
				<button class="text-btn" on:click={() => state = 'settings'}>← Back</button>
				<span class="progress">{currentIndex + 1} / {gameSet.length}</span>
			</header>

			<div class="scroll-container" bind:this={container} on:scroll={handleScroll}>
				{#each gameSet as saying, i}
					<div class="snap-item">
						<GameCard {saying} {mode} revealed={gameSet[i].isRevealed} />
					</div>
				{/each}
			</div>

			<div class="controls">
				<button 
					class="primary-btn" 
					on:click={() => gameSet[currentIndex].isRevealed = true}
					disabled={gameSet[currentIndex].isRevealed}
				>
					{gameSet[currentIndex].isRevealed ? 'Revealed' : 'Reveal Solution'}
				</button>
			</div>
		</section>
	{/if}
</div>

<style>
	.app-container { height: 100vh; font-family: sans-serif; background: #f0f4f8; }
	.screen { display: flex; flex-direction: column; height: 100%; padding: 20px; box-sizing: border-box; }
	.settings { justify-content: center; align-items: center; text-align: center; }
	
	.scroll-container {
		flex: 1;
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}
	.scroll-container::-webkit-scrollbar { display: none; }
	.snap-item { flex: 0 0 100%; scroll-snap-align: center; display: flex; align-items: center; justify-content: center; }

	.field { margin: 15px 0; width: 100%; max-width: 300px; text-align: left; }
	input, select { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem; }
	
	.primary-btn { 
		background: #00A3E0; color: white; border: none; padding: 15px 40px; 
		border-radius: 30px; font-weight: bold; cursor: pointer; font-size: 1.1rem;
	}
	.primary-btn:disabled { background: #ccc; }
	
	header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; }
	.text-btn { background: none; border: none; color: #00A3E0; cursor: pointer; }
	.controls { display: flex; justify-content: center; padding: 20px; }
</style>
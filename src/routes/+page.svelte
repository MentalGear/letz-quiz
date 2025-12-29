<script lang="ts">
	import sayingsData from '$lib/dataset.json';
	import { fade, scale } from 'svelte/transition';
	import GameCard from '$lib/components/GameCard.svelte';
	import {
		themeMode,
		initializeTheme,
		playerCount,
		playerScores,
		currentCardScores,
		initializePlayerScores,
		resetPlayerScores,
		explicitness,
		initializeExplicitness
	} from '$lib/stores';

	type QuizState = 'settings' | 'playing' | 'finished';
	let state = $state<QuizState>('settings');
	let rounds = $state(15);
	let mode = $state('lu');
	let gameSet = $state<any[]>([]);
	let container: HTMLElement | undefined = $state();
	let currentIndex = $state(0);
	let showConfirm = $state(false);
	let showOverlay = $state(false);
	let popularityMin = $state(1);
	let popularityMax = $state(5);
	let difficulty = $state('medium');
	import PlayerModal from '$lib/components/PlayerModal.svelte';

	let playerModal: any = $state();
	let players = $state<string[]>([]);

	// Initialize theme and player scores
	initializeTheme();
	initializePlayerScores();
	initializeExplicitness();

	function startGame() {
		gameSet = [...sayingsData]
			.filter((s) => s.vulgarity <= $explicitness)
			.sort(() => 0.5 - Math.random())
			.slice(0, rounds)
			.map((s) => ({ ...s, isRevealed: false }));
		currentIndex = 0;
		state = 'playing';
	}

	function handleScroll() {
		if (container) {
			const newIndex = Math.round(container.scrollLeft / container.clientWidth);
			// Only allow scrolling forward if the current card has been answered
			if (newIndex > currentIndex && !gameSet[currentIndex].isRevealed) {
				container.scrollTo({
					left: currentIndex * container.clientWidth,
					behavior: 'smooth'
				});
			} else {
				currentIndex = newIndex;
			}
		}
	}

	function handleAction() {
		if (!gameSet[currentIndex].isRevealed) {
			gameSet[currentIndex].isRevealed = true;
		} else if (currentIndex < gameSet.length - 1) {
			// Scroll to next card
			currentIndex++;
			if (container) {
				container.scrollTo({
					left: currentIndex * container.clientWidth,
					behavior: 'smooth'
				});
			}
		} else {
			state = 'finished';
		}
	}

	function closeGame() {
		if (
			state === 'playing' &&
			currentIndex < gameSet.length - 1 &&
			!gameSet[currentIndex].isRevealed
		) {
			showConfirm = true;
		} else {
			state = 'settings';
		}
	}

	function confirmClose() {
		state = 'settings';
		showConfirm = false;
	}

	function cancelClose() {
		showConfirm = false;
	}

	function setTheme(newMode: string) {
		themeMode.set(newMode);
	}

	function toggleOverlay() {
		showOverlay = !showOverlay;
	}

	function reportIssue() {
		const subject = encodeURIComponent('Lux Quiz Issue Report');
		const body = encodeURIComponent('Please describe the issue you encountered...');
		window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
	}

	function quitGame() {
		showOverlay = false;
		closeGame();
	}

	// Calculate progress for the top bar
	const progress = $derived(gameSet.length > 0 ? ((currentIndex + 1) / gameSet.length) * 100 : 0);
	const currentScores = $derived($currentCardScores as Record<number, Record<string, boolean>>);
	const actionType = $derived(
		gameSet[currentIndex]
			? gameSet[currentIndex].isRevealed
				? currentIndex < gameSet.length - 1
					? 'next'
					: 'finish'
				: 'reveal'
			: 'reveal'
	);
</script>

<main>
	{#if state === 'settings'}
		<div class="screen settings">
			<h1 style="margin-bottom: 0; letter-spacing: 1px; color: #00a3e0; text-transform: uppercase;">
				Lëtz Quiz
			</h1>
			<h1
				style="font-size: 2.5rem; margin-top: 0;  letter-spacing: 1px; font-weight: medium; opacity: 0.8; margin-bottom: 50px; color: #ef3340; "
			>
				Spréchwierder
			</h1>

			<div class="control">
				<label>Number of Cards</label>
				<select bind:value={rounds}>
					{#each [5, 10, 15, 20, 25] as num}
						<option value={num}>{num} Cards</option>
					{/each}
				</select>
			</div>

			<div class="control">
				<label>Mode</label>
				<select bind:value={mode}>
					<option value="lu">Luxembourgish Only</option>
					<option value="literal">LU + English Literal</option>
					<option value="correct">LU + English Equivalent</option>
					<!-- <option value="en_to_lu">English to Luxembourgish</option> -->
				</select>
			</div>

			<div class="control">
				<label>Difficulty Range</label>
				<div class="range-container">
					<select
						bind:value={popularityMin}
						on:change={() => {
							if (popularityMin > popularityMax) popularityMax = popularityMin;
						}}
					>
						{#each Array.from({ length: 5 }, (_, i) => i + 1) as num}
							<option value={num}>{num}</option>
						{/each}
					</select>
					<select
						bind:value={popularityMax}
						on:change={() => {
							if (popularityMax < popularityMin) popularityMin = popularityMax;
						}}
					>
						{#each Array.from({ length: 5 }, (_, i) => i + 1) as num}
							<option value={num}>{num}</option>
						{/each}
					</select>
				</div>
				<!-- <span>Min: {popularityMin}, Max: {popularityMax}</span> -->
			</div>

			<!-- <div class="control">
                <label>Difficulty</label>
                <select bind:value={difficulty}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div> -->

			<button
				class="btn-primary"
				on:click={() => {
					const savedPlayers = localStorage.getItem('players');
					players = savedPlayers
						? (JSON.parse(savedPlayers) as string[]).filter(
								(player: string) => player.trim().length > 0
							)
						: [];
					resetPlayerScores();
					startGame();
				}}>Start Game</button
			>

			<!-- Deactivate Scores per Player for now -->
			<!-- <divider class="divider"> – or – </divider>
			<button class="btn-secondary" on:click={() => playerModal.openModal()}
				>Players ({$playerCount})</button
			> -->

			<!-- <PlayerModal bind:this={playerModal} /> -->

			<div class="control" style="display: flex; gap: 10px; margin-top: 50px; opacity: 0.5">
				<div class="control">
					<!-- <label>Allow Explicitness (Max: {$explicitness})</label> -->
					<!-- // make a switch/checkbox -->
					<label>Allow Explicitness</label>
					<div style="display: flex; gap: 10px">
						<input
							type="checkbox"
							id="explicitnessControl"
							checked={$explicitness > 3}
							on:change={() => explicitness.set($explicitness > 3 ? 3 : 5)}
						/>
						<label for="explicitnessControl">On</label>
					</div>
					<!-- <select bind:value={$explicitness}>
						{#each [1, 2, 3, 4, 5] as num}
							<option value={num}
								>{num} {num === 1 ? '(Clean)' : num === 5 ? '(Explicit)' : ''}</option
							>
						{/each}
					</select> -->
				</div>

				<div class="control">
					<label>Theme</label>
					<select bind:value={$themeMode} on:change={() => setTheme($themeMode)}>
						<option value="light">Light Mode</option>
						<option value="dark">Dark Mode</option>
						<option value="device">Device Settings</option>
					</select>
				</div>
			</div>
		</div>
	{:else if state === 'playing'}
		<div class="screen game">
			<div class="progress-bar-container">
				<div class="progress-bar" style="width: {progress}%" />
			</div>

			<button class="menu-btn floating" on:click={toggleOverlay}>
				<span class="menu-icon">☰</span>
			</button>

			{#if showOverlay}
				<div class="menu-overlay" on:click|self={toggleOverlay} transition:fade={{ duration: 200 }}>
					<div class="menu-content" transition:scale={{ duration: 300, start: 0.95, opacity: 0 }}>
						<h2 class="menu-title">Menu</h2>
						<div class="menu-items">
							<button class="menu-item" on:click={toggleOverlay}>
								<!-- <span class="icon">▶</span> -->
								Resume
							</button>
							<div class="menu-item mode-item">
								<!-- <span class="icon">🇱🇺</span> -->
								<select class="overlay-mode-select" bind:value={mode}>
									<option value="lu">Luxembourgish Only</option>
									<option value="literal">LU + English Literal</option>
									<option value="correct">LU + English Equivalent</option>
								</select>
							</div>
							<button class="menu-item" on:click={reportIssue}>
								<!-- <span class="icon">⚠️</span> -->
								Report Issue
							</button>
							<button class="menu-item quit" on:click={quitGame}>
								<span class="icon">✕</span> Quit Game
							</button>
						</div>
					</div>
				</div>
			{/if}

			<div class="scroll-wrapper" bind:this={container} on:scroll={handleScroll}>
				{#each gameSet as saying, i}
					<div class="snap-point">
						<GameCard {saying} {mode} revealed={saying.isRevealed} />
						{#if saying.isRevealed && players.length > 0}
							<div class="player-scores-container">
								<div class="player-scores">
									{#each players as player, index}
										<button
											class="score-button {currentScores[currentIndex] &&
											currentScores[currentIndex][player]
												? 'active'
												: ''}"
											on:click={() => {
												if (currentScores[currentIndex] && currentScores[currentIndex][player]) {
													currentCardScores.update((scores) => {
														delete (scores as Record<number, Record<string, boolean>>)[
															currentIndex
														][player];
														return scores;
													});
												} else {
													currentCardScores.update((scores) => {
														const typedScores = scores as Record<number, Record<string, boolean>>;
														if (!typedScores[currentIndex]) typedScores[currentIndex] = {};
														typedScores[currentIndex][player] = true;
														return scores;
													});
												}
											}}
										>
											{player} ({Object.keys(currentScores[currentIndex] || {}).length})
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="actions-container">
				{#each [actionType] as type (type)}
					<div
						class="button-transition-wrapper"
						transition:fade={{ duration: 250 }}
						style="grid-area: 1 / 1;"
					>
						{#if type === 'next'}
							<button class="btn-action floating-next" on:click={handleAction}>Next →</button>
						{:else if type === 'finish'}
							<button class="btn-action floating-next" on:click={handleAction}>Finish</button>
						{:else}
							<button class="btn-action floating-reveal" on:click={handleAction}>Reveal</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else if state === 'finished'}
		<div class="screen finished" in:fade>
			<div class="finished-content">
				<h1 class="finished-title">Game Finished!</h1>
				<p class="finished-stats">You've completed all {rounds} cards.</p>
				<div class="finished-actions">
					<button
						class="btn-primary"
						on:click={() => {
							resetPlayerScores();
							startGame();
						}}>Play Again</button
					>
					<button class="btn-secondary" on:click={() => (state = 'settings')}
						>Back to Settings</button
					>
				</div>
			</div>
		</div>
	{/if}
	{#if showConfirm}
		<div class="confirm-overlay">
			<div class="confirm-dialog">
				<p>Are you sure you want to quit? Your progress will be lost.</p>
				<div class="confirm-buttons">
					<button class="btn-cancel" on:click={cancelClose}>Cancel</button>
					<button class="btn-confirm" on:click={confirmClose}>Quit</button>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f8f9fa;
		font-family: 'Segoe UI', system-ui, sans-serif;
		overflow: hidden;
		transition: background 0.3s ease;
	}

	:global(body.dark-mode) {
		background: #2d3436;
	}
	:global(body.light-mode) {
		background: #f8f9fa;
	}

	main {
		height: 100svh;
		width: 100svw;
		display: flex;
		flex-direction: column;
	}

	.divider {
		opacity: 0.8;
		font-size: 1.2em;
		font-style: bold;
		margin-top: 25px;
	}

	.screen {
		height: 100svh;
		display: flex;
		flex-direction: column;
		/* padding: 2rem; */
		/* max-width: 700px; */
		box-sizing: border-box;
		position: relative;
	}
	.settings {
		justify-content: center;
		align-items: center;
		max-width: 400px;
		margin: 0 auto;
	}

	.control {
		width: 100%;
		margin-bottom: 2rem;
	}
	label {
		font-weight: 700;
		color: #444;
		display: block;
		margin-bottom: 0.5rem;
	}
	select {
		width: 100%;
		padding: 1rem;
		border-radius: 1rem;
		border: 2px solid #ddd;
		background: white;
		font-size: 1rem;
	}
	.range-container {
		display: flex;
		gap: 1rem;
	}
	.range-container select {
		width: 50%;
	}

	/* h1 {
		font-weight: medium;
		text-transform: uppercase;
	} */

	:global(body.dark-mode) h1 {
		color: #f8f9fa;
	}

	:global(body.dark-mode) h1 {
		color: #f8f9fa;
	}

	:global(body.dark-mode) label {
		color: #f8f9fa;
	}

	:global(body.dark-mode) span {
		color: #f8f9fa;
	}

	:global(body.dark-mode) select {
		background: #3d4448;
		color: #f8f9fa;
		border-color: #666;
	}

	:global(body.dark-mode) option {
		background: #3d4448;
		color: #f8f9fa;
	}

	.progress-bar-container {
		width: 100%;
		height: 10px;
		background-color: #eeeeee05;
		position: fixed;
		bottom: 0;
		/* border-radius: 5px; */
		/* margin-bottom: 1rem; */
	}

	.progress-bar {
		height: 100%;
		background-color: #00a3e0;
		/* border-radius: 5px; */
		transition: width 0.3s ease-in;
	}

	.scroll-wrapper {
		flex: 1;
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}
	.scroll-wrapper::-webkit-scrollbar {
		display: none;
	}
	.snap-point {
		flex: 0 0 100svw;
		scroll-snap-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.menu-btn.floating {
		position: absolute;
		top: 1rem;
		left: 1rem;
		background: rgba(238, 238, 238, 0.8);
		backdrop-filter: blur(10px);
		border: none;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #666;
		z-index: 100;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
	}

	.menu-btn.floating:active {
		transform: scale(0.95);
	}

	.menu-icon {
		font-size: 1.5rem;
		line-height: 1;
		margin-bottom: 4px;
		opacity: 0.5;
	}

	:global(body.dark-mode) .menu-btn.floating {
		background: rgba(68, 68, 68, 0.8);
		color: #f8f9fa;
	}

	.menu-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(15px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		/* animation: fadeIn 0.3s ease-out; */ /* Removed as Svelte transition will handle this */
	}

	/* @keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	} */

	.menu-content {
		background: white;
		width: 90%;
		max-width: 320px;
		border-radius: 2rem;
		padding: 2rem;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
		/* transform: translateY(0); */ /* Removed as Svelte transition will handle this */
		/* animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); */ /* Removed as Svelte transition will handle this */
	}

	:global(body.dark-mode) .menu-content {
		background: #2d3436;
		color: #f8f9fa;
	}

	/* @keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	} */

	.menu-title {
		margin-top: 0;
		text-align: center;
		color: #00a3e0;
		text-transform: uppercase;
		letter-spacing: 2px;
		font-size: 1.2rem;
		margin-bottom: 2rem;
	}

	.menu-items {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.menu-item {
		background: #f1f3f5;
		border: none;
		padding: 1.25rem;
		border-radius: 1rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: #444;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
	}

	:global(body.dark-mode) .menu-item {
		background: #3d4448;
		color: #f8f9fa;
	}

	.menu-item:hover {
		background: #e9ecef;
	}

	:global(body.dark-mode) .menu-item:hover {
		background: #4a5459;
	}

	.menu-item:active {
		transform: scale(0.98);
	}

	.menu-item.quit {
		color: #ef3340;
		margin-top: 1rem;
	}

	.menu-item.mode-item {
		padding: 0;
		overflow: hidden;
		position: relative;
	}

	.menu-item.mode-item .icon {
		position: absolute;
		/* left: 1.25rem; */
		pointer-events: none;
	}

	.overlay-mode-select {
		width: 100%;
		height: 100%;
		/* padding: 1.25rem 1.25rem 1.25rem 3.5rem; */
		padding-left: 1.25rem;
		background: transparent;
		border: none;
		font-size: 1.2rem;
		font-weight: 600;
		color: inherit;
		cursor: pointer;
		appearance: none;
	}

	.menu-item .icon {
		font-size: 1.2rem;
		width: 24px;
		text-align: center;
	}

	.theme-menu {
		position: absolute;
		bottom: 7rem;
		left: 2rem;
		background: white;
		border-radius: 1rem;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
		padding: 1rem;
		z-index: 101;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 200px;
	}

	.theme-menu button {
		background: none;
		border: none;
		padding: 1rem 1.5rem;
		cursor: pointer;
		border-radius: 0.5rem;
		font-size: 1rem;
		text-align: left;
	}

	.theme-menu button:hover {
		background: #f0f0f0;
	}

	.actions-container {
		position: fixed;
		bottom: 3svh;
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		place-items: center;
		z-index: 100;
	}

	.btn-action.floating-reveal {
		grid-area: 1 / 1;
		background: #00a3e0;
		color: white;
		border: none;
		padding: 1rem 0;
		width: 180px;
		text-align: center;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 4px 15px rgba(0, 163, 224, 0.3);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}

	.btn-action.floating-next {
		grid-area: 1 / 1;
		background: #ef3340;
		color: white;
		border: none;
		padding: 1rem 0;
		width: 180px;
		text-align: center;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 4px 15px rgba(239, 51, 64, 0.3);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}

	.btn-action:active {
		transform: scale(0.95);
	}

	.confirm-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}

	.confirm-dialog {
		background: white;
		padding: 2rem;
		border-radius: 1rem;
		text-align: center;
		max-width: 400px;
	}

	:global(body.dark-mode) .confirm-dialog {
		background: #3d4448;
		color: #f8f9fa;
	}

	.confirm-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.btn-cancel {
		background: #ccc;
		color: white;
		border: none;
		padding: 1rem 2rem;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
	}

	.finished {
		justify-content: center;
		align-items: center;
		background: white;
		text-align: center;
	}

	:global(body.dark-mode) .finished {
		background: #2d3436;
		color: #f8f9fa;
	}

	.finished-content {
		max-width: 400px;
		width: 90%;
		padding: 2rem;
	}

	.finished-title {
		font-size: 3rem;
		color: #00a3e0;
		margin-bottom: 1rem;
	}

	.finished-stats {
		font-size: 1.2rem;
		opacity: 0.8;
		margin-bottom: 3rem;
	}

	.finished-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.btn-confirm {
		background: #ef3340;
		color: white;
		border: none;
		padding: 1rem 2rem;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
	}

	.btn-primary {
		background: #ef3340;
		color: white;
		border: none;
		padding: 1.5rem 3rem;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
		width: 100%;
	}

	.btn-secondary {
		background: transparent;
		color: #666;
		border: 2px solid #ddd;
		padding: 0.75rem 1.5rem;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1rem;
		cursor: pointer;
		width: 100%;
		margin-top: 1rem;
	}

	:global(body.dark-mode) .btn-secondary {
		color: #f8f9fa;
		border-color: #666;
	}
</style>

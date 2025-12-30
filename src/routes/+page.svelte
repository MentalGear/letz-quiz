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
		initializeExplicitness,
		difficultyMin,
		difficultyMax
	} from '$lib/stores';

	type QuizState = 'settings' | 'playing' | 'finished';
	let state = $state<QuizState>('settings');
	let rounds = $state(10);
	let mode = $state('lu');
	let gameSet = $state<any[]>([]);
	let container: HTMLElement | undefined = $state();
	let currentIndex = $state(0);
	let showConfirm = $state(false);
	let showOverlay = $state(false);
	let difficulty = $state('medium');
	import PlayerModal from '$lib/components/PlayerModal.svelte';

	let playerModal: any = $state();
	let players = $state<string[]>([]);

	// Initialize theme and player scores
	initializeTheme();
	initializePlayerScores();
	initializeExplicitness();

	function startGame() {
		const scoreMap: Record<number, { min: number; max: number }> = {
			1: { min: 1.0, max: 1.5 },
			2: { min: 2.0, max: 2.0 },
			3: { min: 2.5, max: 2.5 },
			4: { min: 3.0, max: 3.0 },
			5: { min: 3.5, max: 4.0 }
		};

		const minScore = scoreMap[$difficultyMin].min;
		const maxScore = scoreMap[$difficultyMax].max;

		const filtered = [...sayingsData].filter((s) => {
			const score = (6 - s.culturalPopularity + s.wordsDifficulty) / 2;
			return s.vulgarity <= $explicitness && score >= minScore && score <= maxScore;
		});

		console.log(
			`Starting game with ${filtered.length} matching cards. Level Range: [${$difficultyMin}, ${$difficultyMax}] (Score: ${minScore}-${maxScore})`
		);

		gameSet = filtered
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
		const currentCard = gameSet[currentIndex];
		let cardDetails = '';

		if (currentCard) {
			cardDetails = `\n\n---\nCard Info:\n`;
			cardDetails += `LU: ${currentCard.lu_part1} ${currentCard.lu_part2}\n`;
			cardDetails += `Literal: ${currentCard.en_literal_translation_p1} ${currentCard.en_literal_translation_p2}\n`;
			if (currentCard.en_closest_real_corresponding_saying_p1) {
				cardDetails += `Equivalent: ${currentCard.en_closest_real_corresponding_saying_p1} ${currentCard.en_closest_real_corresponding_saying_p2}\n`;
			}
		}

		const subject = encodeURIComponent('Lux Quiz Issue Report');
		const body = encodeURIComponent('Please describe the issue you encountered...' + cardDetails);
		window.location.href = `mailto:gen_letzquiz@tomfaber.id?subject=${subject}&body=${body}`;
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
			<h1
				style="margin-bottom: 0; letter-spacing: 1px; color: var(--text-blue); text-transform: uppercase;"
			>
				Lëtz Quiz
			</h1>
			<h1
				style="font-size: 2.5rem; margin-top: 0;  letter-spacing: 1px; font-weight: medium; opacity: 0.8; margin-bottom: 50px; color: var(--text-red); "
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
				<label>Difficulty Level</label>
				<div class="range-container">
					<select
						bind:value={$difficultyMin}
						on:change={() => {
							if ($difficultyMin > $difficultyMax) $difficultyMax = $difficultyMin;
						}}
					>
						{#each Array.from({ length: 5 }, (_, i) => i + 1) as num}
							<option value={num}>{num}</option>
						{/each}
					</select>
					<select
						bind:value={$difficultyMax}
						on:change={() => {
							if ($difficultyMax < $difficultyMin) $difficultyMin = $difficultyMax;
						}}
					>
						{#each Array.from({ length: 5 }, (_, i) => i + 1) as num}
							<option value={num}>{num}</option>
						{/each}
					</select>
				</div>
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
							checked={$explicitness > 1}
							on:change={() => explicitness.set($explicitness > 1 ? 1 : 5)}
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
								<select class="overlay-mode-select" bind:value={mode} on:change={toggleOverlay}>
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
								<!-- <span class="icon">✕</span> -->
								Quit Game
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
				<!-- <p class="finished-stats">You've completed all {rounds} cards.</p> -->
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
	main {
		height: 100svh;
		width: 100svw;
		display: flex;
		flex-direction: column;
		color: var(--text-main);
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
		color: var(--text-main);
		display: block;
		margin-bottom: 0.5rem;
	}
	select {
		width: 100%;
		padding: 1rem;
		border-radius: 1rem;
		border: 2px solid var(--border-color);
		background: var(--bg-card);
		color: var(--text-main);
		font-size: 1rem;
		font-weight: bold;
	}
	select:focus {
		outline: none;
		border-color: var(--color-blue);
	}
	option {
		background: var(--bg-card);
		color: var(--text-main);
	}
	.range-container {
		display: flex;
		gap: 1rem;
	}
	.range-container select {
		width: 50%;
	}

	.progress-bar-container {
		width: 100%;
		height: 10px;
		background-color: var(--progress-bg);
		position: fixed;
		bottom: 0;
	}

	.progress-bar {
		height: 100%;
		background-color: var(--color-blue);
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
		background: var(--bg-menu);
		backdrop-filter: blur(10px);
		border: none;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-main);
		z-index: 100;
		box-shadow: var(--shadow-btn);
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

	.menu-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: var(--bg-overlay);
		backdrop-filter: blur(15px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
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
		background: var(--bg-card);
		width: 90%;
		max-width: 320px;
		border-radius: 2rem;
		padding: 2rem;
		box-shadow: var(--shadow-card);
		color: var(--text-main);
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
		color: var(--text-blue);
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
		background: var(--bg-secondary);
		border: none;
		padding: 1.25rem;
		border-radius: 1rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-main);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
	}

	.menu-item:hover {
		filter: brightness(0.95);
	}

	.menu-item:active {
		transform: scale(0.98);
	}

	.menu-item.quit {
		color: var(--color-red);
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
		background: var(--bg-card);
		border-radius: 1rem;
		box-shadow: var(--shadow-card);
		padding: 1rem;
		z-index: 101;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 200px;
		color: var(--text-main);
	}

	.theme-menu button {
		background: none;
		border: none;
		padding: 1rem 1.5rem;
		cursor: pointer;
		border-radius: 0.5rem;
		font-size: 1rem;
		text-align: left;
		color: var(--text-main);
	}

	.theme-menu button:hover {
		background: var(--bg-secondary);
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
		background: var(--color-blue);
		color: var(--text-on-primary);
		border: none;
		padding: 1rem 0;
		width: 180px;
		text-align: center;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: var(--color-blue-glow);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}

	.btn-action.floating-next {
		grid-area: 1 / 1;
		background: var(--color-red);
		color: var(--text-on-primary);
		border: none;
		padding: 1rem 0;
		width: 180px;
		text-align: center;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: var(--color-red-glow);
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
		background: var(--bg-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}

	.confirm-dialog {
		background: var(--bg-card);
		color: var(--text-main);
		padding: 2rem;
		border-radius: 1rem;
		text-align: center;
		max-width: 400px;
		box-shadow: var(--shadow-card);
	}

	.confirm-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.btn-cancel {
		background: var(--bg-secondary);
		color: var(--text-main);
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
		background: var(--bg-main);
		color: var(--text-main);
		text-align: center;
	}

	.finished-content {
		max-width: 400px;
		width: 90%;
		padding: 2rem;
	}

	.finished-title {
		font-size: 3rem;
		color: var(--text-blue);
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
		background: var(--color-red);
		color: var(--text-on-primary);
		border: none;
		padding: 1rem 2rem;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
	}

	.btn-primary {
		background: var(--color-red);
		color: var(--text-on-primary);
		border: none;
		padding: 1.5rem 3rem;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1.2rem;
		cursor: pointer;
		width: 100%;
		box-shadow: var(--color-red-glow);
	}

	.btn-secondary {
		background: transparent;
		color: var(--text-main);
		border: 2px solid var(--border-color);
		padding: 0.75rem 1.5rem;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1rem;
		cursor: pointer;
		width: 100%;
		margin-top: 1rem;
	}
</style>

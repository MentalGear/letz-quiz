<script>
	import { fade, slide } from 'svelte/transition';
	import {
		themeMode,
		initializeTheme,
		playerCount,
		initializePlayerCount,
		playerScores,
		initializePlayerScores
	} from '$lib/stores.js';

	let players = [''];
	let isOpen = false;

	// Load players from localStorage on component mount
	export function openModal() {
		isOpen = true;
		const savedPlayers = localStorage.getItem('players');
		if (savedPlayers) {
			players = JSON.parse(savedPlayers);
		}
		// Ensure at least one empty player field exists
		if (players.length === 0) {
			players = [''];
		}
		// Add a new empty field if all fields are filled
		if (players.every((player) => player.trim().length > 0)) {
			players = [...players, ''];
		}
	}

	export function closeModal() {
		isOpen = false;
	}

	// Initialize player count and scores on component mount
	initializePlayerCount();
	initializePlayerScores();

	function addPlayer() {
		const lastPlayer = players[players.length - 1];
		if (lastPlayer && lastPlayer.trim().length > 0) {
			players = [...players, ''];
		}
	}

	function updatePlayer(index, value) {
		players[index] = value;
	}

	function removePlayer(index) {
		if (players.length > 1) {
			players = players.filter((_, i) => i !== index);
		}
		// Ensure at least one empty player field remains
		if (players.length === 0) {
			players = [''];
		}
	}

	// Save players to localStorage whenever they change
	$: if (typeof window !== 'undefined') {
		const filteredPlayers = players.filter((player) => player.trim().length > 0);
		localStorage.setItem('players', JSON.stringify(filteredPlayers));
		playerCount.set(filteredPlayers.length);
	}

	// Save player scores to localStorage whenever they change
	$: if (typeof window !== 'undefined') {
		localStorage.setItem('playerScores', JSON.stringify(playerScores));
	}
</script>

<div class="modal-backdrop" class:open={isOpen}>
	<div class="modal-content" in:slide|local out:slide|local>
		<div class="screen players">
			<h1>Players</h1>

			{#each players as player, index (index)}
				<div class="player-input-container" in:slide|local out:slide|local>
					<input
						type="text"
						class="player-input"
						bind:value={players[index]}
						placeholder={`Player ${index + 1} Name`}
						on:input={() => addPlayer()}
					/>
					<button class="remove-player" on:click={() => removePlayer(index)}>×</button>
				</div>
			{/each}

			<button class="btn-confirm" on:click={closeModal}>Confirm</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: none;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-backdrop.open {
		display: flex;
	}

	.modal-content {
		background: var(--bg-card);
		color: var(--text-main);
		padding: 2rem;
		border-radius: 1rem;
		width: 100%;
		max-width: 500px;
		max-height: 80vh;
		overflow-y: auto;
		box-sizing: border-box;
		box-shadow: var(--shadow-card);
	}

	.player-input-container {
		width: 100%;
		max-width: 400px;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 2rem;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}

	.player-input {
		flex: 1;
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		border: 2px solid var(--border-color);
		background: var(--bg-input);
		color: var(--text-main);
		font-size: 1rem;
		font-family: var(--font-main);
	}

	.player-input:focus {
		outline: none;
		border-color: var(--color-blue);
	}

	.remove-player {
		background: var(--color-red);
		color: var(--text-on-primary);
		font-size: 1.5em;
		border: none;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease;
	}

	.remove-player:active {
		transform: scale(0.9);
	}

	.btn-confirm {
		background: var(--color-red);
		color: var(--text-on-primary);
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 100px;
		font-weight: bold;
		font-size: 1rem;
		cursor: pointer;
		margin-top: 2rem;
		font-family: var(--font-main);
		box-shadow: var(--color-red-glow);
	}
</style>

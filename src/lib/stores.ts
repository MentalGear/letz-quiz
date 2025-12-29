import { writable, type Writable } from 'svelte/store';

export const themeMode: Writable<string> = writable('device');
export const playerCount: Writable<number> = writable(0);
export const playerScores: Writable<Record<string, number>> = writable({});
export const currentCardScores: Writable<Record<number, Record<string, boolean>>> = writable({});
export const explicitness: Writable<number> = writable(1);

export function initializeTheme() {
	if (typeof window !== 'undefined') {
		const savedTheme = localStorage.getItem('themeMode');
		if (savedTheme) {
			themeMode.set(savedTheme);
		}
		themeMode.subscribe((value) => {
			document.body.classList.remove('light-mode', 'dark-mode');
			if (value === 'light') {
				document.body.classList.add('light-mode');
			} else if (value === 'dark') {
				document.body.classList.add('dark-mode');
			} else if (value === 'device') {
				const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				if (prefersDark) {
					document.body.classList.add('dark-mode');
				} else {
					document.body.classList.add('light-mode');
				}
			}
			localStorage.setItem('themeMode', value);
		});
	}
}

export function initializePlayerCount() {
	if (typeof window !== 'undefined') {
		const savedPlayers = localStorage.getItem('players');
		if (savedPlayers) {
			const players = JSON.parse(savedPlayers);
			if (Array.isArray(players)) {
				const filteredPlayers = players.filter((player: string) => player.trim().length > 0);
				playerCount.set(filteredPlayers.length);
			}
		}
	}
}

export function initializePlayerScores() {
	if (typeof window !== 'undefined') {
		const savedScores = localStorage.getItem('playerScores');
		if (savedScores) {
			try {
				playerScores.set(JSON.parse(savedScores));
			} catch (e) {
				playerScores.set({});
			}
		}
	}
}

export function initializeExplicitness() {
	if (typeof window !== 'undefined') {
		const savedExplicitness = localStorage.getItem('explicitness');
		if (savedExplicitness) {
			explicitness.set(parseInt(savedExplicitness));
		}
		explicitness.subscribe((value) => {
			localStorage.setItem('explicitness', value.toString());
		});
	}
}

export function resetPlayerScores() {
	playerScores.set({});
	currentCardScores.set({});
}

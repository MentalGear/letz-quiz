<script>
    import sayingsData from '$lib/dataset.json';
    import GameCard from '$lib/components/GameCard.svelte';

    let state = 'settings';
    let rounds = 5;
    let mode = 'lu';
    let gameSet = [];
    let container;
    let currentIndex = 0;
    let showConfirm = false;
    let themeMode = 'light';
    let showThemeMenu = false;

    function startGame() {
        gameSet = [...sayingsData]
            .sort(() => 0.5 - Math.random())
            .slice(0, rounds)
            .map(s => ({ ...s, isRevealed: false }));
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
            container.scrollTo({
                left: currentIndex * container.clientWidth,
                behavior: 'smooth'
            });
        } else {
            state = 'settings';
        }
    }

    function closeGame() {
        if (state === 'playing' && currentIndex < gameSet.length - 1 && !gameSet[currentIndex].isRevealed) {
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

    function toggleThemeMenu() {
        showThemeMenu = !showThemeMenu;
    }

    function setTheme(newMode) {
        themeMode = newMode;
        showThemeMenu = false;
        // Apply theme to body
        if (themeMode === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
    }

    // Calculate progress for the top bar
    $: progress = gameSet.length > 0 ? ((currentIndex + 1) / gameSet.length) * 100 : 0;
</script>

<main>
    {#if state === 'settings'}
        <div class="screen settings">
            <h1>🇱🇺 Spreechwierder</h1>
            
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
                </select>
            </div>

            <button class="btn-primary" on:click={startGame}>Start Game</button>
        </div>
    {:else}
        <div class="screen game">
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: {progress}%" />
            </div>

            <button class="btn-back floating" on:click={closeGame}>✕</button>

            <div class="scroll-wrapper" bind:this={container} on:scroll={handleScroll}>
                {#each gameSet as saying, i}
                    <div class="snap-point">
                        <GameCard {saying} {mode} revealed={saying.isRevealed} />
                    </div>
                {/each}
            </div>

            <button class="btn-theme-toggle floating" on:click={toggleThemeMenu}>🌓</button>

            {#if showThemeMenu}
                <div class="theme-menu">
                    <button on:click={() => setTheme('light')}>Light Mode</button>
                    <button on:click={() => setTheme('dark')}>Dark Mode</button>
                    <button on:click={() => setTheme('device')}>Device Settings</button>
                </div>
            {/if}

            {#if gameSet[currentIndex].isRevealed && currentIndex < gameSet.length - 1}
                <button class="btn-action floating-next" on:click={handleAction}>Next →</button>
            {:else if gameSet[currentIndex].isRevealed && currentIndex === gameSet.length - 1}
                <button class="btn-action floating-next" on:click={handleAction}>Finish</button>
            {:else}
                <button class="btn-action floating-reveal" on:click={handleAction}>Reveal</button>
            {/if}
        </div>

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

    :global(body.dark-mode) { background: #2d3436; }
    :global(body.light-mode) { background: #f8f9fa; }

    main { height: 100svh; width: 100svw; display: flex; flex-direction: column; }

    .screen { height: 100svh; display: flex; flex-direction: column; padding: 2rem; box-sizing: border-box; position: relative; }
    .settings { justify-content: center; align-items: center; max-width: 400px; margin: 0 auto; }

    .control { width: 100%; margin-bottom: 2rem; }
    label { font-weight: 700; color: #444; display: block; margin-bottom: 0.5rem; }
    select { width: 100%; padding: 1rem; border-radius: 1rem; border: 2px solid #ddd; background: white; font-size: 1rem; }

    .progress-bar-container {
        width: 100%;
        height: 10px;
        background-color: #eee;
        border-radius: 5px;
        margin-bottom: 1rem;
    }

    .progress-bar {
        height: 100%;
        background-color: #00A3E0;
        border-radius: 5px;
        transition: width 0.3s ease;
    }

    .scroll-wrapper {
        flex: 1;
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
    }
    .scroll-wrapper::-webkit-scrollbar { display: none; }
    .snap-point { flex: 0 0 100svw; scroll-snap-align: center; display: flex; align-items: center; justify-content: center; }

    .btn-back.floating {
        position: absolute;
        top: 1rem;
        left: 1rem;
        background: #eee; border: none; width: 64px; height: 64px;
        border-radius: 50%; font-size: 2rem; cursor: pointer; display: flex;
        align-items: center; justify-content: center; color: #666;
        z-index: 100;
    }

    .btn-theme-toggle.floating {
        position: absolute;
        bottom: 2rem;
        left: 2rem;
        background: #eee; border: none; width: 64px; height: 64px;
        border-radius: 50%; font-size: 2rem; cursor: pointer; display: flex;
        align-items: center; justify-content: center; color: #666;
        z-index: 100;
    }

    .theme-menu {
        position: absolute;
        bottom: 7rem;
        left: 2rem;
        background: white;
        border-radius: 1rem;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        padding: 0.5rem;
        z-index: 101;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .theme-menu button {
        background: none;
        border: none;
        padding: 0.5rem 1rem;
        cursor: pointer;
        border-radius: 0.5rem;
    }

    .theme-menu button:hover {
        background: #f0f0f0;
    }

    .btn-action.floating-reveal {
        position: absolute;
        bottom: 2rem;
        right: 2rem;
        background: #00A3E0; color: white; border: none; padding: 1rem 2rem;
        border-radius: 100px; font-weight: bold; font-size: 1.2rem; cursor: pointer;
        z-index: 100;
    }

    .btn-action.floating-next {
        position: absolute;
        bottom: 2rem;
        right: 2rem;
        background: #EF3340; color: white; border: none; padding: 1rem 2rem;
        border-radius: 100px; font-weight: bold; font-size: 1.2rem; cursor: pointer;
        z-index: 100;
    }

    .confirm-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
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

    .confirm-buttons {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
    }

    .btn-cancel {
        background: #ccc; color: white; border: none; padding: 0.5rem 1.5rem;
        border-radius: 0.5rem; cursor: pointer;
    }

    .btn-confirm {
        background: #EF3340; color: white; border: none; padding: 0.5rem 1.5rem;
        border-radius: 0.5rem; cursor: pointer;
    }

    .btn-primary {
        background: #EF3340; color: white; border: none; padding: 1.5rem 3rem;
        border-radius: 100px; font-weight: bold; font-size: 1.2rem; cursor: pointer; width: 100%;
    }
</style>
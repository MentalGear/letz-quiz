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
    let themeMode = 'device';
    let popularityMin = 1;
    let popularityMax = 5;
    let difficulty = 'medium';

    // Initialize theme on page load
    $: if (themeMode === 'device') {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else if (typeof window !== 'undefined') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
    }

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

    function setTheme(newMode) {
        themeMode = newMode;
        // Apply theme to body
        if (themeMode === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else if (themeMode === 'light') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        } else if (themeMode === 'device') {
            // Use device preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
            } else {
                document.body.classList.add('light-mode');
                document.body.classList.remove('dark-mode');
            }
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
                    <!-- <option value="en_to_lu">English to Luxembourgish</option> -->
                </select>
            </div>

            <div class="control">
                <label>Difficulty Range</label>
                <div class="range-container">
                    <select bind:value={popularityMin} on:change={() => { if (popularityMin > popularityMax) popularityMax = popularityMin; }}>
                        {#each Array.from({length: 5}, (_, i) => i+1) as num}
                            <option value={num}>{num}</option>
                        {/each}
                    </select>
                    <select bind:value={popularityMax} on:change={() => { if (popularityMax < popularityMin) popularityMin = popularityMax; }}>
                        {#each Array.from({length: 5}, (_, i) => i+1) as num}
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
        
            <button class="btn-primary" on:click={startGame}>Start Game</button>


            <div class="control" style="margin-top: 50px; opacity: 0.5">
                <label>Theme</label>
                <select bind:value={themeMode} on:change={() => setTheme(themeMode)}>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="device">Device Settings</option>
                </select>
            </div>
        
        </div>
    {:else}
        <div class="screen game">
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: {progress}%" />
            </div>

            <button class="btn-back floating" on:click={closeGame}>✕</button>
            <div class="mode-select-wrapper">
                <select class="mode-select" bind:value={mode}>
                    <option value="lu">🇱🇺 LU</option>
                    <option value="literal">🌐 Literal</option>
                    <option value="correct">🌐 Equivalent</option>
                    <!-- <option value="en_to_lu">🌐→🇱🇺</option> -->
                </select>
            </div>

            <div class="scroll-wrapper" bind:this={container} on:scroll={handleScroll}>
                {#each gameSet as saying, i}
                    <div class="snap-point">
                        <GameCard {saying} {mode} revealed={saying.isRevealed} />
                    </div>
                {/each}
            </div>

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
    .range-container { display: flex; gap: 1rem; }
    .range-container select { width: 50%; }

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

    :global(body.dark-mode) .btn-back.floating {
        background: #444;
        color: #f8f9fa;
    }

    .mode-select-wrapper {
        position: absolute;
        bottom: 2rem;
        left: 2rem;
        z-index: 100;
    }

    .mode-select {
        padding: 0.5rem 1rem;
        border-radius: 1rem;
        border: 2px solid #ddd;
        background: white;
        font-size: 1rem;
        cursor: pointer;
    }

    :global(body.dark-mode) .mode-select {
        background: #3d4448;
        color: #f8f9fa;
        border-color: #666;
    }

    :global(body.dark-mode) .mode-select option {
        background: #3d4448;
        color: #f8f9fa;
    }

    .theme-menu {
        position: absolute;
        bottom: 7rem;
        left: 2rem;
        background: white;
        border-radius: 1rem;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
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
        background: #ccc; color: white; border: none; padding: 1rem 2rem;
        border-radius: 100px; font-weight: bold; font-size: 1.2rem; cursor: pointer;
    }

    .btn-confirm {
        background: #EF3340; color: white; border: none; padding: 1rem 2rem;
        border-radius: 100px; font-weight: bold; font-size: 1.2rem; cursor: pointer;
    }

    .btn-primary {
        background: #EF3340; color: white; border: none; padding: 1.5rem 3rem;
        border-radius: 100px; font-weight: bold; font-size: 1.2rem; cursor: pointer; width: 100%;
    }
</style>
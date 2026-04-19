// Headless simulator for Chain Reaction.
//
// Loads diceLogic.js + gameManager.js in a vm sandbox with minimal
// THREE/DOM/gsap shims, plus fake UI and dice controllers. Plays a
// number of complete games using a simple strategy and asserts no
// deadlocks or rule violations occur.

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---------- Sandbox & shims ----------
const sandbox = {};
// Silence gameManager's noisy logs unless --trace is passed.
const tracing = process.argv.includes('--trace');
sandbox.console = tracing ? console : {
    log: () => {}, warn: () => {}, error: (...a) => console.error(...a)
};
sandbox.window = sandbox;
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;

vm.createContext(sandbox);

// Only two source files are needed for the logic: diceLogic.js defines
// AssessDiceRoll; gameManager.js defines Player + GameManager.
vm.runInContext(fs.readFileSync(path.join(ROOT, 'diceLogic.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'gameManager.js'), 'utf8'), sandbox);

const GameManager = sandbox.GameManager;

// ---------- Fake controllers ----------
class FakeUIManager {
    constructor(verbose = false) {
        this.verbose = verbose;
        this.lastMessage = '';
        this.scores = {};
        this.enhancementButtonsVisible = false;
        // gameManager logs classList state; provide stub elements.
        const stubElt = () => ({
            classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} },
            disabled: false
        });
        this.rollButton = stubElt();
        this.continueButton = stubElt();
        this.stopButton = stubElt();
    }
    showGameScreen() {}
    initializeScoreboard(players) {
        players.forEach(p => { this.scores[p.id] = 0; });
    }
    updateScore(id, s) { this.scores[id] = s; }
    highlightActivePlayer() {}
    displayMessage(m) {
        this.lastMessage = m;
        if (this.verbose) console.log('  MSG:', m);
    }
    updateTurnInfo() {}
    updateChainInfo() {}
    clearChainInfo() {}
    clearMessages() {}
    showRollButton() {}
    showTurnChoiceButtons() {}
    hideAllButtons() {}
    showContinueButton() {}
    showStopButton() {}
    showChainSwitchButtons() {
        // Return stub buttons; simulator drives the decision directly.
        const stub = () => ({ addEventListener: () => {} });
        return { keepButton: stub(), switchButton: stub() };
    }
    removeChainSwitchButtons() {}
    showEnhancementButtons(v) { this.enhancementButtonsVisible = !!v; }
    enableEnhancementButton() {}
    showEnhancementPrompt() {}
    hideEnhancementPrompt() {}
    refreshEnhancementButtons() { this.enhancementButtonsVisible = true; }
    displayPlayerEnhancements() {}
    updateEnhancementTokenVisual() {}
    displayWinner() {}
}

class FakeDiceController {
    constructor() {
        this.dice = Array.from({ length: 5 }, (_, i) => ({
            userData: { id: i, isSetAside: false, finalValue: 1, type: 'die' },
            quaternion: {},
            position: {},
            rotation: {}
        }));
    }
    createTable() {}
    createDice() {}
    rollDice(indices) {
        if (!indices) indices = this.dice.map(d => d.userData.id);
        indices.forEach(i => {
            const die = this.dice[i];
            die.userData.finalValue = 1 + Math.floor(Math.random() * 6);
            die.userData.isRolling = false;
        });
        return Promise.resolve();
    }
    getDiceValues() {
        return this.dice.map(d => ({
            index: d.userData.id,
            value: d.userData.finalValue,
            setAside: d.userData.isSetAside
        }));
    }
    setDiceAside(indices) {
        indices.forEach(i => { this.dice[i].userData.isSetAside = true; });
    }
    resetDice() {
        this.dice.forEach(d => {
            d.userData.isSetAside = false;
            d.userData.finalValue = 1;
        });
    }
    setDieValue(index, value) {
        this.dice[index].userData.finalValue = value;
    }
    highlightAllChainDice() {}
    highlightAllPotentialChains() {}
    highlightSelectableDiceForEnrichment() {}
    resetEnrichmentHighlights() {}
    createEnhancementTokens() {}
}

// ---------- Strategy ----------
// Simple greedy: stop once chain >= 3 dice OR chain_score >= 12.
// On multi-chain selection, pick the chain with highest value*count.
// On switch/keep: switch if new chain score > current chain score.
function pickBestChain(potentialChains) {
    return potentialChains.slice().sort(
        (a, b) => (b.value * b.count) - (a.value * a.count)
    )[0];
}

async function flush(n = 3) {
    for (let i = 0; i < n; i++) await Promise.resolve();
}

async function playOneGame(playerCount, verbose = false, useEnhancements = false) {
    const ui = new FakeUIManager(verbose);
    const dice = new FakeDiceController();
    let winnerInfo = null;
    const gm = new GameManager(playerCount, 'Sim', ui, dice, (info) => {
        winnerInfo = info;
    });
    gm.setupPlayers();
    ui.initializeScoreboard(gm.getPlayers());
    // Minimal enhancement controller that drives applyEnrichment/applyControlRod/applyFusion.
    const enhCtrl = {
        attemptUseEnhancement: (type) => {
            const p = gm.getCurrentPlayer();
            if (!gm.canUseEnhancement(type)) return false;
            if (type === 'enrichment') {
                // Target the first active die that's not already the chain number.
                const target = gm.currentRoll.find(
                    d => !d.setAside && (gm.chainNumber ? d.value !== gm.chainNumber : true)
                );
                if (!target) return false;
                const targetDie = dice.dice[target.index];
                if (p.useEnhancement('enrichment')) gm.applyEnrichment(targetDie);
                return true;
            }
            if (type === 'controlRod') {
                if (p.useEnhancement('controlRod')) gm.applyControlRod();
                return true;
            }
            if (type === 'fusion') {
                const counts = gm.countDiceValues(gm.currentRoll);
                const chosen = Object.entries(counts)
                    .map(([v, n]) => ({ value: +v, count: n }))
                    .filter(c => c.count >= 2 && c.value !== gm.chainNumber)
                    .sort((a, b) => (b.value * b.count) - (a.value * a.count))[0];
                if (!chosen) return false;
                const indices = gm.currentRoll
                    .filter(d => !d.setAside && d.value === chosen.value)
                    .map(d => d.index);
                if (p.useEnhancement('fusion')) gm.applyFusion(chosen.value, indices);
                return true;
            }
            return false;
        }
    };
    gm.setEnhancementController(enhCtrl);
    gm.startGame();

    let guard = 0;
    const GUARD_MAX = 5000; // per-game step limit

    while (!winnerInfo) {
        guard++;
        if (guard > GUARD_MAX) {
            throw new Error(`Deadlock: phase=${gm.phase}, player=${gm.getCurrentPlayer().name}, turn=${gm.turnNumber}`);
        }

        const phase = gm.phase;
        if (phase === 'ROLL') {
            gm.handleRollAction();
            await flush();
            continue;
        }

        if (phase === 'CHAIN_SELECTION') {
            // Pick the best potential chain and select it directly.
            if (!gm.potentialChains || gm.potentialChains.length === 0) {
                throw new Error("CHAIN_SELECTION with no potentialChains");
            }
            const best = pickBestChain(gm.potentialChains);
            gm.selectChain(best.value, best.diceIndices);
            await flush();
            continue;
        }

        if (phase === 'DECISION') {
            const chainScore = (gm.chainNumber || 0) * gm.chainDice.length;

            // Occasionally use enhancements when available.
            if (useEnhancements) {
                const p = gm.getCurrentPlayer();
                // Fusion when we have chain + another pair
                if (p.enhancements.fusion && Math.random() < 0.3 && gm.canUseEnhancement('fusion')) {
                    gm.enhancementController.attemptUseEnhancement('fusion');
                    await flush();
                    continue;
                }
                // Enrichment to force another chain die
                if (p.enhancements.enrichment && Math.random() < 0.2 && gm.canUseEnhancement('enrichment')) {
                    gm.enhancementController.attemptUseEnhancement('enrichment');
                    await flush();
                    continue;
                }
                // Control Rod: bank instead of risking
                if (p.enhancements.controlRod && chainScore >= 10 && Math.random() < 0.1 && gm.canUseEnhancement('controlRod')) {
                    gm.enhancementController.attemptUseEnhancement('controlRod');
                    await flush();
                    continue;
                }
            }

            // Stop if chain >= 3 dice or score >= 12; otherwise press on.
            if (gm.chainDice.length >= 3 || chainScore >= 12) {
                gm.handleStopAction();
            } else {
                gm.handleContinueAction();
            }
            await flush();
            continue;
        }

        if (phase === 'CHAIN_SWITCH_DECISION') {
            const cur = gm.chainNumber * gm.chainDice.length;
            const nw = gm.newPotentialChain.value * gm.newPotentialChain.count;
            if (nw > cur) gm.handleSwitchChainDecision();
            else gm.handleKeepChainDecision();
            await flush();
            continue;
        }

        if (phase === 'END') break;

        // Unknown phase — give the microtask queue a chance to settle.
        await flush();
    }

    return { winnerInfo, players: gm.getPlayers(), rounds: gm.gameRound, turns: gm.turnNumber };
}

async function main() {
    const games = parseInt(process.argv[2], 10) || 50;
    const players = parseInt(process.argv[3], 10) || 3;
    const verbose = process.argv.includes('--verbose');

    let wins = { singleWinner: 0, tied: 0 };
    let totalTurns = 0, totalRounds = 0;
    let maxScore = 0, minScore = Infinity;
    let deadlocks = 0;

    const useEnh = process.argv.includes('--enh');
    for (let g = 0; g < games; g++) {
        try {
            const r = await playOneGame(players, verbose && g === 0, useEnh);
            if (r.winnerInfo.tied) wins.tied++; else wins.singleWinner++;
            totalTurns += r.turns;
            totalRounds += r.rounds;
            for (const p of r.players) {
                if (p.score > maxScore) maxScore = p.score;
                if (p.score < minScore) minScore = p.score;
            }
            if (verbose) {
                const scores = r.players.map(p => `${p.name}:${p.score}`).join(', ');
                console.log(`Game ${g + 1}: ${scores} | rounds=${r.rounds} turns=${r.turns}`);
            }
        } catch (err) {
            deadlocks++;
            console.error(`Game ${g + 1} FAILED:`, err.message);
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Games played:    ${games} (${players} players each)`);
    console.log(`Clean finishes:  ${wins.singleWinner + wins.tied}`);
    console.log(`  Single winner: ${wins.singleWinner}`);
    console.log(`  Tied:          ${wins.tied}`);
    console.log(`Deadlocks:       ${deadlocks}`);
    console.log(`Avg turns/game:  ${(totalTurns / games).toFixed(1)}`);
    console.log(`Avg rounds/game: ${(totalRounds / games).toFixed(1)}`);
    console.log(`Score range:     ${minScore} .. ${maxScore}`);

    process.exit(deadlocks === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(2);
});

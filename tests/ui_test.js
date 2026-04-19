// Playwright UI smoke test for Chain Reaction.
// Drives the real game through a headless Chromium, captures screenshots,
// and asserts the core UI flow works (roll -> chain select -> decision ->
// stop -> next player).

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = 'http://localhost:8000/';
const SHOT_DIR = path.resolve(__dirname, 'screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

function log(...a) { console.log('[ui-test]', ...a); }

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
        headless: true,
        args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader']
    });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    // Redirect the CDN scripts to the locally-vendored copies so the
    // sandbox doesn't need external network access.
    const vendor = path.join(__dirname, 'vendor/node_modules');
    const routes = [
        ['**/three.min.js', path.join(vendor, 'three/build/three.min.js')],
        ['**/OrbitControls.js', path.join(vendor, 'three/examples/js/controls/OrbitControls.js')],
        ['**/gsap.min.js', path.join(vendor, 'gsap/dist/gsap.min.js')]
    ];
    for (const [glob, filePath] of routes) {
        await page.route(glob, async (route) => {
            const body = fs.readFileSync(filePath);
            await route.fulfill({
                status: 200,
                contentType: 'application/javascript',
                body
            });
        });
    }

    // Surface console + errors so we can see JS issues.
    const pageErrors = [];
    page.on('pageerror', (err) => {
        pageErrors.push(String(err));
        log('PAGE ERROR:', err.message);
    });
    page.on('console', (msg) => {
        const t = msg.type();
        if (t === 'error' || t === 'warning') {
            log(`console.${t}:`, msg.text());
        }
    });

    log('Loading', URL);
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#start-game-button', { state: 'visible' });
    await page.screenshot({ path: path.join(SHOT_DIR, '01-setup.png') });

    // Start a 2-player game for a faster test.
    await page.selectOption('#player-count', '2');
    await page.click('#start-game-button');
    await page.waitForSelector('#game-screen:not(.hidden)');
    await page.waitForFunction(() => !document.getElementById('roll-button').classList.contains('hidden'));
    await page.screenshot({ path: path.join(SHOT_DIR, '02-game-start.png') });
    log('Game screen visible, roll button enabled.');

    // Helper: read current game state.
    const gameState = () => page.evaluate(() => {
        const gm = window.gameManager;
        if (!gm) return null;
        return {
            phase: gm.phase,
            currentPlayer: gm.getCurrentPlayer()?.name,
            chainNumber: gm.chainNumber,
            chainLen: gm.chainDice.length,
            potentialChains: (gm.potentialChains || []).map(c => ({ value: c.value, count: c.count })),
            currentRoll: (gm.currentRoll || []).map(d => ({ i: d.index, v: d.value, aside: d.setAside })),
            scores: gm.getPlayers().map(p => ({ name: p.name, score: p.score })),
            rollHidden: document.getElementById('roll-button').classList.contains('hidden'),
            continueHidden: document.getElementById('continue-button').classList.contains('hidden'),
            stopHidden: document.getElementById('stop-button').classList.contains('hidden')
        };
    });

    // Wait for the UI to settle: either dice finish rolling and we land
    // in a clickable state, or the game reaches END.
    const waitForStableUI = async () => {
        await page.waitForFunction(() => {
            const gm = window.gameManager;
            if (!gm) return false;
            if (gm.phase === 'END') return true;
            const anyRolling = window.diceController.dice.some(d => d.userData.isRolling);
            if (anyRolling) return false;
            const rb = document.getElementById('roll-button');
            const cb = document.getElementById('continue-button');
            const sb = document.getElementById('stop-button');
            const keep = document.getElementById('keep-chain-button');
            const anyVisible = (b) => b && !b.classList.contains('hidden');
            return anyVisible(rb) || (anyVisible(cb) && anyVisible(sb)) || !!keep || gm.phase === 'CHAIN_SELECTION';
        }, null, { timeout: 15000 });
    };

    // --- Turn 1: roll and drive the game for a few turns ---
    let turnsDriven = 0;
    const MAX_TURNS = 12;
    let rolls = 0;
    let decisionsTaken = 0;
    let chainSelections = 0;

    while (turnsDriven < MAX_TURNS) {
        const s0 = await gameState();
        if (!s0) throw new Error('gameManager not on window');
        log(`Step: phase=${s0.phase} player=${s0.currentPlayer} chain=${s0.chainLen}x${s0.chainNumber}`);

        if (s0.phase === 'END') {
            log('Phase END reached.');
            break;
        }

        if (s0.phase === 'ROLL') {
            // Button should be visible.
            if (s0.rollHidden) throw new Error(`ROLL phase but roll button hidden!`);
            await page.click('#roll-button');
            rolls++;
            await waitForStableUI();
            continue;
        }

        if (s0.phase === 'CHAIN_SELECTION') {
            chainSelections++;
            if (!s0.potentialChains.length) throw new Error('CHAIN_SELECTION with no potentialChains');
            // Select the highest-value*count chain.
            const best = s0.potentialChains.slice().sort((a, b) => b.value * b.count - a.value * a.count)[0];
            await page.evaluate((chain) => {
                const gm = window.gameManager;
                const indices = gm.currentRoll
                    .filter(d => !d.setAside && d.value === chain.value)
                    .map(d => d.index);
                gm.selectChain(chain.value, indices);
            }, best);
            await waitForStableUI();
            continue;
        }

        if (s0.phase === 'DECISION') {
            decisionsTaken++;
            // Verify Stop + Continue both visible.
            if (s0.continueHidden || s0.stopHidden) {
                throw new Error(`DECISION phase but buttons hidden: continue=${s0.continueHidden} stop=${s0.stopHidden}`);
            }
            if (decisionsTaken === 1) {
                await page.screenshot({ path: path.join(SHOT_DIR, '03-decision.png') });
            }
            // Stop once chain is >= 3 or value*count >= 12.
            const shouldStop = s0.chainLen >= 3 || (s0.chainNumber || 0) * s0.chainLen >= 12;
            if (shouldStop) {
                log(`  -> STOP (chain=${s0.chainLen}x${s0.chainNumber})`);
                await page.click('#stop-button');
                turnsDriven++;
            } else {
                log(`  -> CONTINUE (chain=${s0.chainLen}x${s0.chainNumber})`);
                await page.click('#continue-button');
            }
            await waitForStableUI();
            continue;
        }

        if (s0.phase === 'CHAIN_SWITCH_DECISION') {
            // Click keep-chain-button (simpler path).
            const btn = await page.$('#keep-chain-button');
            if (!btn) throw new Error('CHAIN_SWITCH_DECISION but no keep-chain-button');
            await btn.click();
            await waitForStableUI();
            continue;
        }

        throw new Error(`Unknown phase: ${s0.phase}`);
    }

    await page.screenshot({ path: path.join(SHOT_DIR, '04-after-turns.png') });

    // --- Final checks ---
    const finalState = await gameState();
    log('Final state:', JSON.stringify(finalState, null, 2));
    log(`Rolls: ${rolls}, decisions: ${decisionsTaken}, chain selections: ${chainSelections}, turns driven: ${turnsDriven}`);
    log(`Page errors: ${pageErrors.length}`);
    if (pageErrors.length) {
        for (const e of pageErrors) log('   -', e);
    }

    // Die-face-vs-state consistency check: ensure the value reported by
    // getDiceValueFromRotation matches the die's stored finalValue for all
    // dice (this is the bug we claimed to fix).
    const faceCheck = await page.evaluate(() => {
        const dc = window.diceController;
        if (!dc) return { error: 'no diceController' };
        const mismatches = [];
        dc.dice.forEach((die, idx) => {
            const stored = die.userData.finalValue;
            const observed = window.getDiceValueFromRotation(die.quaternion);
            if (stored && stored !== observed) {
                mismatches.push({ idx, stored, observed });
            }
        });
        return { mismatches, diceCount: dc.dice.length };
    });
    log('Face consistency:', JSON.stringify(faceCheck));

    await browser.close();

    let failed = false;
    if (pageErrors.length) { log('FAIL: page errors occurred'); failed = true; }
    if (faceCheck.mismatches && faceCheck.mismatches.length) { log('FAIL: face mismatch'); failed = true; }
    if (turnsDriven === 0) { log('FAIL: no turns completed'); failed = true; }

    log(failed ? 'RESULT: FAILED' : 'RESULT: PASSED');
    process.exit(failed ? 1 : 0);
})().catch(err => {
    console.error('Fatal:', err);
    process.exit(2);
});

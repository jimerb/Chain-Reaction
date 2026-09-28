'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const URL = process.env.TEST_URL || 'http://localhost:8000';
const screenshots = path.join(__dirname, 'screenshots');
fs.mkdirSync(screenshots, { recursive: true });
(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : process.platform === 'win32' ? { channel: 'chrome' } : {}) });
    const errors = [];
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(URL);
        assert.equal(await page.locator('#target-score').inputValue(), '100');
        assert.equal(await page.locator('#play-mode option').count(), 2);
        assert.equal(await page.locator('#play-mode').inputValue(), 'computer');
        assert.equal(await page.getByRole('button', { name: 'Sound on', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.screenshot({ path: path.join(screenshots, '01-setup-desktop.png'), fullPage: true });
        await page.locator('#play-mode').selectOption('local');
        await page.getByRole('button', { name: 'Take your seats' }).click();
        async function rig(values) { await page.evaluate(values => { let i = 0; window.gameManager.random = () => (values[i++] - .5) / 6; }, values); }
        async function ready() { await page.waitForFunction(() => !document.getElementById('new-game-button').disabled); }
        async function roll(values, name = /Roll /) { await rig(values); await page.locator('#actions').getByRole('button', { name }).click(); await ready(); }
        async function newGame(count = 2, mode = 'local') {
            if (await page.locator('#victory-dialog').isVisible()) await page.locator('#victory-review').click();
            await page.getByRole('button', { name: 'New game', exact: true }).click();
            await page.getByRole('button', { name: 'New table', exact: true }).click();
            await page.locator('#player-count').selectOption(String(count));
            await page.locator('#play-mode').selectOption(mode);
            await page.locator('#target-score').selectOption('50');
            await page.getByRole('button', { name: 'Take your seats' }).click();
        }
        await page.screenshot({ path: path.join(screenshots, '02-before-first-roll.png'), fullPage: true });
        assert.equal(await page.locator('#active-dice .die-wrap').count(), 5);
        assert.ok(await page.locator('#active-dice').isVisible(), 'Dice visible immediately, without resizing');
        // Full rolls must visibly travel and tumble even when the OS prefers reduced
        // motion. The game's explicit Gentle rolls control provides the alternative.
        await rig([2, 2, 2, 6, 6]);
        await page.locator('#actions').getByRole('button', { name: /Roll / }).click();
        await page.waitForTimeout(280);
        const sampleMotion = () => page.locator('#active-dice .die-wrap').evaluateAll(dice => dice.map(d => ({
            position: getComputedStyle(d).transform, rotation: getComputedStyle(d.querySelector('.die')).transform,
            duration: d.getAnimations()[0]?.effect.getTiming().duration
        })));
        const early = await sampleMotion();
        assert.ok(early.every(d => d.duration >= 1500));
        assert.equal(await page.locator('.choice').count(), 0, 'Do not show decisions while dice are airborne');
        await page.screenshot({ path: path.join(screenshots, 'roll-airborne.png'), fullPage: true });
        await page.waitForTimeout(330);
        const later = await sampleMotion();
        assert.ok(later.every((d, i) => d.position !== early[i].position && d.rotation !== early[i].rotation), 'All rolling dice travel AND rotate');
        await page.screenshot({ path: path.join(screenshots, 'roll-bounce.png'), fullPage: true });
        await ready();
        assert.equal(await page.locator('.choice').count(), 2);
        assert.deepEqual(await page.locator('.choice-dice').evaluateAll(groups => groups.map(group => [...group.querySelectorAll('.die')].map(d => d.children[2].querySelectorAll('.pip').length))), [[2, 2, 2], [6, 6]]);
        await page.screenshot({ path: path.join(screenshots, '03-pairing-choice.png'), fullPage: true });
        await page.getByRole('button', { name: 'Full rolls', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: 'Gentle rolls', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.getByRole('button', { name: 'CHOOSE CHAIN: 2 × 6, 12 points, 3 dice left' }).click();
        assert.equal(await page.locator('#held-dice .die-wrap').count(), 2);
        await roll([6, 5, 5]);
        assert.equal(await page.locator('.choice').count(), 2);
        await page.getByRole('button', { name: /SWITCH CHAIN: 2 × 5/ }).click();
        assert.equal(await page.locator('#active-dice .die-wrap').count(), 3);
        await page.screenshot({ path: path.join(screenshots, '04-switched-chain.png'), fullPage: true });
        await roll([5, 1, 2]);
        await page.getByRole('button', { name: /KEEP \+ EXTEND/ }).click();
        assert.equal(await page.evaluate(() => gameManager.phase), 'DECISION');
        await page.getByRole('button', { name: 'Bank 15 points', exact: true }).click();
        assert.equal(await page.evaluate(() => gameManager.player.score), 15);
        assert.equal(await page.evaluate(() => gameManager.phase), 'TURN_END');
        await page.getByRole('button', { name: /Next ·/ }).click();
        assert.equal(await page.locator('#active-dice .die-wrap').count(), 5);
        assert.equal(await page.locator('#held-dice .die-wrap').count(), 0);
        await roll([1, 2, 3, 4, 6]);
        await page.locator('#enrichment-button').click();
        await page.getByRole('button', { name: 'Die 1: 1 → 6', exact: true }).click();
        await page.getByRole('button', { name: /CHOOSE CHAIN: 2 × 6/ }).click();
        await page.getByRole('button', { name: 'Bank 12 points', exact: true }).click();
        assert.equal(await page.evaluate(() => gameManager.player.score), 12);
        await page.getByRole('button', { name: /Next ·/ }).click();
        await roll([3, 3, 1, 2, 4]);
        await page.getByRole('button', { name: /CHOOSE CHAIN: 2 × 3/ }).click();
        await roll([1, 2, 4]);
        await page.locator('#controlRod-button').click();
        assert.equal(await page.evaluate(() => gameManager.result.points), 6);
        await page.getByRole('button', { name: /Next ·/ }).click();
        await roll([5, 5, 1, 2, 3]);
        await page.getByRole('button', { name: /CHOOSE CHAIN: 2 × 5/ }).click();
        await roll([5, 6, 6]);
        await page.locator('#fusion-button').click();
        await page.getByRole('button', { name: 'Fuse 3 × 5 + 2 × 6 · bank 27', exact: true }).click();
        assert.equal(await page.locator('.fusion-strand').count(), 2);
        assert.deepEqual(await page.locator('.fusion-strand').evaluateAll(groups => groups.map(group => group.querySelectorAll('.die').length)), [3, 2]);
        assert.equal(await page.evaluate(() => gameManager.result.points), 27);
        await page.getByRole('button', { name: /Next ·/ }).click();
        await roll([4, 4, 4, 4, 4]);
        assert.equal(await page.evaluate(() => gameManager.result.title), 'Critical Mass');
        assert.equal(await page.evaluate(() => gameManager.result.points), 20);
        assert.deepEqual(await page.locator('#held-dice .die').evaluateAll(dice => dice.map(d => d.children[2].querySelectorAll('.pip').length)), [4, 4, 4, 4, 4]);
        // Exercise the full tumble animation, sound scheduling and interaction lock too.
        await page.getByRole('button', { name: /Next ·/ }).click();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.getByRole('button', { name: 'Gentle rolls', exact: true }).click();
        await rig([1, 1, 2, 3, 4]);
        await page.locator('#actions').getByRole('button', { name: /Roll / }).click();
        assert.equal(await page.locator('#new-game-button').isDisabled(), true);
        await ready();
        assert.equal(await page.evaluate(() => gameManager.rollNumber), 1);
        assert.deepEqual(await page.locator('#active-dice .die').evaluateAll(dice => dice.map(d => d.children[2].querySelectorAll('.pip').length)), [1, 1, 2, 3, 4]);
        await page.getByRole('button', { name: 'Sound on', exact: true }).click();
        await page.getByRole('button', { name: 'Full rolls', exact: true }).click();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        // Exact reported regression: 2 twos -> 3 threes must offer Bank 9 or Roll 2.
        await newGame();
        await roll([2, 2, 1, 4, 6]);
        await page.getByRole('button', { name: /CHOOSE CHAIN: 2 × 2/ }).click();
        await roll([3, 3, 3]);
        await page.getByRole('button', { name: 'SWITCH CHAIN: 3 × 3, 9 points, 2 dice left', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: 'Bank 9 points', exact: true }).isVisible(), true);
        assert.equal(await page.getByRole('button', { name: 'Roll 2 dice', exact: true }).isVisible(), true);
        assert.equal(await page.locator('#held-dice .die-wrap').count(), 3);
        assert.equal(await page.locator('#active-dice .die-wrap').count(), 2);
        assert.equal(await page.evaluate(() => gameManager.player.turns), 0);
        await page.screenshot({ path: path.join(screenshots, 'switch-to-three-continue.png'), fullPage: true });
        await roll([3, 6]);
        await page.getByRole('button', { name: /KEEP \+ EXTEND: 4 × 3/ }).click();
        await page.getByRole('button', { name: 'Bank 12 points', exact: true }).click();
        assert.equal(await page.evaluate(() => gameManager.player.score), 12);
        // Responsive checks include actual dice extents, not just container widths.
        await newGame(5);
        await roll([2, 2, 5, 5, 1]);
        for (const [width, height] of [[1920, 1080], [1366, 768], [1024, 768], [768, 1024], [390, 844], [320, 740]]) {
            await page.setViewportSize({ width, height });
            const layout = await page.evaluate(() => {
                const board = document.getElementById('tabletop').getBoundingClientRect();
                return { overflow: document.documentElement.scrollWidth > innerWidth, dice: [...document.querySelectorAll('#active-dice .die-wrap')].every(el => {
                    const r = el.getBoundingClientRect(); return r.width > 20 && r.left >= board.left && r.right <= board.right && r.top >= board.top && r.bottom <= board.bottom;
                }) };
            });
            assert.equal(layout.overflow, false, 'No horizontal overflow at ' + width);
            assert.equal(layout.dice, true, 'All dice within board at ' + width);
            await page.screenshot({ path: path.join(screenshots, 'responsive-' + width + '.png'), fullPage: true });
        }
        // Keyboard, modal close, audio availability, and a repeated new-game cycle.
        await page.setViewportSize({ width: 1440, height: 1050 });
        await page.getByRole('button', { name: /How to play/ }).click();
        assert.equal(await page.locator('#rules-dialog').isVisible(), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#rules-dialog').isVisible(), false);
        await page.getByRole('button', { name: 'Sound off', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: 'Sound on', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.getByRole('button', { name: 'Sound on', exact: true }).click();
        // Complete games through visible controls; opponents use the real scheduler.
        for (const [count, mode] of [[2, 'local'], [3, 'local'], [2, 'computer']]) {
            await newGame(count, mode);
            await page.evaluate(() => {
                let seed = 41;
                gameManager.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
                const original = window.setTimeout;
                window.setTimeout = (fn, delay, ...args) => original(fn, delay >= 1000 && delay <= 2000 ? 20 : delay, ...args);
            });
            let moves = 0;
            while (await page.evaluate(() => gameManager.phase !== 'GAME_OVER')) {
                assert.ok(moves++ < 900);
                if (await page.evaluate(() => gameManager.player.computer)) { await page.waitForTimeout(50); continue; }
                await ready();
                const phase = await page.evaluate(() => gameManager.phase);
                if (phase === 'REVIEW') {
                    const choices = page.locator('.choice');
                    if (await choices.count()) await choices.last().click();
                    else await page.locator('#actions button').first().click();
                } else if (phase === 'DECISION') await page.getByRole('button', { name: /^Bank / }).click();
                else if (phase !== 'GAME_OVER') await page.locator('#actions button').first().click();
            }
            assert.ok(await page.locator('#victory-replay').isVisible());
            assert.equal(await page.locator('#victory-name').textContent(), await page.evaluate(() => gameManager.players[gameManager.winner].name + ' wins!'));
            console.log('Complete browser game:', count, mode, 'steps:', moves);
        }
        await page.screenshot({ path: path.join(screenshots, '05-game-complete.png'), fullPage: true });
        assert.deepEqual(errors, []);
        console.log('Browser checks passed: pairing, extension + switch, recycled dice, reported triple-switch continuation, all enhancements, turn resets, Critical Mass, six viewport sizes, audio toggle, dialogs, and complete games. No page errors.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

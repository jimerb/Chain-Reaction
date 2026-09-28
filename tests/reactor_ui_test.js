'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : process.platform === 'win32' ? { channel: 'chrome' } : {}) });
    const screenshots = path.join(__dirname, 'screenshots');
    fs.mkdirSync(screenshots, { recursive: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(process.env.TEST_URL || 'http://localhost:8000');
        await page.getByRole('button', { name: 'Take your seats' }).click();
        assert.equal(await page.locator('.player-card .engage-button').count(), 6, 'Three reactor controls per player');
        assert.deepEqual(await page.locator('.engage-button').allTextContents(), Array(6).fill('Engage'));
        assert.equal(await page.locator('#enhancement-panel, #enhancements').count(), 0, 'Duplicate controls below the board are removed');
        const reason = type => page.locator('#' + type + '-button').evaluate(el => el.parentElement.dataset.reason);
        assert.match(await reason('enrichment'), /Roll first/);
        await page.evaluate(() => { gameManager.roll([2, 2, 3, 4, 5]); render(); });
        assert.equal(await page.locator('.player-card:not(.current) button:enabled').count(), 0);
        const beforeInactive = await page.evaluate(() => JSON.stringify(gameManager));
        await page.locator('.player-card:not(.current) [data-token="enrichment"] button').dispatchEvent('click');
        assert.equal(await page.evaluate(() => JSON.stringify(gameManager)), beforeInactive, 'Another player’s controls cannot operate the active reactor');
        assert.equal(await page.locator('#enhancement-picker').isVisible(), false);
        assert.match(await reason('controlRod'), /Choose a chain first/);
        await page.getByRole('button', { name: /CHOOSE CHAIN: 2 × 2/ }).click();
        assert.match(await reason('controlRod'), /no chain match/);
        assert.match(await reason('fusion'), /newly rolled pair/);
        await page.locator('#enrichment-button').click();
        assert.equal(await page.locator('#enhancement-picker').evaluate(el => el.matches(':modal')), true);
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        assert.equal(await page.locator('#enrichment-button').evaluate(el => el === document.activeElement), true);
        assert.equal(await page.evaluate(() => gameManager.player.tokens.enrichment), true);
        await page.locator('#enrichment-button').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#enhancement-picker').isVisible(), false);
        await page.locator('#enrichment-button').click();
        await page.getByRole('button', { name: 'Die 3: 3 → 2', exact: true }).click();
        assert.match(await reason('enrichment'), /Already used/);
        assert.match(await reason('fusion'), /already used this roll/);
        assert.match(await page.locator('.current [data-token="enrichment"]').getAttribute('aria-label'), /Already used/);
        assert.equal(await page.locator('.current [data-token="enrichment"]').getAttribute('class'), 'spent');
        await page.evaluate(() => { gameManager.roll([3, 4]); render(); });
        assert.equal(await page.locator('#controlRod-button').isEnabled(), true);
        assert.match(await reason('enrichment'), /Already used/);
        await page.locator('#controlRod-button').click();
        assert.match(await reason('controlRod'), /Already used/);
        assert.match(await reason('fusion'), /Turn complete/);
        assert.equal(await page.locator('.engage-button:enabled').count(), 0);

        // A score update must reuse the dial, so its needle can sweep between readings.
        await page.evaluate(() => { window.savedGauge = document.querySelector('.pressure-gauge'); gameManager.players[0].score = 48; gameManager.players[1].score = 64; render(); });
        assert.equal(await page.evaluate(() => savedGauge === document.querySelector('.pressure-gauge')), true);
        assert.equal(await page.locator('[role="meter"]').first().getAttribute('aria-valuenow'), '48');
        await page.screenshot({ path: path.join(screenshots, 'reactor-desktop.png'), fullPage: true });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const needle = page.locator('.gauge-needle').first();
        const before = await needle.evaluate(el => getComputedStyle(el).transform);
        await page.evaluate(() => { gameManager.players[0].score = 90; render(); });
        await page.waitForTimeout(250);
        const during = await needle.evaluate(el => getComputedStyle(el).transform);
        await page.waitForTimeout(800);
        const after = await needle.evaluate(el => getComputedStyle(el).transform);
        assert.notEqual(before, during, 'Needle moves from the previous score');
        assert.notEqual(during, after, 'Needle sweeps rather than snapping to its new reading');
        await page.emulateMedia({ reducedMotion: 'reduce' });

        for (const target of [50, 100, 200]) {
            await page.evaluate(target => {
                gameManager = new GameManager({ names: ['Jim', 'Ada'], target });
                window.gameManager = gameManager;
                gameManager.players[0].score = target + 7;
                render();
            }, target);
            const gauge = page.locator('[role="meter"]').first();
            assert.equal(await gauge.getAttribute('aria-valuemax'), String(target));
            assert.equal(await gauge.getAttribute('aria-valuenow'), String(target));
            assert.match(await gauge.getAttribute('aria-valuetext'), new RegExp(`${target + 7} points`));
            assert.equal(await page.locator('.gauge-target').first().textContent(), 'TARGET ' + target);
            assert.equal(await page.locator('.gauge-scale').nth(4).textContent(), String(target));
            assert.equal(await page.locator('.player-score').first().textContent(), String(target + 7));
        }
        await page.evaluate(() => {
            gameManager = new GameManager({ names: ['Jim', 'Ada'], enhancements: false });
            window.gameManager = gameManager;
            render();
        });
        assert.match(await reason('enrichment'), /off for this game/);
        assert.match(await page.locator('[data-token="enrichment"]').first().getAttribute('aria-label'), /Off for this game/);

        for (const count of [2, 5]) {
            await page.evaluate(count => {
                gameManager = new GameManager({ names: Array.from({ length: count }, (_, i) => 'Reactor operator ' + (i + 1)) });
                window.gameManager = gameManager;
                gameManager.players.forEach((p, i) => { p.score = 48 + i * 8; });
                gameManager.players[0].tokens.enrichment = false;
                render();
            }, count);
            for (const width of [1440, 1024, 768, 390, 320]) {
                await page.setViewportSize({ width, height: 1050 });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${count} players at ${width}: no page overflow`);
                assert.equal(await page.locator('[role="meter"]').count(), count);
                assert.equal(await page.locator('.token-led').count(), count * 3);
                if (width === 390) await page.screenshot({ path: path.join(screenshots, `reactor-mobile-${count}.png`), fullPage: true });
            }
            await page.evaluate(() => { gameManager.current = gameManager.players.length - 1; render(); });
            const visibleCurrent = await page.locator('.player-card.current').evaluate(card => {
                const rect = card.getBoundingClientRect(), board = card.parentElement.getBoundingClientRect();
                return rect.left >= board.left - 1 && rect.right <= board.right + 1;
            });
            assert.equal(visibleCurrent, true, 'The current player is visible in the phone scoreboard after a turn change');
        }
        assert.deepEqual(errors, []);
        console.log('Reactor UI passed: enhancement reasons, token LEDs, persistent gauges, all targets, overshoot, and 2/5-player responsive layouts.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

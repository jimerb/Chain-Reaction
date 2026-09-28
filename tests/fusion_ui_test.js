'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : process.platform === 'win32' ? { channel: 'chrome' } : {}) });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(process.env.TEST_URL || 'http://localhost:8000');
        await page.getByRole('button', { name: 'Take your seats' }).click();
        async function ada(roll) {
            await page.evaluate(roll => {
                clearTimeout(computerTimer);
                gameManager = new GameManager({ names: ['Jim', 'Ada'], computers: true });
                window.gameManager = gameManager;
                gameManager.current = 1;
                gameManager.roll([5, 5, 1, 2, 3]); gameManager.choose(5); gameManager.roll(roll);
                render();
            }, roll);
        }
        await ada([6, 2, 3]);
        assert.equal(await page.evaluate(() => gameManager.canUse('fusion')), false);
        assert.notEqual(await page.evaluate(() => computerAction(gameManager).type), 'fusion');
        assert.equal(await page.evaluate(() => gameManager.fusion(6)), false);
        assert.equal(await page.evaluate(() => gameManager.player.tokens.fusion), true);
        const wrapper = page.locator('.enhancement-help').filter({ has: page.locator('#fusion-button') });
        await wrapper.hover();
        assert.equal(await page.locator('#enhancement-tooltip').isVisible(), true, 'Disabled enhancements still show hover help');
        assert.match(await page.locator('#enhancement-tooltip').textContent(), /at least two matching dice/);
        assert.match(await page.locator('#enhancement-tooltip').textContent(), /NOT valid/);
        await page.mouse.move(0, 0); await wrapper.focus();
        assert.equal(await page.locator('#enhancement-tooltip').isVisible(), true, 'Help is keyboard accessible');
        for (const [type, phrase] of [['enrichment', /Change one eligible die/], ['controlRod', /no match to your held chain/]]) {
            const help = page.locator('.enhancement-help').filter({ has: page.locator('#' + type + '-button') });
            await help.focus();
            assert.equal(await page.locator('#enhancement-tooltip').isVisible(), true);
            assert.match(await page.locator('#enhancement-tooltip').textContent(), phrase);
        }
        await page.getByRole('button', { name: /How to play/ }).click();
        const rules = await page.locator('#rules-dialog').textContent();
        assert.match(rules, /two different matching strands/);
        assert.match(rules, /One pair and unrelated single dice cannot be fused/);
        await page.getByRole('button', { name: 'Close rules', exact: true }).click();
        await ada([6, 6, 2]);
        assert.deepEqual(await page.evaluate(() => computerAction(gameManager)), { type: 'fusion', value: 6 });
        await page.evaluate(async () => { await act(computerAction(gameManager), true); clearTimeout(computerTimer); });
        assert.equal(await page.evaluate(() => gameManager.result.points), 22);
        assert.deepEqual(await page.locator('.fusion-strand').evaluateAll(groups => groups.map(g => [...g.querySelectorAll('.die')].map(d => d.children[2].querySelectorAll('.pip').length))), [[5, 5], [6, 6]]);
        assert.match(await page.locator('#decision-detail').textContent(), /unmatched dice do not score/);
        assert.match(await page.locator('#history').textContent(), /Fusion · 2 × 5 \+ 2 × 6/);
        fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
        await page.screenshot({ path: path.join(__dirname, 'screenshots', 'fusion-strands-desktop.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 950 });
        await wrapper.scrollIntoViewIfNeeded(); await wrapper.hover();
        const rect = await page.locator('#enhancement-tooltip').boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= 390, 'Phone tooltip stays inside the viewport');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: path.join(__dirname, 'screenshots', 'fusion-tooltip-mobile.png'), fullPage: true });
        assert.deepEqual(errors, []);
        console.log('Fusion browser checks passed: Ada rejects singles, scores two real pairs, shows both strands, and explains all enhancements through hover, keyboard help, and rules.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

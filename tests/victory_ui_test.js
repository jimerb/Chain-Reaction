'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : process.platform === 'win32' ? { channel: 'chrome' } : {}) });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(process.env.TEST_URL || 'http://localhost:8000');
        await page.getByRole('button', { name: 'Take your seats' }).click();
        await page.getByRole('button', { name: 'Sound on', exact: true }).click();
        // Score through the real Bank control. Even with reduced motion enabled,
        // the instrument must show intermediate readings instead of jumping.
        for (const motion of ['no-preference', 'reduce']) {
            await page.emulateMedia({ reducedMotion: motion });
            await page.evaluate(() => {
                gameManager = new GameManager(); window.gameManager = gameManager;
                gameManager.roll([6, 6, 1, 2, 3]); gameManager.choose(6); render();
            });
            const angle = () => page.locator('.gauge-needle').first().evaluate(el => {
                const matrix = new DOMMatrix(getComputedStyle(el).transform);
                return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
            });
            assert.ok(Math.abs(await angle() + 135) < .1);
            await page.getByRole('button', { name: 'Bank 12 points', exact: true }).click();
            await page.waitForTimeout(180);
            const early = await angle();
            await page.waitForTimeout(300);
            const middle = await angle();
            assert.ok(early > -135 && early < middle && middle < -102.6, `${motion}: the needle rises through intermediate positions`);
            await page.waitForTimeout(1300);
            assert.ok(Math.abs(await angle() + 102.6) < .1, `${motion}: the needle settles on the correct score`);
        }
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate(() => {
            window.fanfareCalls = 0;
            const fanfare = diceController.victoryFanfare.bind(diceController);
            diceController.victoryFanfare = () => { window.fanfareCalls++; fanfare(); };
            gameManager = new GameManager({ names: ['Jim', 'Ada'], target: 50 }); window.gameManager = gameManager;
            gameManager.players[0].score = 44;
            gameManager.roll([5, 5, 1, 2, 3]); gameManager.choose(5); render();
        });
        await page.getByRole('button', { name: 'Bank 10 points', exact: true }).click();
        assert.equal(await page.locator('#victory-dialog').isVisible(), false, 'Reaching the target must still finish the round');
        await page.getByRole('button', { name: 'Next · Ada', exact: true }).click();
        await page.evaluate(() => { gameManager.roll([2, 2, 1, 3, 4]); gameManager.choose(2); render(); });
        await page.getByRole('button', { name: 'Bank 4 points', exact: true }).click();
        assert.equal(await page.locator('#victory-dialog').evaluate(el => el.matches(':modal')), true);
        assert.equal(await page.locator('#victory-name').textContent(), 'Jim wins!', 'Announce the winner, not the last player to act');
        assert.equal(await page.locator('#victory-score').textContent(), '54');
        assert.deepEqual(await page.locator('#victory-ranks strong').allTextContents(), ['54', '4']);
        assert.equal(await page.evaluate(() => fanfareCalls), 1);
        assert.equal(await page.evaluate(() => diceController.fanfareNotes.length), 0, 'Sound off stays silent');
        fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(__dirname, 'screenshots', 'victory-desktop.png') });
        await page.locator('#victory-review').click();
        await page.evaluate(() => render());
        assert.equal(await page.locator('#victory-dialog').isVisible(), false, 'Reviewing does not retrigger the fanfare');
        assert.equal(await page.evaluate(() => fanfareCalls), 1);
        await page.getByRole('button', { name: 'Sound off', exact: true }).click();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => {
            gameManager = new GameManager({ names: ['Jim', 'Ada', 'Nova', 'Atlas', 'Reactor Champion'], target: 50 }); window.gameManager = gameManager;
            gameManager.current = 4; gameManager.players[4].score = 45;
            gameManager.roll([6, 6, 6, 6, 6]); render();
        });
        assert.equal(await page.evaluate(() => diceController.fanfareNotes.length), 7, 'Sound on plays the reactor chime');
        assert.equal(await page.locator('#victory-name').textContent(), 'Reactor Champion wins!');
        assert.equal(await page.locator('#victory-dialog').evaluate(el => el.scrollTop), 0, 'Phone victory opens at the winner announcement, not the bottom buttons');
        assert.equal(await page.locator('#victory-name').evaluate(el => el === document.activeElement), true);
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            assert.equal(await page.locator('#victory-dialog').evaluate(el => el.scrollWidth <= el.clientWidth), true);
            assert.equal(await page.locator('#victory-ranks li').count(), 5);
            await page.screenshot({ path: path.join(__dirname, 'screenshots', `victory-mobile-${width}.png`) });
        }
        await page.locator('#victory-replay').click();
        assert.equal(await page.locator('#setup-screen').isVisible(), true);
        assert.equal(await page.locator('#victory-dialog').isVisible(), false);
        assert.equal(await page.evaluate(() => diceController.fanfareNotes.length), 0);
        assert.deepEqual(errors, []);
        console.log('Victory checks passed: real bank needle sweeps in both motion settings, final-round timing, correct winner, single fanfare, sound toggle, standings, phone layouts, review and replay.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

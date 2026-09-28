'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GameManager } = require('../gameManager');
const { computerAction } = require('../enhancementController');
const game = (options = {}) => new GameManager({ ...options });
const chain = (roll = [3, 3, 1, 2, 6], value = 3, options) => { const g = game(options); g.roll(roll); g.choose(value); return g; };

test('all opening pairings remain selectable, including the smaller high-value pair', () => {
    const g = game(); g.roll([2, 2, 2, 6, 6]);
    assert.deepEqual(g.choices().map(c => [c.value, c.count, c.score]), [[2, 3, 6], [6, 2, 12]]);
    g.choose(6); assert.equal(g.chainScore, 12); assert.equal(g.available.length, 3);
});
test('extension AND replacement pair are offered together', () => {
    const g = chain(); g.roll([3, 5, 5]);
    assert.deepEqual(g.choices().map(c => [c.kind, c.value, c.score]), [['keep', 3, 9], ['switch', 5, 10]]);
    g.choose(3); assert.equal(g.held.length, 3); assert.equal(g.available.length, 2);
});
test('switching releases the old pair and offers another roll', () => {
    const g = chain(); g.roll([5, 5, 2]); g.choose(5);
    assert.equal(g.chainScore, 10); assert.equal(g.available.length, 3);
    assert.equal(g.phase, 'DECISION'); assert.equal(g.player.score, 0);
    g.roll([5, 1, 2]); g.choose(5);
    assert.equal(g.phase, 'DECISION'); assert.equal(g.chainScore, 15);
    g.bank(); assert.equal(g.player.score, 15);
});
test('newly rolled match stays available when choosing a different pair', () => {
    const g = chain(); g.roll([3, 5, 5]); g.choose(5);
    assert.deepEqual(g.available.map(d => d.value), [3, 3, 3]);
    assert.deepEqual(g.available.map(d => d.id), [0, 1, 2]);
});
test('a miss cannot keep or bank an unchanged chain', () => {
    const g = chain(); g.roll([5, 5, 2]);
    assert.equal(g.choose(3), false); assert.equal(g.bank(), false);
    assert.equal(g.canUse('controlRod'), true); g.fail(); assert.equal(g.player.score, 0);
});
test('held values alone do not count as matches in a new roll', () => {
    const g = chain(); g.roll([1, 2, 4]); assert.equal(g.choices().length, 0);
    assert.equal(g.phase, 'REVIEW'); g.fail(); assert.equal(g.result.title, 'Meltdown');
});
test('radiation leak can be rescued with an explicitly chosen face', () => {
    const g = game(); g.roll([1, 2, 3, 4, 6]);
    assert.equal(g.canUse('enrichment'), true);
    assert.equal(g.canUse('controlRod'), false); assert.equal(g.canUse('fusion'), false);
    g.enrich(0, 6); assert.deepEqual(g.choices().map(c => c.value), [6]);
    g.choose(6); g.bank(); assert.equal(g.player.score, 12);
});
test('leaks deduct ten and scores cannot go below zero', () => {
    for (const [start, expected] of [[0, 0], [7, 0], [20, 10]]) {
        const g = game(); g.player.score = start; g.roll([1, 2, 3, 4, 5]); g.fail(); assert.equal(g.player.score, expected);
    }
});
test('meltdowns preserve earlier banked scores', () => {
    const g = chain(); g.player.score = 30; g.roll([1, 2, 4]); g.fail(); assert.equal(g.player.score, 30);
});
test('Enrichment prevents meltdown and counts exactly one die', () => {
    const g = chain(); g.roll([1, 2, 4]); assert.equal(g.enrich(2, 3), true);
    assert.equal(g.canUse('controlRod'), false); g.choose(3);
    assert.equal(g.chainScore, 9); assert.equal(g.player.tokens.enrichment, false);
});
test('Enrichment cannot alter held dice, unrolled released dice, or arbitrary target faces', () => {
    const g = chain(); assert.equal(g.enrich(0, 3), false); assert.equal(g.enrich(2, 6), false);
    g.roll([5, 5, 2]); g.choose(5); assert.equal(g.enrich(0, 5), false);
    assert.equal(g.player.tokens.enrichment, true);
});
test('one enhancement per roll, but a different enhancement can be used on a later roll', () => {
    const g = chain([5, 5, 6, 6, 1], 5); g.enrich(4, 5);
    assert.equal(g.canUse('fusion'), false); assert.equal(g.player.tokens.fusion, true);
    g.roll([6, 6]); assert.equal(g.canUse('fusion'), true); g.fusion(6);
    assert.equal(g.player.score, 27); assert.equal(g.player.tokens.fusion, false);
});
test('Control Rod banks precisely the chain held before the missed roll', () => {
    const g = chain([6, 6, 6, 6, 1], 6); g.roll([1]); g.controlRod();
    assert.equal(g.player.score, 24); assert.equal(g.phase, 'TURN_END'); assert.equal(g.roll([6]), false);
});
test('Fusion includes new matches plus the selected replacement pair', () => {
    const g = chain(); g.roll([3, 6, 6]); g.fusion(6); assert.equal(g.player.score, 21);
    assert.equal(g.result.title, 'Fusion'); assert.equal(g.phase, 'TURN_END');
});
test('opening split can fuse after choosing a chain', () => {
    const g = chain([2, 2, 2, 6, 6], 2); assert.equal(g.canUse('fusion'), true); g.fusion(6); assert.equal(g.player.score, 18);
});
test('Fusion rejects a pair plus singles for Ada without spending a token or scoring', () => {
    for (const later of [false, true]) {
        const g = game({ names: ['Jim', 'Ada'], computers: true }); g.current = 1;
        g.roll([5, 5, 6, 2, 3]); g.choose(5);
        if (later) g.roll([6, 2, 3]);
        const before = JSON.stringify(g);
        assert.equal(g.canUse('fusion'), false);
        for (let face = 1; face <= 6; face++) assert.equal(g.fusion(face), false);
        assert.equal(JSON.stringify(g), before, 'Rejected Fusion must leave the entire state unchanged');
        assert.notEqual(computerAction(g).type, 'fusion');
    }
});
test('Fusion requires two actual matching strands and records exactly which dice scored', () => {
    const g = chain([5, 5, 1, 2, 3], 5);
    g.roll([6, 6, 2]);
    assert.equal(g.fusion(6), true);
    assert.equal(g.result.points, 22);
    assert.deepEqual(g.result.strands, [{ value: 5, ids: [0, 1] }, { value: 6, ids: [2, 3] }]);
    const result = JSON.stringify(g.result);
    g.nextTurn();
    assert.equal(JSON.stringify(g.history[0]), result, 'Evidence survives turn handoff');
    const malformed = chain([5, 5, 6, 6, 2], 5);
    malformed.dice[1].state = 'active';
    assert.equal(malformed.canUse('fusion'), false, 'A single held die is not a first strand');
});
test('Ada can only fuse genuine different pairs across every continuation roll', () => {
    let examined = 0;
    for (let face = 1; face <= 6; face++) {
        for (const heldCount of [2, 3, 4]) {
            const other = face % 6 + 1;
            const opening = Array(heldCount).fill(face).concat(Array(5 - heldCount).fill(other));
            for (let n = 0; n < 6 ** (5 - heldCount); n++) {
                let code = n;
                const values = Array.from({ length: 5 - heldCount }, () => { const value = code % 6 + 1; code = Math.floor(code / 6); return value; });
                const g = chain(opening, face, { computers: true }); g.current = 1;
                g.roll(values);
                const secondFaces = [...new Set(values)].filter(v => v !== face && values.filter(x => x === v).length >= 2);
                assert.equal(g.canUse('fusion'), g.phase === 'REVIEW' && secondFaces.length > 0);
                const action = computerAction(g);
                if (action?.type === 'fusion') {
                    assert.ok(secondFaces.includes(action.value));
                    assert.equal(g.fusion(action.value), true);
                    assert.ok(g.result.strands.every(s => s.ids.length >= 2 && s.ids.every(id => g.dice[id].value === s.value)));
                    assert.equal(new Set(g.result.strands.flatMap(s => s.ids)).size, g.result.strands.flatMap(s => s.ids).length);
                }
                examined++;
            }
        }
    }
    assert.equal(examined, 1548);
});
test('released old faces cannot immediately count as a fresh Fusion pair', () => {
    const g = chain(); g.roll([5, 5, 2]); g.choose(5);
    assert.equal(g.canUse('fusion'), false); assert.equal(g.fusion(3), false);
});
test('Critical Mass automatically scores and ends opening or later turns', () => {
    const g = game(); g.roll([6, 6, 6, 6, 6]); assert.equal(g.player.score, 30); assert.equal(g.phase, 'TURN_END');
    assert.equal(g.bank(), false); assert.equal(g.player.score, 30);
    const later = chain([4, 4, 4, 4, 1], 4); later.roll([4]); assert.equal(later.player.score, 20); assert.equal(later.result.title, 'Critical Mass');
});
test('three of a kind is not Critical Mass', () => {
    const g = game(); g.roll([3, 3, 3, 1, 2]); assert.equal(g.phase, 'REVIEW'); assert.equal(g.player.score, 0);
});
test('enrichment can complete five of a kind', () => {
    const g = chain([4, 4, 4, 4, 1], 4); g.enrich(4, 4); assert.equal(g.player.score, 20); assert.equal(g.phase, 'TURN_END');
});
test('switching from a triple to a pair releases three dice without banking', () => {
    const g = chain([3, 3, 3, 1, 2], 3); g.roll([6, 6]); g.choose(6);
    assert.equal(g.player.score, 0); assert.equal(g.phase, 'DECISION');
    assert.equal(g.chainScore, 12); assert.equal(g.available.length, 3);
});
test('reported case: pair of twos switches to three threes and can keep rolling', () => {
    const g = chain([2, 2, 1, 4, 6], 2);
    g.roll([3, 3, 3]); g.choose(3);
    assert.equal(g.phase, 'DECISION'); assert.equal(g.chainScore, 9);
    assert.deepEqual(g.held.map(d => d.value), [3, 3, 3]);
    assert.deepEqual(g.available.map(d => d.id), [0, 1]);
    assert.equal(g.player.score, 0); assert.equal(g.player.turns, 0); assert.equal(g.current, 0);
    assert.equal(g.canUse('fusion'), false); assert.equal(g.canUse('enrichment'), false);
    assert.equal(g.roll([3, 6]), true); g.choose(3);
    assert.equal(g.chainScore, 12); assert.equal(g.available.length, 1);
    g.bank(); assert.equal(g.player.score, 12);
});
test('successive switches recycle all five dice and still permit fresh Fusion after reroll', () => {
    const g = chain([2, 2, 1, 4, 6], 2);
    g.roll([3, 3, 3]); g.choose(3);
    g.roll([4, 4]); g.choose(4);
    assert.equal(g.chainScore, 8); assert.equal(g.available.length, 3);
    g.roll([5, 5, 5]); g.choose(5);
    assert.equal(g.chainScore, 15); assert.equal(g.available.length, 2);
    g.roll([6, 6]); assert.equal(g.canUse('fusion'), true); g.fusion(6);
    assert.equal(g.player.score, 27); assert.equal(g.phase, 'TURN_END');
});
test('turn transition clears dice state, keeps scores and spent tokens, and advances once', () => {
    const g = chain(); g.enrich(2, 3); g.bank(); g.nextTurn();
    assert.equal(g.current, 1); assert.equal(g.held.length, 0); assert.equal(g.available.length, 5);
    assert.equal(g.players[0].score, 9); assert.equal(g.players[0].tokens.enrichment, false);
    assert.equal(g.enhancementUsed, false); assert.equal(g.nextTurn(), false);
});
test('equal-turn final round gives later players their turn', () => {
    const g = game({ target: 50 }); g.players[0].score = 45;
    g.roll([3, 3, 1, 2, 4]); g.choose(3); g.bank();
    assert.equal(g.finalRound, true); assert.equal(g.phase, 'TURN_END'); g.nextTurn();
    g.roll([6, 6, 6, 6, 6]); assert.equal(g.phase, 'GAME_OVER'); assert.equal(g.winner, 0);
    assert.deepEqual(g.players.map(p => p.turns), [1, 1]);
});
test('last player reaching target does not give earlier players extra turns', () => {
    const g = game({ target: 50 }); g.players[1].score = 45;
    g.roll([1, 2, 3, 4, 5]); g.fail(); g.nextTurn();
    g.roll([3, 3, 1, 2, 4]); g.choose(3); g.bank();
    assert.equal(g.phase, 'GAME_OVER'); assert.equal(g.winner, 1);
});
test('ties play full rounds between leaders, with no reset of tokens', () => {
    const g = game({ target: 50, names: ['A', 'B', 'C'] }); g.players[0].score = 45; g.players[1].score = 45;
    for (let i = 0; i < 2; i++) { g.roll([3, 3, 1, 2, 4]); g.choose(3); g.bank(); g.nextTurn(); }
    g.roll([1, 2, 3, 4, 5]); g.fail();
    assert.equal(g.tieBreak, true); assert.deepEqual(g.contenders, [0, 1]); g.nextTurn(); assert.equal(g.current, 0);
    g.roll([6, 6, 6, 6, 6]); assert.equal(g.phase, 'TURN_END'); g.nextTurn();
    g.roll([1, 1, 1, 1, 1]); assert.equal(g.phase, 'GAME_OVER'); assert.equal(g.winner, 0);
});
test('survival probability counts replacement pairs, not just chain matches', () => {
    const g = chain(); assert.equal(g.survivalChance(), 156 / 216);
    const two = chain([3, 3, 3, 1, 2], 3); assert.equal(two.survivalChance(), 16 / 36);
    const one = chain([3, 3, 3, 3, 2], 3); assert.equal(one.survivalChance(), 1 / 6);
});
test('invalid actions and malformed rolls do not mutate state', () => {
    const g = game(); const snapshot = JSON.stringify(g);
    assert.equal(g.choose(6), false); assert.equal(g.bank(), false); assert.equal(g.controlRod(), false); assert.equal(g.fusion(6), false);
    assert.throws(() => g.roll([8])); assert.equal(JSON.stringify(g), snapshot);
});
test('all 7776 opening rolls have exactly all legal matching choices or a defined end', () => {
    let leaks = 0, critical = 0;
    for (let n = 0; n < 6 ** 5; n++) {
        let code = n;
        const values = Array.from({ length: 5 }, () => { const v = code % 6 + 1; code = Math.floor(code / 6); return v; });
        const g = game(); g.roll(values);
        const expected = [...new Set(values)].filter(v => values.filter(x => x === v).length >= 2).sort();
        if (g.phase === 'TURN_END') { critical++; assert.equal(new Set(values).size, 1); }
        else { assert.deepEqual(g.choices().map(c => c.value).sort(), expected); if (!expected.length) leaks++; }
        assert.equal(g.dice.length, 5);
    }
    assert.equal(leaks, 720); assert.equal(critical, 6);
});

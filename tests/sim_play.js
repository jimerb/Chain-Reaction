'use strict';
const assert = require('node:assert/strict');
const { GameManager } = require('../gameManager');
const { computerAction } = require('../enhancementController');
function rng(seed) { return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }; }
function apply(g, a) {
    const actions = { roll: () => g.roll(), next: () => g.nextTurn(), choose: () => g.choose(a.value), enrich: () => g.enrich(a.id, a.value),
        fusion: () => g.fusion(a.value), controlRod: () => g.controlRod(), bank: () => g.bank(), fail: () => g.fail() };
    assert.ok(actions[a.type]?.(), 'Action must be accepted: ' + JSON.stringify(a));
}
const stats = { games: 0, actions: 0, maxActions: 0, turns: 0, switches: 0, fusions: 0, enrichments: 0, meltdowns: 0, leaks: 0 };
for (let seed = 1; seed <= 1000; seed++) {
    const random = rng(seed);
    const g = new GameManager({ names: Array.from({ length: 2 + seed % 4 }, (_, i) => 'P' + i), target: [50, 100, 200][seed % 3], enhancements: seed % 4 !== 0, random });
    let actions = 0;
    while (g.phase !== 'GAME_OVER') {
        assert.ok(actions++ < 12000, 'Game must terminate: seed ' + seed);
        // Alternate competent play and adventurous random legal play to explore more transitions.
        let a = computerAction(g);
        if (seed % 2 === 0 && g.phase === 'REVIEW' && g.choices().length) {
            const choices = g.choices(); a = { type: 'choose', value: choices[Math.floor(random() * choices.length)].value };
        }
        if (seed % 2 === 0 && g.phase === 'DECISION' && random() < .5) a = { type: 'roll' };
        assert.ok(a, 'Every live state must have a legal action');
        if (a.type === 'choose' && g.choices().find(c => c.value === a.value)?.kind === 'switch') stats.switches++;
        let fusedScore;
        if (a.type === 'fusion') {
            stats.fusions++;
            const first = g.dice.filter(d => d.state === 'held' || (g.phase === 'REVIEW' && g.rolledIds.includes(d.id) && d.value === g.chain));
            const second = g.dice.filter(d => d.state === 'active' && g.rolledIds.includes(d.id) && d.value === a.value);
            assert.ok(first.length >= 2 && first.every(d => d.value === g.chain), 'Fusion first strand must match');
            assert.ok(second.length >= 2 && a.value !== g.chain, 'Fusion requires a different second pair');
            assert.equal(new Set([...first, ...second].map(d => d.id)).size, first.length + second.length, 'A die cannot score in both strands');
            fusedScore = first.length * g.chain + second.length * a.value;
        }
        if (a.type === 'enrich') stats.enrichments++;
        const beforeHeld = g.held.map(d => ({ ...d }));
        apply(g, a);
        if (a.type === 'fusion') assert.equal(g.result.points, fusedScore, 'Only the two matching strands score');
        assert.equal(g.dice.length, 5);
        assert.equal(new Set(g.dice.map(d => d.id)).size, 5);
        assert.ok(g.dice.every(d => d.value >= 1 && d.value <= 6 && ['held', 'active'].includes(d.state)));
        assert.equal(g.available.length + g.held.length, 5, 'Switching must never remove physical dice');
        assert.ok(g.players.every(p => Number.isInteger(p.score) && p.score >= 0));
        if (g.held.length) assert.ok(g.held.every(d => d.value === g.chain));
        if (a.type === 'roll') {
            beforeHeld.forEach(d => assert.deepEqual(g.dice[d.id], d, 'Held dice cannot roll'));
        }
        if (g.phase === 'TURN_END' || g.phase === 'GAME_OVER') {
            stats.turns++;
            if (g.result.title === 'Meltdown') stats.meltdowns++;
            if (g.result.title === 'Radiation leak') stats.leaks++;
        }
    }
    assert.ok(g.contenders.every(id => g.players[id].score <= g.players[g.winner].score));
    stats.games++; stats.actions += actions; stats.maxActions = Math.max(stats.maxActions, actions);
}
console.log(JSON.stringify(stats, null, 2));

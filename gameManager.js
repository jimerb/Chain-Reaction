/* The rules engine owns all dice, scoring and phase transitions. No DOM or timers. */
(function (root) {
    'use strict';
    const groups = dice => [...new Set(dice.map(d => d.value))].map(value => ({
        value, ids: dice.filter(d => d.value === value).map(d => d.id)
    })).filter(g => g.ids.length >= 2);
    const points = (value, count) => value * count;
    class GameManager {
        constructor({ names = ['Player 1', 'Player 2'], target = 100, enhancements = true, computers = false, random = Math.random } = {}) {
            if (names.length < 2 || names.length > 5 || ![50, 100, 200].includes(target)) throw new Error('Invalid game setup');
            this.players = names.map((name, id) => ({ id, name: String(name).trim().slice(0, 24) || ('Player ' + (id + 1)), score: 0, turns: 0,
                computer: computers && id > 0, tokens: { enrichment: enhancements, controlRod: enhancements, fusion: enhancements } }));
            this.target = target;
            this.random = random;
            this.current = 0;
            this.round = 1;
            this.finalRound = false;
            this.contenders = this.players.map(p => p.id);
            this.tieBreak = false;
            this.history = [];
            this.winner = null;
            this.resetTurn();
        }
        get player() { return this.players[this.current]; }
        get held() { return this.dice.filter(d => d.state === 'held'); }
        get available() { return this.dice.filter(d => d.state === 'active'); }
        get chainScore() { return points(this.chain, this.held.length); }
        get matches() { return this.available.filter(d => this.rolledIds.includes(d.id) && d.value === this.chain); }
        get alternatives() { return groups(this.available.filter(d => this.rolledIds.includes(d.id))).filter(g => g.value !== this.chain); }
        resetTurn() {
            this.dice = Array.from({ length: 5 }, (_, id) => ({ id, value: id + 1, state: 'active' }));
            this.chain = null;
            this.rolledIds = [];
            this.enhancementUsed = false;
            this.beforeRollScore = 0;
            this.rollNumber = 0;
            this.phase = 'READY';
            this.result = null;
        }
        roll(values) {
            if (!['READY', 'DECISION'].includes(this.phase) || !this.available.length) return false;
            const dice = this.available;
            const next = values || dice.map(() => 1 + Math.floor(this.random() * 6));
            if (next.length !== dice.length || !next.every(v => Number.isInteger(v) && v >= 1 && v <= 6)) throw new Error('A roll needs one d6 value per available die');
            this.beforeRollScore = this.chainScore;
            this.rolledIds = dice.map(d => d.id);
            this.enhancementUsed = false;
            this.rollNumber++;
            dice.forEach((d, i) => { d.value = next[i]; });
            this.phase = 'REVIEW';
            if (this.dice.every(d => d.value === this.dice[0].value)) {
                this.chain = this.dice[0].value;
                this.dice.forEach(d => { d.state = 'held'; });
                this.finish(this.chainScore, 'Critical Mass', 'All five dice matched. Your chain is banked.');
            }
            return true;
        }
        choices() {
            if (this.phase !== 'REVIEW') return [];
            const choices = this.alternatives.map(g => ({ value: g.value, count: g.ids.length, ids: g.ids, kind: this.chain ? 'switch' : 'start', score: points(g.value, g.ids.length) }));
            if (this.chain && this.matches.length) choices.unshift({ value: this.chain, count: this.held.length + this.matches.length,
                ids: this.matches.map(d => d.id), kind: 'keep', score: points(this.chain, this.held.length + this.matches.length) });
            return choices;
        }
        choose(value) {
            const choice = this.choices().find(c => c.value === value);
            if (!choice) return false;
            // Switching gives up the old chain's points, not its physical dice.
            // Released dice can roll again; rolledIds keeps their old faces from
            // becoming a fresh pair or enhancement target before that next roll.
            if (choice.kind === 'switch') this.held.forEach(d => { d.state = 'active'; });
            choice.ids.forEach(id => { this.dice[id].state = 'held'; });
            this.chain = value;
            this.phase = 'DECISION';
            this.finishIfFull();
            return true;
        }
        finishIfFull() {
            if (this.held.length === 5) this.finish(this.chainScore, 'Critical Mass', 'All five dice matched. Your chain is banked.');
        }
        bank() {
            if (this.phase !== 'DECISION') return false;
            this.finish(this.chainScore, 'Safely banked', this.held.length + ' × ' + this.chain + ' added to your score.');
            return true;
        }
        fail() {
            if (this.phase !== 'REVIEW') return false;
            if (this.chain && this.matches.length) return false;
            if (!this.chain && this.choices().length) return false;
            this.finish(this.chain ? 0 : -10, this.chain ? 'Meltdown' : 'Radiation leak', this.chain ? 'This turn scores zero. Previously banked points are safe.' : 'Five different numbers. Lose up to 10 banked points.');
            return true;
        }
        canUse(type) {
            if (!['REVIEW', 'DECISION'].includes(this.phase) || this.enhancementUsed || !this.player.tokens[type]) return false;
            if (type === 'enrichment') return this.enrichmentOptions().length > 0;
            if (type === 'controlRod') return this.phase === 'REVIEW' && this.chain !== null && this.matches.length === 0;
            if (type === 'fusion') return this.chain !== null && this.alternatives.length > 0;
            return false;
        }
        enrichmentOptions() {
            if (this.chain) return this.available.filter(d => this.rolledIds.includes(d.id) && d.value !== this.chain).map(d => ({ id: d.id, value: this.chain }));
            return this.available.flatMap(d => [...new Set(this.available.filter(other => other.id !== d.id && other.value !== d.value).map(other => other.value))].map(value => ({ id: d.id, value })));
        }
        spend(type) { this.player.tokens[type] = false; this.enhancementUsed = true; }
        enrich(id, value) {
            if (!this.canUse('enrichment') || !this.enrichmentOptions().some(o => o.id === id && o.value === value)) return false;
            this.spend('enrichment');
            this.dice[id].value = value;
            if (this.phase === 'DECISION') {
                this.dice[id].state = 'held';
                this.finishIfFull();
            }
            return true;
        }
        controlRod() {
            if (!this.canUse('controlRod')) return false;
            this.spend('controlRod');
            this.finish(this.beforeRollScore, 'Controlled shutdown', 'Saved the chain you held before this roll.');
            return true;
        }
        fusion(value) {
            if (!this.canUse('fusion')) return false;
            const other = this.alternatives.find(g => g.value === value);
            if (!other) return false;
            const count = this.held.length + (this.phase === 'REVIEW' ? this.matches.length : 0);
            const score = points(this.chain, count) + points(value, other.ids.length);
            this.spend('fusion');
            this.finish(score, 'Fusion', count + ' × ' + this.chain + ' + ' + other.ids.length + ' × ' + value + '. Both chains banked.');
            return true;
        }
        finish(score, title, detail) {
            if (['TURN_END', 'GAME_OVER'].includes(this.phase)) return;
            const before = this.player.score;
            this.player.score = Math.max(0, before + score);
            this.player.turns++;
            this.result = { player: this.player.name, playerId: this.current, round: this.round, title, detail, points: this.player.score - before };
            this.history.unshift({ ...this.result });
            this.history = this.history.slice(0, 40);
            if (this.player.score >= this.target) this.finalRound = true;
            this.phase = 'TURN_END';
            // Finish this round: every contender receives the same number of turns.
            if ((this.finalRound || this.tieBreak) && this.current === this.contenders.at(-1)) {
                const high = Math.max(...this.contenders.map(id => this.players[id].score));
                const leaders = this.contenders.filter(id => this.players[id].score === high);
                if (leaders.length === 1) { this.winner = leaders[0]; this.phase = 'GAME_OVER'; }
                else { this.contenders = leaders; this.tieBreak = true; }
            }
        }
        nextTurn() {
            if (this.phase !== 'TURN_END') return false;
            const index = this.contenders.indexOf(this.current);
            const next = index < 0 || index === this.contenders.length - 1 ? 0 : index + 1;
            if (next === 0) this.round++;
            this.current = this.contenders[next];
            this.resetTurn();
            return true;
        }
        rollOutlook() {
            const count = this.available.length;
            if (!this.chain || !count) return { survival: 0, expected: this.chainScore };
            let survive = 0, sum = 0;
            const total = 6 ** count;
            for (let n = 0; n < total; n++) {
                let code = n;
                const values = Array.from({ length: count }, () => { const v = code % 6 + 1; code = Math.floor(code / 6); return v; });
                const matches = values.filter(v => v === this.chain).length;
                let best = matches ? this.chain * (this.held.length + matches) : 0;
                for (const value of new Set(values)) {
                    const size = values.filter(v => v === value).length;
                    if (value !== this.chain && size >= 2) best = Math.max(best, value * size);
                }
                if (best > 0) survive++;
                sum += best;
            }
            return { survival: survive / total, expected: sum / total };
        }
        survivalChance() { return this.rollOutlook().survival; }
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { GameManager, groups, points };
    else root.GameManager = GameManager;
})(typeof window !== 'undefined' ? window : globalThis);

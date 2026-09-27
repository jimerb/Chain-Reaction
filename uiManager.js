/* UI is derived from the current engine state. Every action is explicit and keyboard accessible. */
(function (root) {
    const $ = id => document.getElementById(id);
    const text = (id, value) => { $(id).textContent = value; };
    function button(label, action, className = 'secondary') {
        const el = document.createElement('button'); el.type = 'button'; el.className = className;
        el.textContent = label; el.addEventListener('click', action); return el;
    }
    class UIManager {
        constructor(dice, act) { this.dice = dice; this.act = act; this.picker = null; }
        render(game, busy = false) {
            this.game = game;
            this.busy = busy;
            const computer = game.player.computer && game.phase !== 'GAME_OVER';
            $('game-screen').classList.toggle('winner', game.phase === 'GAME_OVER');
            text('round-label', 'R' + game.round);
            text('target-label', game.target);
            text('turn-label', (game.tieBreak ? 'TIEBREAK' : game.finalRound ? 'FINAL ROUND' : 'ROUND ' + game.round) + ' / TARGET ' + game.target);
            const ended = ['TURN_END', 'GAME_OVER'].includes(game.phase);
            text('player-heading', game.phase === 'GAME_OVER' ? game.players[game.winner].name + ' wins.' : game.player.name + (ended ? ' · turn complete' : computer ? ' is thinking…' : ', your move.'));
            text('chain-total', ended ? (game.result.points > 0 ? '+' : '') + game.result.points : game.chain ? game.chainScore : '—');
            document.querySelector('.turn-total > span').textContent = ended ? 'THIS TURN' : 'THIS CHAIN';
            document.querySelector('.turn-total > small').textContent = ended ? 'score change' : 'unbanked energy';
            text('roll-label', busy ? 'DICE IN MOTION' : game.rollNumber ? 'ROLL ' + game.rollNumber : 'READY TO ROLL');
            text('active-label', game.phase === 'READY' ? 'FIVE DICE · ONE DECISION' : game.available.length + (game.available.length === 1 ? ' DIE IN PLAY' : ' DICE IN PLAY'));
            text('held-label', game.chain ? 'YOUR CHAIN · ' + game.held.length + ' × ' + game.chain : 'YOUR CHAIN');
            text('table-note', 'Switching releases your old dice to roll again. Only your new chain scores.');
            this.renderScores(game);
            if (!busy) this.dice.render(game);
            $('choices').replaceChildren(); $('actions').replaceChildren();
            $('risk-note').textContent = '';
            this.picker = null;
            $('enhancement-picker').hidden = true;
            let title, detail, kicker = 'YOUR MOVE';
            const add = (label, action, css) => $('actions').append(button(label, () => this.act(action), css));
            if (busy) { title = 'Let them roll.'; detail = 'Only the available dice are rolling. Your chain stays put.'; }
            else if (game.phase === 'READY') {
                title = 'Start a reaction.'; detail = 'Roll five dice, then choose a matching pair or group.';
                add('Roll five dice', { type: 'roll' }, 'primary');
            } else if (game.phase === 'REVIEW') {
                const choices = game.choices();
                title = choices.length > 1 ? 'Choose your chain.' : choices.length ? (game.chain ? 'Your next move.' : 'A chain is waiting.') : game.chain ? 'No match. One last chance.' : 'A radiation leak.';
                detail = choices.length > 1 ? 'Compare the points and dice left. Only the chain you choose will count.' : choices.length ? (game.chain && !game.matches.length ? 'Your old chain missed. Switch to this pair, use an enhancement, or accept a meltdown.' : 'Select the matching group, then bank it or keep rolling.') : game.chain ? 'Use an available rescue enhancement, or accept a meltdown for zero this turn.' : 'Five different numbers cost 10 points. Enrichment can create a pair before the penalty.';
                choices.forEach(choice => {
                    const el = button('', () => this.act({ type: 'choose', value: choice.value }), 'choice');
                    const kind = document.createElement('span'); kind.className = 'choice-kind'; kind.textContent = choice.kind === 'keep' ? 'KEEP + EXTEND' : choice.kind === 'switch' ? 'SWITCH CHAIN' : 'CHOOSE CHAIN';
                    const dice = document.createElement('span'); dice.className = 'choice-dice'; dice.setAttribute('aria-hidden', 'true');
                    for (let i = 0; i < choice.count; i++) dice.append(makeDie(choice.value, i, 'choice-preview', false));
                    const score = document.createElement('span'); score.className = 'choice-score'; score.textContent = choice.score;
                    const unit = document.createElement('small'); unit.textContent = 'POINTS'; score.append(unit);
                    const info = document.createElement('small');
                    const left = 5 - choice.count;
                    info.textContent = left + (left === 1 ? ' die left' : ' dice left') + (choice.kind === 'switch' ? ' · old dice return to play' : ' · energy points');
                    info.className = 'choice-detail';
                    el.append(kind, dice, score, info); el.setAttribute('aria-label', kind.textContent + ': ' + choice.count + ' × ' + choice.value + ', ' + choice.score + ' points, ' + left + ' dice left');
                    $('choices').append(el);
                });
                if (!choices.length || (game.chain && !game.matches.length)) add(game.chain ? 'Accept meltdown · 0' : 'Accept leak · −10 max', { type: 'fail' }, 'danger');
                if (game.chain && !game.matches.length && choices.length) text('risk-note', 'Keeping an unmatched old chain would be a meltdown. Control Rod can bank it if available.');
            } else if (game.phase === 'DECISION') {
                title = 'Bank it. Or build it.'; detail = 'Your ' + game.held.length + ' ' + game.chain + 's are worth ' + game.chainScore + ' points. The next roll puts this chain at risk.';
                add('Bank ' + game.chainScore + ' points', { type: 'bank' }, 'primary');
                add('Roll ' + game.available.length + (game.available.length === 1 ? ' die' : ' dice'), { type: 'roll' }, 'secondary');
                text('risk-note', Math.round(game.survivalChance() * 100) + '% chance of a match or replacement pair · before enhancements. Switching may reduce your points.');
            } else if (game.phase === 'TURN_END' || game.phase === 'GAME_OVER') {
                kicker = game.phase === 'GAME_OVER' ? 'TABLE COMPLETE' : 'TURN COMPLETE';
                title = game.result.title + (game.result.points > 0 ? ' · +' + game.result.points : game.result.points < 0 ? ' · ' + game.result.points : ' · 0');
                detail = game.result.detail;
                if (game.phase === 'GAME_OVER') { detail += ' ' + game.players[game.winner].name + ' wins with ' + game.players[game.winner].score + ' points.'; add('Play again', { type: 'restart' }, 'primary'); }
                else {
                    const index = game.contenders.indexOf(game.current);
                    const next = game.contenders[(index + 1) % game.contenders.length];
                    add('Next · ' + game.players[next].name, { type: 'next' }, 'primary');
                    if (game.finalRound) text('risk-note', game.tieBreak ? 'Tied leaders play another complete round.' : 'Target reached. Finish this round so everyone has equal turns.');
                }
            }
            text('decision-kicker', computer && !busy ? 'COMPUTER TURN' : kicker);
            text('decision-title', title); text('decision-detail', detail);
            this.renderEnhancements(game);
            if (busy || computer) [...$('actions').querySelectorAll('button'), ...$('choices').querySelectorAll('button'), ...$('enhancements').querySelectorAll('button')].forEach(el => { el.disabled = true; });
        }
        renderScores(game) {
            $('scoreboard').replaceChildren();
            game.players.forEach(p => {
                const card = document.createElement('div'); card.className = 'player-card' + (p.id === game.current ? ' current' : '');
                if (p.id === game.current) card.setAttribute('aria-current', 'true');
                const row = document.createElement('div'); row.className = 'player-top';
                const identity = document.createElement('div');
                const num = document.createElement('div'); num.className = 'player-number'; num.textContent = (p.computer ? 'COMPUTER ' : 'PLAYER ') + (p.id + 1);
                const name = document.createElement('div'); name.className = 'player-name'; name.textContent = p.name; identity.append(num, name);
                const score = document.createElement('span'); score.className = 'player-score'; score.textContent = p.score;
                row.append(identity, score);
                const track = document.createElement('div'); track.className = 'score-track'; const progress = document.createElement('span'); progress.style.width = Math.min(100, p.score / game.target * 100) + '%'; track.append(progress);
                const tokens = document.createElement('div'); tokens.className = 'token-status';
                [['enrichment', 'ENR'], ['controlRod', 'ROD'], ['fusion', 'FUS']].forEach(([key, label]) => { const t = document.createElement('span'); t.textContent = label; t.className = p.tokens[key] ? '' : 'spent'; t.title = key + (p.tokens[key] ? ' available' : ' unavailable'); tokens.append(t); });
                card.append(row, track, tokens); $('scoreboard').append(card);
            });
            if (game.history.length) {
                $('history').replaceChildren();
                game.history.slice(0, 5).forEach(event => {
                    const li = document.createElement('li'), body = document.createElement('span'), name = document.createElement('b'), desc = document.createElement('small'), pts = document.createElement('span');
                    name.textContent = event.player; desc.textContent = event.title; pts.className = 'log-points'; pts.textContent = (event.points > 0 ? '+' : '') + event.points;
                    body.append(name, desc); li.append(body, pts); $('history').append(li);
                });
            } else { $('history').textContent = 'The first move is yours.'; }
        }
        renderEnhancements(game) {
            const data = [
                ['enrichment', 'E', 'Enrichment', 'Change one die to your chain.'],
                ['controlRod', 'Ⅱ', 'Control Rod', 'After a miss, bank your old chain.'],
                ['fusion', 'F', 'Fusion', 'Bank your chain + a new pair.']
            ];
            $('enhancements').replaceChildren();
            data.forEach(([type, icon, title, description]) => {
                const el = button('', () => {
                    if (type === 'controlRod') this.act({ type: 'controlRod' });
                    else this.showPicker(type);
                }, 'enhancement');
                el.id = type + '-button'; el.disabled = !game.canUse(type);
                const glyph = document.createElement('span'); glyph.className = 'token-icon'; glyph.textContent = icon;
                const body = document.createElement('span'), name = document.createElement('strong'), desc = document.createElement('small');
                name.textContent = title;
                desc.textContent = !game.player.tokens[type] ? 'Unavailable this game' : game.enhancementUsed ? 'One enhancement already used this roll' : description;
                body.append(name, desc); el.append(glyph, body); $('enhancements').append(el);
            });
        }
        showPicker(type) {
            const game = this.game;
            if (!game.canUse(type) || this.busy || game.player.computer) return;
            this.picker = type;
            const box = $('enhancement-picker'); box.replaceChildren(); box.hidden = false;
            const prompt = document.createElement('p');
            prompt.textContent = type === 'fusion' ? 'Choose the second pair to bank with your chain. This ends your turn.' : 'Choose exactly which die to change. The token is spent only when you confirm a change.';
            box.append(prompt);
            if (type === 'fusion') game.alternatives.forEach(g => {
                const count = game.held.length + (game.phase === 'REVIEW' ? game.matches.length : 0);
                box.append(button('Fuse ' + g.ids.length + ' × ' + g.value + ' · bank ' + (count * game.chain + g.ids.length * g.value), () => this.act({ type: 'fusion', value: g.value })));
            });
            else game.enrichmentOptions().forEach(o => box.append(button('Die ' + (o.id + 1) + ': ' + game.dice[o.id].value + ' → ' + o.value, () => this.act({ type: 'enrich', id: o.id, value: o.value }))));
            box.append(button('Cancel', () => { box.hidden = true; this.picker = null; $('enrichment-button').focus(); }, 'cancel'));
            box.querySelector('button').focus();
        }
    }
    root.UIManager = UIManager;
})(window);

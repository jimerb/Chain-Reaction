/* UI is derived from the current engine state. Every action is explicit and keyboard accessible. */
(function (root) {
    const $ = id => document.getElementById(id);
    const text = (id, value) => { $(id).textContent = value; };
    const enhancementRules = {
        enrichment: 'Change one eligible die from the latest roll to your chain’s number. Before choosing your first chain, change a die to another rolled number to make a pair. Held dice and dice just released by switching cannot be changed. Does not bank points unless it completes five matching dice.',
        controlRod: 'After a roll with no match to your held chain, bank the points that chain had before the roll. Ends your turn. Requires an existing chain; cannot rescue an opening radiation leak.',
        fusion: 'Join two different matching strands: your held chain of at least two dice, plus a newly rolled group of at least two matching dice of another number. For example, 5 + 5 and 6 + 6 bank 22 points. A pair plus unrelated single dice is NOT valid. Include new matches to your held chain; ignore unmatched dice. Banks both strands and ends your turn. Dice released by switching must be rerolled first.'
    };
    const enhancementTip = (type, status) => status + '\n\n' + enhancementRules[type] + '\n\nOnce per player per game. Only one enhancement per roll.';
    function button(label, action, className = 'secondary') {
        const el = document.createElement('button'); el.type = 'button'; el.className = className;
        el.textContent = label; el.addEventListener('click', action); return el;
    }
    class UIManager {
        constructor(dice, act) {
            this.dice = dice; this.act = act; this.picker = null;
            this.hideTip = () => { $('enhancement-tooltip').hidden = true; };
            window.addEventListener('resize', this.hideTip);
            window.addEventListener('scroll', this.hideTip, true);
            document.addEventListener('keydown', event => { if (event.key === 'Escape') this.hideTip(); });
            $('enhancement-picker').addEventListener('cancel', () => { this.picker = null; this.hideTip(); });
        }
        render(game, busy = false) {
            this.game = game;
            this.busy = busy;
            this.hideTip();
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
            if (game.result?.strands) {
                text('active-label', 'SECOND STRAND + UNUSED DICE');
                text('held-label', 'FIRST STRAND · ' + game.held.length + ' × ' + game.chain);
                text('table-note', 'Fusion banks both matching strands. Unmatched dice do not score.');
            }
            this.renderScores(game);
            if (!busy) this.dice.render(game);
            $('choices').replaceChildren(); $('actions').replaceChildren();
            $('risk-note').textContent = '';
            this.picker = null;
            $('enhancement-picker').close();
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
                if (game.result.strands) {
                    game.result.strands.forEach((strand, i) => {
                        const panel = document.createElement('div'); panel.className = 'fusion-strand';
                        const label = document.createElement('span'); label.className = 'choice-kind'; label.textContent = 'BANKED STRAND ' + (i + 1);
                        const dice = document.createElement('span'); dice.className = 'choice-dice'; dice.setAttribute('aria-hidden', 'true');
                        strand.ids.forEach(id => dice.append(makeDie(strand.value, id, 'choice-preview', false)));
                        const points = document.createElement('strong'); points.textContent = strand.ids.length * strand.value + ' points';
                        panel.setAttribute('aria-label', strand.ids.length + ' matching ' + strand.value + 's, ' + points.textContent);
                        panel.append(label, dice, points); $('choices').append(panel);
                    });
                }
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
            if (busy || computer) [...$('actions').querySelectorAll('button'), ...$('choices').querySelectorAll('button')].forEach(el => { el.disabled = true; });
            if (game.phase === 'GAME_OVER' && !busy && this.celebratedGame !== game) {
                this.celebratedGame = game;
                this.showVictory(game);
                this.dice.victoryFanfare();
            }
        }
        showVictory(game) {
            const winner = game.players[game.winner];
            text('victory-name', winner.name + ' wins!');
            text('victory-score', winner.score);
            text('victory-summary', (game.tieBreak ? 'Tiebreak complete.' : 'The final round is complete.') + ' The highest energy total takes the table.');
            $('victory-ranks').replaceChildren();
            [...game.players].sort((a, b) => b.score - a.score || a.id - b.id).forEach((p, i, sorted) => {
                const row = document.createElement('li'); row.className = p.id === game.winner ? 'champion' : '';
                const place = document.createElement('span'); place.className = 'victory-place'; place.textContent = String(sorted.findIndex(other => other.score === p.score) + 1).padStart(2, '0');
                const name = document.createElement('span'); name.textContent = p.name;
                const score = document.createElement('strong'); score.textContent = p.score;
                row.append(place, name, score); $('victory-ranks').append(row);
            });
            this.hideTip();
            $('enhancement-picker').close();
            $('victory-dialog').showModal();
            $('victory-name').focus({ preventScroll: true });
            $('victory-dialog').scrollTop = 0;
        }
        renderScores(game) {
            // Keep the instruments mounted so score changes animate from their previous readings.
            if (this.scoreGame !== game) {
                $('scoreboard').replaceChildren();
                this.scoreGame = game;
                this.scoreCards = new Map();
                this.scoreCurrent = null;
            }
            game.players.forEach(p => {
                let card = this.scoreCards.get(p.id);
                if (!card) {
                    card = document.createElement('div');
                    const uid = 'reactor-' + p.id;
                    const polar = (radius, degrees) => {
                        const a = degrees * Math.PI / 180;
                        return [110 + radius * Math.cos(a), 110 + radius * Math.sin(a)];
                    };
                    const arc = (radius, start, end) => {
                        const a = polar(radius, start), b = polar(radius, end);
                        return `M ${a.join(' ')} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${b.join(' ')}`;
                    };
                    const ticks = Array.from({ length: 41 }, (_, i) => {
                        const a = polar(i % 5 === 0 ? 72 : 77, 135 + i * 6.75), b = polar(82, 135 + i * 6.75);
                        return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="gauge-tick ${i % 5 === 0 ? 'major' : ''}"/>`;
                    }).join('');
                    const labels = [0, .25, .5, .75, 1].map(f => {
                        const [x, y] = polar(60, 135 + f * 270);
                        return `<text x="${x}" y="${y}" class="gauge-scale">${game.target * f}</text>`;
                    }).join('');
                    // This template contains only generated numbers and fixed labels; player names use textContent below.
                    card.innerHTML = `<div class="player-top"><div><div class="player-number"></div><div class="player-name"></div></div><span class="reactor-live" aria-hidden="true"></span></div>
                        <div class="pressure-gauge" role="meter" aria-valuemin="0" aria-valuemax="${game.target}">
                        <svg viewBox="0 0 220 220" aria-hidden="true">
                        <defs><linearGradient id="${uid}-metal" x2=".8" y2="1"><stop stop-color="#8b9990"/><stop offset=".3" stop-color="#34463f"/><stop offset=".65" stop-color="#182722"/><stop offset="1" stop-color="#738078"/></linearGradient>
                        <radialGradient id="${uid}-face" cx=".4" cy=".25" r=".8"><stop stop-color="#293d35"/><stop offset="1" stop-color="#0b1715"/></radialGradient></defs>
                        <circle cx="110" cy="110" r="106" fill="url(#${uid}-metal)" stroke="#758579" stroke-width="1"/>
                        <circle cx="110" cy="110" r="98" fill="url(#${uid}-face)" stroke="#0a1310" stroke-width="3"/>
                        <path d="${arc(88, 135, 405)}" class="gauge-track"/>
                        <path d="${arc(88, 351, 405)}" class="gauge-limit"/>
                        <path d="${arc(88, 135, 405)}" pathLength="100" class="gauge-charge"/>
                        ${ticks}${labels}
                        <text x="110" y="78" class="gauge-wordmark">REACTOR</text>
                        <g class="gauge-needle"><path d="M 107 117 L 110 40 L 113 117 Z"/><path d="M 110 111 L 110 48" class="needle-highlight"/></g>
                        <circle cx="110" cy="110" r="8" fill="url(#${uid}-metal)" stroke="#0b1715" stroke-width="2"/><circle cx="110" cy="110" r="2" fill="#d4ee8b"/>
                        <text x="110" y="156" class="player-score"></text><text x="110" y="172" class="gauge-unit">BANKED ENERGY</text>
                        <text x="110" y="188" class="gauge-target">TARGET ${game.target}</text></svg></div>
                        <div class="reactor-state"></div><div class="token-caption">ENHANCEMENTS · LIT = UNUSED</div><div class="token-status" aria-label="Enhancements remaining"></div>`;
                    card.querySelector('.player-number').textContent = (p.computer ? 'COMPUTER ' : 'PLAYER ') + (p.id + 1);
                    card.querySelector('.player-name').textContent = p.name;
                    [['enrichment', 'Enrichment'], ['controlRod', 'Control Rod'], ['fusion', 'Fusion']].forEach(([key, label]) => {
                        const t = document.createElement('span'); t.dataset.token = key;
                        const led = document.createElement('i'); led.className = 'token-led'; led.setAttribute('aria-hidden', 'true');
                        const caption = document.createElement('span'); caption.className = 'token-label'; caption.textContent = label;
                        const help = document.createElement('span'); help.className = 'enhancement-help';
                        const engage = button('Engage', () => {
                            if (p.id !== this.game.current || this.game.player.computer || this.busy || !this.game.canUse(key)) return;
                            this.hideTip();
                            if (key === 'controlRod') this.act({ type: key }); else this.showPicker(key);
                        }, 'engage-button');
                        engage.setAttribute('aria-label', 'Engage ' + label + ' for ' + p.name);
                        engage.setAttribute('aria-describedby', 'enhancement-tooltip');
                        help.addEventListener('mouseenter', () => this.showTip(help));
                        help.addEventListener('mouseleave', this.hideTip);
                        help.addEventListener('focusin', () => this.showTip(help));
                        help.addEventListener('focusout', this.hideTip);
                        help.append(engage); t.append(led, caption, help); card.querySelector('.token-status').append(t);
                    });
                    this.scoreCards.set(p.id, card); $('scoreboard').append(card);
                }
                card.className = 'player-card' + (p.id === game.current ? ' current' : '') + (p.score >= game.target ? ' target-reached' : '');
                if (p.id === game.current) card.setAttribute('aria-current', 'true'); else card.removeAttribute('aria-current');
                const fraction = Math.max(0, Math.min(1, p.score / game.target));
                const gauge = card.querySelector('.pressure-gauge');
                gauge.setAttribute('aria-label', p.name + ' banked energy');
                gauge.setAttribute('aria-valuenow', Math.min(p.score, game.target));
                gauge.setAttribute('aria-valuetext', p.score + ' points; target ' + game.target + (p.score >= game.target ? ', target reached' : ''));
                card.querySelector('.gauge-needle').style.transform = `rotate(${-135 + fraction * 270}deg)`;
                card.querySelector('.gauge-charge').style.strokeDashoffset = 100 - fraction * 100;
                card.querySelector('.player-score').textContent = p.score;
                card.querySelector('.reactor-state').textContent = game.winner === p.id ? 'WINNING REACTOR' : p.score >= game.target ? 'TARGET REACHED' : p.id === game.current ? (game.phase === 'TURN_END' ? 'TURN COMPLETE' : 'ACTIVE REACTOR') : 'STANDING BY';
                card.querySelectorAll('[data-token]').forEach(t => {
                    const remaining = p.tokens[t.dataset.token];
                    t.classList.toggle('spent', !remaining);
                    const status = !game.enhancementsEnabled ? 'Off for this game' : remaining ? 'Unused · once per game' : 'Already used';
                    t.setAttribute('aria-label', t.querySelector('.token-label').textContent + ': ' + status);
                });
            });
            if (this.scoreCurrent !== game.current) {
                const board = $('scoreboard'), current = this.scoreCards.get(game.current);
                if (board.scrollWidth > board.clientWidth) {
                    const left = current.getBoundingClientRect().left - board.getBoundingClientRect().left + board.scrollLeft;
                    board.scrollTo({ left: Math.max(0, left - (board.clientWidth - current.offsetWidth) / 2), behavior: 'instant' });
                }
                this.scoreCurrent = game.current;
            }
            if (game.history.length) {
                $('history').replaceChildren();
                game.history.slice(0, 5).forEach(event => {
                    const li = document.createElement('li'), body = document.createElement('span'), name = document.createElement('b'), desc = document.createElement('small'), pts = document.createElement('span');
                    name.textContent = event.player;
                    desc.textContent = event.title + (event.strands ? ' · ' + event.strands.map(s => s.ids.length + ' × ' + s.value).join(' + ') : '');
                    desc.title = event.detail;
                    pts.className = 'log-points'; pts.textContent = (event.points > 0 ? '+' : '') + event.points;
                    body.append(name, desc); li.append(body, pts); $('history').append(li);
                });
            } else { $('history').textContent = 'The first move is yours.'; }
        }
        renderEnhancements(game) {
            game.players.forEach(p => this.scoreCards.get(p.id).querySelectorAll('[data-token]').forEach(t => {
                const type = t.dataset.token, el = t.querySelector('button'), help = t.querySelector('.enhancement-help');
                const label = t.querySelector('.token-label').textContent;
                const reason = this.enhancementReason(game, type, p);
                el.id = type + '-button' + (p.id === game.current ? '' : '-' + p.id);
                el.disabled = p.id !== game.current || p.computer || this.busy || !game.canUse(type);
                help.dataset.tip = enhancementTip(type, label + ': ' + (reason || 'Ready to engage.'));
                help.dataset.reason = reason || 'Ready to engage.';
                help.tabIndex = el.disabled ? 0 : -1;
                help.setAttribute('role', 'group');
                help.setAttribute('aria-label', label + ' for ' + p.name + (el.disabled ? ' · ' + reason : ''));
                help.setAttribute('aria-describedby', 'enhancement-tooltip');
            }));
        }
        showTip(help) {
            const tip = $('enhancement-tooltip');
            tip.textContent = help.dataset.tip;
            tip.hidden = false;
            const rect = help.getBoundingClientRect();
            const width = tip.offsetWidth, height = tip.offsetHeight;
            tip.style.left = Math.max(12, Math.min(innerWidth - width - 12, rect.left)) + 'px';
            tip.style.top = Math.max(12, Math.min(innerHeight - height - 12, rect.top >= height + 22 ? rect.top - height - 10 : rect.bottom + 10)) + 'px';
        }
        enhancementReason(game, type, player = game.player) {
            if (!game.enhancementsEnabled) return 'Enhancements are off for this game.';
            if (!player.tokens[type]) return 'Already used · once per game.';
            if (game.phase === 'GAME_OVER') return 'Game complete. Start a new table to use.';
            if (player.computer) return 'Controlled by the computer on its turn.';
            if (player.id !== game.current) return 'Waiting for this player’s turn.';
            if (this.busy) return 'Wait for the dice to settle.';
            if (game.phase === 'TURN_END') return 'Turn complete. Available on your next turn.';
            if (game.phase === 'READY') return 'Roll first to use this enhancement.';
            if (game.enhancementUsed) return 'One enhancement already used this roll.';
            if (game.canUse(type)) return '';
            if (type === 'enrichment') return 'No eligible rolled die to change.';
            if (!game.chain) return 'Choose a chain first.';
            if (type === 'controlRod') return 'Needs a new roll with no chain match.';
            return 'Needs a newly rolled pair of a different number.';
        }
        showPicker(type) {
            const game = this.game;
            if (!game.canUse(type) || this.busy || game.player.computer) return;
            this.picker = type;
            const box = $('enhancement-picker'); box.replaceChildren();
            box.setAttribute('aria-label', type === 'fusion' ? 'Engage Fusion' : 'Engage Enrichment');
            const prompt = document.createElement('p');
            prompt.textContent = type === 'fusion' ? 'Fuse two different matching strands, each with at least two dice. Both score; unmatched dice do not. This ends your turn.' : 'Choose exactly which die to change. The token is spent only when you confirm a change.';
            box.append(prompt);
            if (type === 'fusion') game.fusionOptions.forEach(g => {
                box.append(button('Fuse ' + g.strands.map(s => s.ids.length + ' × ' + s.value).join(' + ') + ' · bank ' + g.score, () => this.act({ type: 'fusion', value: g.value })));
            });
            else game.enrichmentOptions().forEach(o => box.append(button('Die ' + (o.id + 1) + ': ' + game.dice[o.id].value + ' → ' + o.value, () => this.act({ type: 'enrich', id: o.id, value: o.value }))));
            box.append(button('Cancel', () => { box.close(); this.picker = null; $(type + '-button').focus(); }, 'cancel'));
            box.showModal();
            box.querySelector('button').focus();
        }
    }
    root.UIManager = UIManager;
})(window);

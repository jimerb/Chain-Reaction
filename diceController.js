/* Lightweight CSS dice: outcomes are selected by the engine, never inferred from animation. */
(function (root) {
    const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
    // For each front face, choose adjacent top/right faces of a right-handed die.
    const ADJACENT = { 1: [2, 3], 2: [6, 3], 3: [2, 6], 4: [2, 1], 5: [1, 3], 6: [5, 3] };
    function makeDie(value, id, state = 'active', showValue = true) {
        const wrap = document.createElement('div');
        wrap.className = 'die-wrap ' + state;
        wrap.dataset.dieId = id;
        wrap.setAttribute('role', 'img');
        wrap.setAttribute('aria-label', 'Die ' + (id + 1) + ': ' + value + ', ' + state);
        const cube = document.createElement('div');
        cube.className = 'die';
        const [right, front] = ADJACENT[value];
        // The score is on the upward-facing surface, as on a real table.
        [front, right, value, 7 - value, 7 - right, 7 - front].forEach(faceValue => {
            const face = document.createElement('div');
            face.className = 'die-face';
            PIPS[faceValue].forEach(pos => {
                const pip = document.createElement('span');
                pip.className = 'pip';
                pip.style.gridArea = Math.ceil(pos / 3) + ' / ' + ((pos - 1) % 3 + 1);
                face.append(pip);
            });
            cube.append(face);
        });
        const tilt = ((id * 7) % 13) - 6;
        cube.style.transform = 'rotateX(-58deg) rotateY(12deg) rotateZ(' + tilt + 'deg)';
        const shadow = document.createElement('span'); shadow.className = 'die-shadow';
        wrap.append(shadow, cube);
        if (showValue) { const label = document.createElement('span'); label.className = 'die-value'; label.textContent = '#' + (id + 1) + ' · ' + value; wrap.append(label); }
        return wrap;
    }
    class DiceController {
        constructor() { this.sound = false; this.audio = null; this.gentleMotion = false; }
        async unlockAudio() {
            if (!this.sound) return;
            try {
                if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
                if (this.audio.state === 'suspended') await this.audio.resume();
            } catch { this.sound = false; }
        }
        clatter(landings) {
            if (!this.sound || !this.audio || this.audio.state !== 'running') return;
            const ctx = this.audio;
            for (const { time, strength } of landings) {
                const start = ctx.currentTime + time / 1000;
                const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .05), ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * .009));
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass'; filter.frequency.value = 650 + Math.random() * 1500; filter.Q.value = .7;
                const gain = ctx.createGain(); gain.gain.value = .1 * strength;
                source.connect(filter).connect(gain).connect(ctx.destination);
                source.start(start);
                source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
            }
        }
        render(game) {
            const targets = { active: document.getElementById('active-dice'), held: document.getElementById('held-dice') };
            Object.values(targets).forEach(el => el.replaceChildren());
            game.dice.forEach(d => targets[d.state].append(makeDie(d.value, d.id, d.state)));
            if (!game.held.length) { const empty = document.createElement('p'); empty.className = 'empty-zone'; empty.textContent = 'Your chosen dice will rest here'; targets.held.append(empty); }
            if (!game.available.length) { const empty = document.createElement('p'); empty.className = 'empty-zone'; empty.textContent = 'All dice resolved'; targets.active.append(empty); }
        }
        async animate(game, ids) {
            const gentle = this.gentleMotion;
            // Show the freshly rolled dice in the rolling area until they have landed.
            this.render({ ...game, dice: game.dice.map(d => ids.includes(d.id) ? { ...d, state: 'active' } : d),
                held: game.held.filter(d => !ids.includes(d.id)), available: ids.map(id => game.dice[id]) });
            const row = document.getElementById('active-dice');
            const bounds = row.getBoundingClientRect();
            const direction = game.rollNumber % 2 ? 1 : -1;
            // Keep dice in parallel lanes: opposite starting directions make them
            // pass through one another. The narrowest lane bounds the whole toss.
            const room = Math.min(...ids.map(id => {
                const rect = row.querySelector('[data-die-id="' + id + '"]').getBoundingClientRect();
                return Math.max(0, direction > 0 ? bounds.right - rect.right - 18 : rect.left - bounds.left - 18);
            }));
            const distance = gentle ? Math.min(10, room) : Math.min(200, room * .85);
            const landings = [];
            const animations = ids.map((id, index) => {
                const wrap = document.querySelector('#active-dice [data-die-id="' + id + '"]');
                if (!wrap) return Promise.resolve();
                wrap.classList.add('rolling');
                const cube = wrap.querySelector('.die');
                const end = cube.style.transform;
                const duration = gentle ? 620 : 1550 + index * 115;
                const tilt = ((id * 7) % 13) - 6;
                const extraSpin = id % 2 ? 360 : 0;
                // Movement across the felt and rotation use separate elements so the dice
                // translate in table coordinates while tumbling on all three axes.
                const path = gentle ? [
                    { transform: 'translate(0,0)', offset: 0 },
                    { transform: 'translate(' + direction * distance + 'px,-4px)', offset: .35 },
                    { transform: 'translate(0,0)', offset: 1 }
                ] : [
                    { transform: 'translate(' + direction * distance + 'px,-18px)', offset: 0 },
                    { transform: 'translate(' + direction * distance * .72 + 'px,-57px)', offset: .18 },
                    { transform: 'translate(' + direction * distance * .45 + 'px,0)', offset: .38 },
                    { transform: 'translate(' + direction * distance * .27 + 'px,-25px)', offset: .52 },
                    { transform: 'translate(' + direction * distance * .12 + 'px,0)', offset: .67 },
                    { transform: 'translate(' + direction * distance * .05 + 'px,-9px)', offset: .78 },
                    { transform: 'translate(' + direction * distance * .02 + 'px,0)', offset: .88 },
                    { transform: 'translate(0,0)', offset: 1 }
                ];
                const spin = gentle ? [{ transform: end }, { transform: end }] : [
                    { transform: 'rotateX(' + (1022 + extraSpin) + 'deg) rotateY(732deg) rotateZ(' + (tilt + 540) + 'deg)', offset: 0 },
                    { transform: 'rotateX(' + (536 + extraSpin / 2) + 'deg) rotateY(372deg) rotateZ(' + (tilt + 260) + 'deg)', offset: .38 },
                    { transform: 'rotateX(160deg) rotateY(126deg) rotateZ(' + (tilt + 75) + 'deg)', offset: .67 },
                    { transform: 'rotateX(-67deg) rotateY(18deg) rotateZ(' + (tilt - 7) + 'deg)', offset: .88 },
                    { transform: 'rotateX(-54deg) rotateY(10deg) rotateZ(' + (tilt + 3) + 'deg)', offset: .94 },
                    { transform: end, offset: 1 }
                ];
                (gentle ? [.8] : [.38, .67, .88]).forEach((fraction, bounce) => landings.push({ time: duration * fraction, strength: 1 / (bounce + 1) / Math.sqrt(ids.length) }));
                const travel = wrap.animate(path, { duration, easing: 'linear' });
                const tumble = cube.animate(spin, { duration, easing: 'linear' });
                const shadow = wrap.querySelector('.die-shadow').animate(gentle ? [
                    { opacity: .7 }, { opacity: .7 }
                ] : [
                    { transform: 'translateY(18px) scale(1.1)', opacity: .5, offset: 0 },
                    { transform: 'translateY(57px) scale(1.45)', opacity: .23, offset: .18 },
                    { transform: 'translateY(0) scale(1)', opacity: .8, offset: .38 },
                    { transform: 'translateY(25px) scale(1.2)', opacity: .4, offset: .52 },
                    { transform: 'translateY(0) scale(1)', opacity: .8, offset: .67 },
                    { transform: 'translateY(9px) scale(1.08)', opacity: .6, offset: .78 },
                    { transform: 'translateY(0) scale(1)', opacity: .8, offset: 1 }
                ], { duration, easing: 'linear' });
                return Promise.all([travel.finished, tumble.finished, shadow.finished]).catch(() => {});
            });
            this.clatter(landings);
            await Promise.all(animations);
        }
    }
    root.DiceController = DiceController;
    root.makeDie = makeDie;
})(window);

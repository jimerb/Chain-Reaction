'use strict';
const $ = id => document.getElementById(id);
const diceController = new DiceController();
let gameManager = null;
let busy = false;
let computerTimer = null;
let generation = 0;
const uiManager = new UIManager(diceController, action => act(action));

function playerInputs() {
    const previous = [...$('player-names').querySelectorAll('input')].map(el => el.value);
    const count = Number($('player-count').value);
    const computers = $('play-mode').value === 'computer';
    $('player-names').replaceChildren();
    for (let i = 0; i < count; i++) {
        const label = document.createElement('label');
        label.htmlFor = 'player-name-' + i;
        label.textContent = i > 0 && computers ? 'Computer ' + i : 'Player ' + (i + 1);
        const input = document.createElement('input');
        input.type = 'text'; input.id = label.htmlFor; input.maxLength = 24; input.autocomplete = 'off';
        input.value = i > 0 && computers ? ['Ada', 'Nova', 'Atlas', 'Echo'][i - 1] : previous[i] || 'Player ' + (i + 1);
        $('player-names').append(label, input);
    }
}
function render(focus = false) {
    uiManager.render(gameManager, busy);
    $('new-game-button').disabled = busy;
    if (focus && !gameManager.player.computer) ($('choices').querySelector('button') || $('actions').querySelector('button'))?.focus({ preventScroll: true });
}
function scheduleComputer() {
    clearTimeout(computerTimer);
    if (!gameManager?.player.computer || gameManager.phase === 'GAME_OVER' || busy) return;
    const currentGeneration = generation;
    computerTimer = setTimeout(() => {
        if (currentGeneration !== generation || $('restart-dialog').open || $('rules-dialog').open) { scheduleComputer(); return; }
        const action = computerAction(gameManager);
        if (action) act(action, true);
    }, gameManager.phase === 'TURN_END' ? 1900 : 1100);
}
async function act(action, fromComputer = false) {
    if (!gameManager || busy || (gameManager.player.computer && !fromComputer && action.type !== 'restart')) return;
    clearTimeout(computerTimer);
    const session = generation;
    if (action.type === 'restart') { openSetup(); return; }
    if (action.type === 'roll') {
        if (!['READY', 'DECISION'].includes(gameManager.phase)) return;
        busy = true;
        render();
        await diceController.unlockAudio();
        const ids = gameManager.available.map(d => d.id);
        gameManager.roll();
        try { await diceController.animate(gameManager, ids); }
        catch (error) { console.warn('Dice animation unavailable; showing the resolved roll.', error); }
        if (session !== generation) return;
        busy = false;
    } else {
        const methods = { choose: () => gameManager.choose(action.value), bank: () => gameManager.bank(), fail: () => gameManager.fail(),
            next: () => gameManager.nextTurn(), enrich: () => gameManager.enrich(action.id, action.value),
            controlRod: () => gameManager.controlRod(), fusion: () => gameManager.fusion(action.value) };
        if (!methods[action.type]?.()) return;
    }
    render(true);
    scheduleComputer();
}
function openSetup() {
    generation++;
    clearTimeout(computerTimer); busy = false;
    $('game-screen').hidden = true;
    $('setup-screen').hidden = false;
    $('new-game-button').hidden = true;
    $('restart-dialog').close();
    $('start-game-button').focus();
}
$('setup-form').addEventListener('submit', event => {
    event.preventDefault();
    generation++;
    clearTimeout(computerTimer);
    gameManager = new GameManager({
        names: [...$('player-names').querySelectorAll('input')].map(el => el.value),
        target: Number($('target-score').value), enhancements: $('use-enhancements').checked, computers: $('play-mode').value === 'computer'
    });
    window.gameManager = gameManager;
    $('setup-screen').hidden = true; $('game-screen').hidden = false; $('new-game-button').hidden = false;
    render(true);
});
$('player-count').addEventListener('change', playerInputs);
$('play-mode').addEventListener('change', playerInputs);
$('motion-button').addEventListener('click', () => {
    diceController.gentleMotion = !diceController.gentleMotion;
    $('motion-button').textContent = diceController.gentleMotion ? 'Gentle rolls' : 'Full rolls';
    $('motion-button').setAttribute('aria-pressed', String(diceController.gentleMotion));
});
$('sound-button').addEventListener('click', async () => {
    diceController.sound = !diceController.sound;
    await diceController.unlockAudio();
    $('sound-button').textContent = diceController.sound ? 'Sound on' : 'Sound off';
    $('sound-button').setAttribute('aria-pressed', String(diceController.sound));
});
$('help-button').addEventListener('click', () => $('rules-dialog').showModal());
$('close-rules').addEventListener('click', () => $('rules-dialog').close());
$('new-game-button').addEventListener('click', () => $('restart-dialog').showModal());
$('cancel-restart').addEventListener('click', () => $('restart-dialog').close());
$('confirm-restart').addEventListener('click', openSetup);
playerInputs();
[2, 5, 5, 3, 5].forEach((value, id) => $('demo-dice').append(makeDie(value, id, value === 5 ? 'held' : 'active', false)));

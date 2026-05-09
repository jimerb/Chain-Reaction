// enhancementController.js
//
// Mediates the three single-use enhancements: Enrichment, Control Rod, Fusion.
// Works against the public surface of GameManager (chainNumber, chainDice,
// currentRoll, phase, ...) so state is never duplicated here.

class EnhancementController {
    constructor(gameManager, uiManager, diceController) {
        this.gameManager = gameManager;
        this.uiManager = uiManager;
        this.diceController = diceController;
    }

    attemptUseEnhancement(type, clickedPlayerId = null) {
        const player = this.gameManager.getCurrentPlayer();
        if (clickedPlayerId !== null && clickedPlayerId !== player.id) {
            console.log("Cannot use another player's enhancement.");
            return;
        }

        if (!this.gameManager.canUseEnhancement(type)) {
            console.log(`Cannot use ${type} enhancement now.`);
            this.uiManager.displayMessage(`Cannot use ${type} now.`, true);
            return;
        }

        console.log(`${player.name} attempts to use ${type}`);
        switch (type) {
            case 'enrichment': this.prepareEnrichment(player); break;
            case 'controlRod': this.useControlRod(player); break;
            case 'fusion':     this.useFusion(player); break;
            default: console.error(`Unknown enhancement type: ${type}`);
        }
    }

    prepareEnrichment(player) {
        const chainNum = this.gameManager.chainNumber;
        // Candidate dice: any active die (not already set aside) that isn't
        // already showing the chain number. If no chain yet, any active die.
        const candidates = this.gameManager.currentRoll.filter(d => {
            if (d.setAside) return false;
            return chainNum ? d.value !== chainNum : true;
        }).map(d => this.diceController.dice[d.index]);

        if (candidates.length === 0) {
            this.uiManager.displayMessage("No eligible dice for Enrichment.", true);
            return;
        }

        this.gameManager.setWaitingForEnrichmentTarget(true, candidates);
        this.uiManager.showEnhancementPrompt(
            chainNum
                ? `Click a die to change it into a ${chainNum}.`
                : "Click a die to change its value (to form a pair)."
        );
    }

    selectEnrichmentTarget(targetDie) {
        if (!this.gameManager.isWaitingForEnrichmentTarget()) return;
        const player = this.gameManager.getCurrentPlayer();

        this.gameManager.setWaitingForEnrichmentTarget(false);
        this.uiManager.hideEnhancementPrompt();

        if (player.useEnhancement('enrichment')) {
            this.uiManager.updateEnhancementTokenVisual(player.id, 'enrichment', true);
            this.gameManager.applyEnrichment(targetDie);
        }
    }

    useControlRod(player) {
        if (player.useEnhancement('controlRod')) {
            this.uiManager.updateEnhancementTokenVisual(player.id, 'controlRod', true);
            this.gameManager.applyControlRod();
        }
    }

    useFusion(player) {
        const chainNum = this.gameManager.chainNumber;
        const counts = this.gameManager.countDiceValues(this.gameManager.currentRoll);
        const candidates = Object.entries(counts)
            .map(([v, n]) => ({ value: parseInt(v, 10), count: n }))
            .filter(c => c.count >= 2 && c.value !== chainNum);

        if (candidates.length === 0) {
            this.uiManager.displayMessage("No valid second set for Fusion.", true);
            return;
        }

        // Prefer the highest-value secondary set when multiple exist.
        candidates.sort((a, b) => (b.value * b.count) - (a.value * a.count));
        const chosen = candidates[0];
        const dieIndices = this.gameManager.currentRoll
            .filter(d => !d.setAside && d.value === chosen.value)
            .map(d => d.index);

        if (player.useEnhancement('fusion')) {
            this.uiManager.updateEnhancementTokenVisual(player.id, 'fusion', true);
            this.gameManager.applyFusion(chosen.value, dieIndices);
        }
    }
}

window.EnhancementController = EnhancementController;

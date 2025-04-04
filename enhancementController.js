// enhancementController.js

class EnhancementController {
    constructor(gameManager, uiManager, diceController) {
        this.gameManager = gameManager;
        this.uiManager = uiManager;
        this.diceController = diceController;
        this.lastRollResults = []; // Store the dice results {die, value}[] from the last roll
    }

    attemptUseEnhancement(type, clickedPlayerId = null) {
        const player = this.gameManager.getCurrentPlayer();
         // If clicked directly on a token, use that player ID, otherwise use current player
         const targetPlayerId = clickedPlayerId !== null ? clickedPlayerId : player.id;

         if (targetPlayerId !== player.id) {
             console.log("Cannot use another player's enhancement (in standard mode).");
             // If cooperative mode is added, logic changes here.
             return;
         }

        if (!this.gameManager.canUseEnhancement(type)) {
            console.log(`Cannot use ${type} enhancement now or it's already used.`);
            this.uiManager.displayMessage(`Cannot use ${type} enhancement now.`, "warning");
            return;
        }

        console.log(`${player.name} attempts to use ${type}`);

        switch (type) {
            case 'enrichment':
                this.prepareEnrichment(player);
                break;
            case 'controlRod':
                this.confirmUseEnhancement(player, type); // No extra selection needed
                break;
            case 'fusion':
                this.confirmFusion(player); // Needs to identify the secondary set
                break;
            default:
                console.error(`Unknown enhancement type: ${type}`);
        }
    }

    prepareEnrichment(player) {
         const chainNum = this.gameManager.currentTurnState.chainNumber;
         let selectableDice = [];

        if (!chainNum) {
            // Radiation Leak case: Allow changing *any* die
            selectableDice = this.lastRollResults.map(r => r.die);
             if (selectableDice.length === 0) {
                 console.error("Enrichment attempted with no dice rolled?");
                 return;
             }
            this.uiManager.displayMessage("Click a die to change its value (to form a pair).", "info");

        } else {
             // Standard case: Change a non-matching die to the chain number
            selectableDice = this.lastRollResults
                .filter(result => result.value !== chainNum)
                .map(result => result.die);

             if (selectableDice.length === 0) {
                 this.uiManager.displayMessage("No non-matching dice available to change.", "warning");
                 return; // Nothing to change
             }
              this.uiManager.displayMessage(`Click a non-matching die to change it to a ${chainNum}.`, "info");
        }

        this.gameManager.setWaitingForEnrichmentTarget(true, selectableDice);
        // Disable other actions while waiting for selection
        this.uiManager.disableAllButtons();
        // Re-enable enrichment button potentially? Or handle cancellation? For now, assume user clicks a die.
    }

    selectEnrichmentTarget(targetDie) {
        if (!this.gameManager.isWaitingForEnrichmentTarget()) return;

        const player = this.gameManager.getCurrentPlayer();
        console.log(`${player.name} selected die ${targetDie.userData.id} for Enrichment.`);

        this.gameManager.setWaitingForEnrichmentTarget(false, []); // Stop waiting
        this.uiManager.clearEnhancementPrompt();

        if (player.useEnhancement('enrichment')) {
            this.diceController.updateTokenVisual(player.id, 'enrichment', true);
            this.uiManager.updateEnhancementTokenVisual(player.id, 'enrichment', true); // Update placeholder
            this.gameManager.applyEnrichment(targetDie); // Let GameManager handle the game logic update
             this.gameManager.currentTurnState.enhancementUsedThisRoll = true;
             this.uiManager.updateEnhancementButtons(player, this.gameManager.currentTurnState); // Update buttons state
        } else {
            console.error("Failed to mark enrichment as used, state mismatch?");
        }
    }

     confirmFusion(player) {
        // Identify the potential secondary set(s) from the last roll
        const counts = this.gameManager.countDiceValues(this.lastRollResults);
        const potentialFusionSets = Object.entries(counts)
            .filter(([valStr, count]) => {
                const val = parseInt(valStr, 10);
                // Must be >= 2 dice, and *different* from the current chain number
                return count >= 2 && val !== this.gameManager.currentTurnState.chainNumber;
            })
            .map(([valStr, count]) => {
                 const num = parseInt(valStr, 10);
                 return {
                     number: num,
                     dice: this.lastRollResults.filter(r => r.value === num).map(r => r.die)
                 };
            });

         if (potentialFusionSets.length === 0) {
              console.warn("Fusion attempted, but no valid secondary set found in the last roll.");
              this.uiManager.displayMessage("No valid second set found for Fusion.", "warning");
              return;
         }

         // Simple case: only one possible fusion set
         if (potentialFusionSets.length === 1) {
             const fusionSet = potentialFusionSets[0];
             console.log(`Confirming Fusion with set of ${fusionSet.dice.length} x ${fusionSet.number}s`);
             if (player.useEnhancement('fusion')) {
                 this.diceController.updateTokenVisual(player.id, 'fusion', true);
                 this.uiManager.updateEnhancementTokenVisual(player.id, 'fusion', true);
                 this.gameManager.applyFusion(fusionSet.number, fusionSet.dice);
                 this.gameManager.currentTurnState.enhancementUsedThisRoll = true;
                this.uiManager.updateEnhancementButtons(player, this.gameManager.currentTurnState);
             }
         } else {
             // TODO: Handle multiple fusion set choices (requires more UI/selection logic)
             console.warn("Multiple potential Fusion sets found. Using the first one for now.");
             const fusionSet = potentialFusionSets[0];
              if (player.useEnhancement('fusion')) {
                 this.diceController.updateTokenVisual(player.id, 'fusion', true);
                 this.uiManager.updateEnhancementTokenVisual(player.id, 'fusion', true);
                 this.gameManager.applyFusion(fusionSet.number, fusionSet.dice);
                 this.gameManager.currentTurnState.enhancementUsedThisRoll = true;
                 this.uiManager.updateEnhancementButtons(player, this.gameManager.currentTurnState);
             }
         }
     }


    // For enhancements like Control Rod that don't need extra selection
    confirmUseEnhancement(player, type) {
         if (player.useEnhancement(type)) {
             this.diceController.updateTokenVisual(player.id, type, true);
             this.uiManager.updateEnhancementTokenVisual(player.id, type, true); // Update placeholder

             if (type === 'controlRod') {
                 this.gameManager.applyControlRod();
             }
             // Add other simple enhancements here if needed

             this.gameManager.currentTurnState.enhancementUsedThisRoll = true;
             this.uiManager.updateEnhancementButtons(player, this.gameManager.currentTurnState); // Update button states
         } else {
            console.error(`Failed to mark ${type} as used, state mismatch?`);
         }
    }

} // End of EnhancementController class

// Make EnhancementController globally available
window.EnhancementController = EnhancementController;
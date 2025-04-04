// gameManager.js
// Using globally loaded utility functions

const TARGET_SCORE = 100;

class Player {
    constructor(id, name, isHuman = false) {
        this.id = id;
        this.name = name;
        this.score = 0;
        this.enhancements = {
            enrichment: true,  // Can increase a die value
            controlRod: true,  // Can prevent meltdown
            fusion: true       // Can change matching dice to a different value
        };
        this.isHuman = isHuman; // Currently only relevant for the first player
        this.finalTurnTaken = false; // For end-game fairness rule
    }

    addScore(points) {
        this.score += points;
        if (this.score < 0) {
            this.score = 0; // Score cannot go below zero
        }
    }

    useEnhancement(type) {
        if (this.enhancements[type]) {
            this.enhancements[type] = false;
            return true;
        }
        return false;
    }
}

class GameManager {
    constructor(playerCount, humanName, uiManager, diceController, gameEndCallback) {
        this.playerCount = Math.min(Math.max(2, playerCount), 8); // 2-8 players
        this.humanName = humanName;
        this.uiManager = uiManager;
        this.diceController = diceController;
        this.enhancementController = null; // Set later
        this.gameEndCallback = gameEndCallback;
        
        this.players = [];
        this.currentPlayerIndex = 0;
        this.turnNumber = 1;
        this.gameRound = 1; // Track rounds for tie-breaking and fairness
        
        // Turn state
        this.phase = 'SETUP'; // SETUP, ROLL, CHAIN_SELECTION, DECISION, EXTEND, MELTDOWN_CHECK, SCORING, END
        this.currentRoll = [];
        this.chainNumber = null;
        this.chainDice = [];
        this.potentialChains = [];
        this.radiationLeakValue = null;
        this.enhancementUsedThisTurn = false;
        this.waitingForEnrichmentTarget = false;
        this.endGameTriggered = false; // Flag when someone reaches TARGET_SCORE
        this.playerWhoTriggeredEnd = null; // ID of player who first hit the score
    }
    
    setEnhancementController(controller) {
        this.enhancementController = controller;
    }
    
    // Player Management
    setupPlayers() {
        this.players = [];
        
        // Add human player
        this.players.push(new Player(0, this.humanName, true));
        
        // Add AI players
        for (let i = 1; i < this.playerCount; i++) {
            this.players.push(new Player(i, `Player ${i + 1}`));
        }
        
        // Randomly determine starting player
        this.currentPlayerIndex = Math.floor(Math.random() * this.playerCount);
    }
    
    getPlayers() {
        return this.players;
    }
    
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    
    // Game Flow Control
    startGame() {
        this.phase = 'ROLL';
        this.uiManager.highlightActivePlayer(this.getCurrentPlayer().id);
        this.uiManager.showRollButton(true);
        this.uiManager.displayMessage(`${this.getCurrentPlayer().name}'s turn to roll the dice!`);
    }
    
    // Handle button actions
    handleRollAction() {
        if (this.phase !== 'ROLL') return;
        
        this.uiManager.showRollButton(false);
        this.uiManager.displayMessage("Rolling dice...");
        
        // Roll all available dice
        this.diceController.rollDice().then(() => {
            this.afterRoll();
        });
    }
    
    handleContinueAction() {
        if (this.phase !== 'DECISION') return;
        
        this.phase = 'ROLL';
        this.uiManager.showRollButton(true);
        this.uiManager.showEnhancementButtons(false);
        this.uiManager.displayMessage(`${this.getCurrentPlayer().name} continues rolling!`);
    }
    
    handleStopAction() {
        if (this.phase !== 'DECISION') return;
        
        this.scoreChain();
        this.endTurn();
    }
    
    // Die selection (from click handler)
    handleDieClick(die) {
        console.log("--- Handling Die Click --- Clicked Die Index:", die.userData.id, "Current Phase:", this.phase);
        
        if (!this.canPlayerAct()) {
             console.log("   Player cannot act now.");
             return; 
        }
        
        // If waiting for Enrichment target selection
        if (this.waitingForEnrichmentTarget && this.phase === 'DECISION') {
            console.log(`   Enrichment target selected: Die ${die.userData.id}`);
            this.enhancementController.handleEnrichmentTargetSelection(die);
            this.setWaitingForEnrichmentTarget(false); // Reset flag
            return;
        }

        // Allow die click ONLY during CHAIN_SELECTION phase
        if (this.phase !== 'CHAIN_SELECTION') {
            console.log(`   Ignoring die click in phase: ${this.phase}. Expected CHAIN_SELECTION.`);
            return;
        }

        // Determine the value of the clicked die from the current roll results
        const clickedDieData = this.currentRoll.find(d => d.index === die.userData.id);
        
        if (!clickedDieData) {
            console.error(`   Error: Could not find data for clicked die index ${die.userData.id} in currentRoll.`);
            return;
        }
        
        const clickedValue = clickedDieData.value;
        console.log(`   Clicked die value: ${clickedValue}`);

        // Check if this value corresponds to a *valid* potential chain
        const correspondingChain = this.potentialChains.find(chain => 
            chain.value === clickedValue && 
            chain.diceIndices.includes(clickedDieData.index)
        );

        if (correspondingChain) {
            console.log(`   Match found! Selecting chain with value ${clickedValue}`);
            // Pass the value and the FULL list of indices for that value
            this.selectChain(clickedValue, correspondingChain.diceIndices);
        } else {
            console.warn(`   Clicked die (value ${clickedValue}, index ${die.userData.id}) does not belong to any currently valid potential chain.`);
            this.uiManager.displayMessage("Click on a highlighted die to select its chain.", "warning");
        }
        console.log("--- Finished Handling Die Click ---");
    }
    
    // Game Logic
    afterRoll() {
        console.log("--- Entering afterRoll --- Phase:", this.phase);
        // Update this.currentRoll with the latest values from the dice controller
        const diceValues = this.diceController.getDiceValues();
        this.currentRoll = diceValues;
        console.log(" Raw Dice Values Received:", JSON.stringify(this.currentRoll));

        // Filter out dice that are already set aside
        const activeDice = this.currentRoll.filter(die => !die.setAside);
        console.log(" Filtered Active Dice:", JSON.stringify(activeDice));

        // Ensure activeDice are valid
        if (!activeDice || activeDice.length === 0) {
            console.warn(" No active dice found after roll. Ending turn prematurely.");
            this.endTurn();
            return;
        }

        // Group active dice by value
        console.log(" Grouping Active Dice by Value...");
        const diceByValue = activeDice.reduce((acc, die) => {
            console.log(`  Processing Die Index ${die.index}, Value: ${die.value}, SetAside: ${die.setAside}`);
            const valueKey = die.value.toString(); // Ensure using string keys
            if (!acc[valueKey]) {
                acc[valueKey] = [];
                console.log(`   Created group for value ${valueKey}`);
            }
            acc[valueKey].push(die);
            console.log(`   Added Die ${die.index} to group ${valueKey}`);
            return acc;
        }, {});
        console.log(" Dice Grouped by Value (Final):", JSON.stringify(diceByValue));

        // Check for critical mass (3 or more identical dice AFTER a roll)
        console.log(" Checking for Critical Mass...");
        const criticalMassValues = Object.entries(diceByValue)
            .filter(([value, dice]) => dice.length >= 3)
            .map(([value]) => parseInt(value));
        console.log(" Critical Mass Values Found:", criticalMassValues);

        if (criticalMassValues.length > 0) {
            console.log(" Critical Mass Detected! Values:", criticalMassValues);
            this.uiManager.displayMessage("Critical Mass! Re-rolling matching dice...", true);
            
            let criticalDiceIndices = [];
            criticalMassValues.forEach(value => {
                // Ensure we get the indices from the original grouped object
                const diceWithThisValue = diceByValue[value.toString()].map(die => die.index);
                criticalDiceIndices.push(...diceWithThisValue);
                console.log(`   - Adding dice for critical mass value ${value}:`, diceWithThisValue);
            });
            
            console.log(" Indices to re-roll for critical mass:", criticalDiceIndices);
            this.diceController.rollDice(criticalDiceIndices).then(() => {
                console.log(" Re-rolling completed, calling afterRoll again.");
                this.afterRoll(); 
            });
            return; // Stop further processing for this roll
        }

        // --- Chain Detection --- 
        this.potentialChains = [];
        console.log("--- Starting Chain Detection from Grouped Dice ---");
        for (const [valueStr, dice] of Object.entries(diceByValue)) {
            const value = parseInt(valueStr);
            const count = dice.length;
            console.log(` Evaluating Group: Value=${value}, Count=${count}`);
            if (count >= 2) {
                const diceIndices = dice.map(die => die.index);
                console.log(`   -> Potential Chain Found: Value=${value}, Count=${count}, Indices=${JSON.stringify(diceIndices)}`);
                this.potentialChains.push({
                    value: value,
                    count: count,
                    diceIndices: diceIndices
                });
            } else {
                console.log(`   -> Skipping Group: Value=${value}, Count=${count} (less than 2)`);
            }
        }
        console.log("--- Finished Chain Detection ---");
        console.log(" Final Potential Chains Array:", JSON.stringify(this.potentialChains));

        // Check for radiation leak (all 5 dice different values, none set aside)
        const uniqueValuesCount = Object.keys(diceByValue).length;
        const activeDiceCount = activeDice.length;
        console.log(` Radiation Leak Check: Active Dice=${activeDiceCount}, Unique Values=${uniqueValuesCount}`);
        
        // Radiation leak condition: 5 active dice, 5 unique values
        if (activeDiceCount === 5 && uniqueValuesCount === 5) { 
            console.log(" Radiation Leak Detected!");
            this.uiManager.displayMessage("Radiation Leak! All 6s will be set aside in future rolls.", true);
            this.radiationLeakValue = 6; // Mark 6s for future removal
            this.endTurn();
            return;
        }

        // --- Handle Game Flow based on Chains --- 
        if (this.potentialChains.length === 0) {
            console.log(" No potential chains found. Ending turn.");
            this.uiManager.displayMessage("No chain combinations possible. Turn ends with no points.");
            this.endTurn();
            return;
        }
        
        console.log(` Moving to CHAIN_SELECTION phase with ${this.potentialChains.length} potential chains.`);
        this.phase = 'CHAIN_SELECTION';
        this.uiManager.displayMessage(`Select a chain to continue. ${this.potentialChains.length} possible chains.`);
        
        // Disable roll button, ensure selection is possible
        this.uiManager.rollButton.disabled = true;
        this.uiManager.rollButton.classList.add('hidden'); // Hide roll button during selection
        this.uiManager.continueButton.classList.add('hidden');
        this.uiManager.stopButton.classList.add('hidden');

        // Highlight ALL potential chains using the corrected data
        this.highlightPotentialChains(); // This function already has detailed logging
        console.log("--- Exiting afterRoll (Proceeding to Highlight) ---");
    }
    
    highlightPotentialChains() {
        console.log("--- Highlighting Potential Chains --- Input:", JSON.stringify(this.potentialChains));
        
        // CRITICAL: Ensure we ONLY use chains with >= 2 dice of the SAME value
        // (This validation should technically happen in afterRoll, but double-check here)
        const validChains = this.potentialChains.filter(chain => {
            if (!chain || !Array.isArray(chain.diceIndices) || chain.diceIndices.length < 2) {
                console.warn("Filtering out invalid chain structure:", chain);
                return false;
            }
            // Verify all dice in this chain actually have the correct value from the *current* roll state
            const confirmedDiceIndices = chain.diceIndices.filter(dieIndex => {
                const die = this.currentRoll.find(d => d.index === dieIndex);
                return die && !die.setAside && die.value === chain.value;
            });
            
            if (confirmedDiceIndices.length < 2) {
                 console.warn(`Chain value ${chain.value} has < 2 confirmed matching dice after check. Indices: ${JSON.stringify(chain.diceIndices)}, Confirmed: ${JSON.stringify(confirmedDiceIndices)}`);
                return false;
            }
            
            // Update the chain object with only the confirmed dice
            chain.diceIndices = confirmedDiceIndices;
            chain.count = confirmedDiceIndices.length;
            console.log(`   Validated Chain: Value=${chain.value}, Count=${chain.count}, Indices=${JSON.stringify(chain.diceIndices)}`);
            return true;
        });

        console.log("Valid Chains Prepared for Highlighting:", JSON.stringify(validChains));

        if (validChains.length === 0) {
            console.warn("No valid chains remain after final validation. This might indicate an issue upstream.");
            // If no chains are truly valid, the turn should probably end.
            // However, this situation implies a logic error earlier, so let's log and potentially end turn.
            this.uiManager.displayMessage("Error: No valid chains found after final check. Ending turn.", "error");
            // Consider ending the turn here if this state is reached
            // this.endTurn(); 
            return; 
        }

        // Use the dedicated method in diceController to highlight all validated chains
        this.diceController.highlightAllPotentialChains(validChains);

        // Update the message based on validated chains
        this.uiManager.displayMessage(`Select a chain. ${validChains.length} possible chains highlighted.`);
        console.log("--- Finished Highlighting Potential Chains ---");
    }
    
    selectChain(value, diceIndices) {
        console.log(`--- Chain Selection Attempt --- Value: ${value}, Clicked Dice Indices (may be partial): ${JSON.stringify(diceIndices)}`);
        
        // CRITICAL: Find ALL active dice with the selected value, regardless of what was clicked
        const allMatchingDice = this.currentRoll
            .filter(die => !die.setAside && die.value === value)
            .map(die => die.index);
            
        console.log(`   Found ALL active dice with value ${value}:`, JSON.stringify(allMatchingDice));
        
        if (allMatchingDice.length < 2) {
            console.error(`   Error: Cannot form chain with value ${value}. Found only ${allMatchingDice.length} matching dice. Required >= 2.`);
            this.uiManager.displayMessage(`Error: Need at least 2 dice with value ${value} to form a chain.`, "error");
            // Do not change phase, allow user to select a different valid chain if available
            return; 
        }
        
        // Chain is valid, proceed
        this.chainNumber = value;
        this.chainDice = allMatchingDice; // Use ALL matching dice
        
        console.log(`   Confirmed Chain: Value=${this.chainNumber}, Dice=${JSON.stringify(this.chainDice)}`);
        
        // Set aside ALL the dice in the confirmed chain
        this.diceController.setDiceAside(this.chainDice);
        
        // Calculate score for this specific chain segment
        const chainScore = this.chainNumber * this.chainDice.length;
        
        // Update UI immediately
        this.uiManager.clearMessages();
        this.uiManager.updateChainInfo(this.chainDice.length, chainScore); // Show initial chain info
        this.uiManager.displayMessage(`Selected chain: ${this.chainDice.length} x ${this.chainNumber}. Continue or Stop?`);
        
        // Move to the decision phase
        this.phase = 'DECISION';
        console.log("   Moving to DECISION phase.");
        
        // Explicitly set button states for DECISION phase
        this.uiManager.rollButton.classList.add('hidden'); 
        this.uiManager.continueButton.classList.remove('hidden');
        this.uiManager.continueButton.disabled = false;
        this.uiManager.stopButton.classList.remove('hidden');
        this.uiManager.stopButton.disabled = false;
        
        // Show enhancement buttons if available
        this.uiManager.showEnhancementButtons(this.getCurrentPlayer().enhancementsAvailable()); 
        
        console.log("   Button states set for DECISION phase.");
        console.log("--- Chain Selection Complete ---");
    }
    
    handleRadiationLeak() {
        this.phase = 'RADIATION_LEAK_PENDING';
        this.radiationLeakValue = null;
        
        this.uiManager.displayMessage("Radiation Leak! Choose a die value to set aside all matching dice in future rolls this turn.", true);
        
        // Let the player choose a value 1-6
        // For simplicity in this demo, we'll automatically choose value 6
        this.radiationLeakValue = 6;
        this.uiManager.displayMessage(`Radiation Leak: All ${this.radiationLeakValue}s will be set aside in future rolls.`);
        
        // Continue with turn
        this.phase = 'ROLL';
        this.uiManager.showRollButton(true);
    }
    
    scoreChain() {
        if (!this.chainNumber || this.chainDice.length === 0) return;
        
        const score = this.chainNumber * this.chainDice.length;
        const player = this.getCurrentPlayer();
        
        player.addScore(score);
        this.uiManager.updateScore(player.id, player.score);
        this.uiManager.displayMessage(`${player.name} scores ${score} points!`);
        
        // Check for win condition
        if (player.score >= TARGET_SCORE) {
            this.checkForWinner();
        }
    }
    
    endTurn() {
        // Reset game state for next turn
        this.diceController.resetDice();
        this.chainNumber = null;
        this.chainDice = [];
        this.potentialChains = [];
        this.radiationLeakValue = null;
        this.enhancementUsedThisTurn = false;
        this.waitingForEnrichmentTarget = false;
        
        // Move to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
        this.turnNumber++;
        
        // Update UI for next turn
        this.uiManager.highlightActivePlayer(this.getCurrentPlayer().id);
        this.uiManager.clearChainInfo();
        this.phase = 'ROLL';
        this.uiManager.showRollButton(true);
        this.uiManager.displayMessage(`${this.getCurrentPlayer().name}'s turn to roll the dice!`);
        
        // Check if we've completed a round
        if (this.currentPlayerIndex === 0) {
            this.gameRound++;
            console.log(`Starting Round ${this.gameRound}`);
        }
        
        // Check win condition *after* the turn is fully resolved
        if (!this.checkForWinner()) {
            // If game not over, proceed to next player
        }
    }
    
    checkForWinner() {
        const player = this.getCurrentPlayer(); // The player who just finished their turn

        if (this.endGameTriggered) {
            // End game was already triggered, this player just finished their final turn
            player.finalTurnTaken = true;
            console.log(`${player.name} completed their final turn.`);

            // Check if all players have now taken their final turn
            const allTurnsTaken = this.players.every(p => p.finalTurnTaken);
            if (allTurnsTaken) {
                console.log("All players have completed their final turns.");
                this.determineWinner();
                return true; // Game ends now
            } else {
                // Continue to the next player who hasn't had their final turn
                console.log("Waiting for other players to finish final turns.");
                return false;
            }
        }

        let someoneReachedTarget = this.players.some(p => p.score >= TARGET_SCORE);

        if (someoneReachedTarget && !this.endGameTriggered) {
            // First time someone reached the target this game
            this.endGameTriggered = true;
            this.playerWhoTriggeredEnd = player.id;
            player.finalTurnTaken = true; // Mark the current player's turn as their final one
            this.uiManager.displayMessage(`${player.name} reached ${TARGET_SCORE}! Final round for others!`, "info");
            console.log(`Game end triggered by ${player.name} in round ${this.gameRound}.`);

            // Check if all other players have already had a turn in this round
            const firstPlayerIndex = (this.playerWhoTriggeredEnd + 1) % this.playerCount; // Player who should start next round normally
            if (this.currentPlayerIndex === (firstPlayerIndex - 1 + this.playerCount) % this.playerCount) {
                console.log("Target reached on the last player's turn of the round. Determining winner now.");
                this.determineWinner();
                return true; // Game ends immediately
            } else {
                console.log("Allowing remaining players in the round a final turn.");
                // Mark players who already played this round as having taken their final turn
                let checkIndex = (this.playerWhoTriggeredEnd + 1) % this.playerCount;
                while(checkIndex !== (this.currentPlayerIndex + 1) % this.playerCount) {
                    if(!this.players[checkIndex].finalTurnTaken) {
                        // Player still needs their turn
                        console.log(`Player ${this.players[checkIndex].name} needs final turn.`);
                    }
                    checkIndex = (checkIndex + 1) % this.playerCount;
                }

                // Game continues to the next player for their final turn
                return false;
            }
        }

        return false;
    }

    determineWinner() {
        console.log("Determining Winner...");
        this.phase = 'END';
        let highestScore = -1;
        let winners = [];

        this.players.forEach(player => {
            if (player.score >= TARGET_SCORE) {
                if (player.score > highestScore) {
                    highestScore = player.score;
                    winners = [player];
                } else if (player.score === highestScore) {
                    winners.push(player);
                }
            } else if (highestScore < 0 && player.score > highestScore) {
                // Case where no one reached target, but we need the highest score anyway (e.g. if fairness rule wasn't triggered but game needs to end)
                // Or if target is low and multiple cross it, find highest overall.
                highestScore = player.score;
                winners = [player];
            } else if (player.score === highestScore) {
                winners.push(player);
            }
        });

        // If after checking, the highest score is still below target (unlikely with standard rules, but possible), find highest overall
        if(highestScore < TARGET_SCORE) {
            highestScore = -1;
            winners = [];
            this.players.forEach(player => {
                if (player.score > highestScore) {
                    highestScore = player.score;
                    winners = [player];
                } else if (player.score === highestScore) {
                    winners.push(player);
                }
            });
        }

        if (winners.length === 1) {
            // Single winner
            this.gameEndCallback({
                winner: winners[0],
                score: highestScore,
                tied: false
            });
        } else if (winners.length > 1) {
            // Tie condition - play extra rounds (Simplified: just declare tie for now, implementing full extra rounds is complex)
            // TODO: Implement full tie-breaker rounds if needed. For now, declare shared win.
            console.log("Exact tie detected! Declaring shared win (or implement tie-breaker rounds).");
            this.gameEndCallback({
                winners: winners,
                score: highestScore,
                tied: true
            });
            // To implement tie-breaker: Reset finalTurnTaken for tied players, set state to TIE_BREAKER, start new round only with tied players.
        } else {
            // Should not happen if there are players, means highestScore remained -1
            console.error("Error determining winner - no players found or scores invalid?");
            this.gameEndCallback({ winner: null, score: -1, error: true }); // Indicate error
        }
    }

    // --- Enhancement Application Callbacks (Called by EnhancementController) ---
    applyEnrichment(targetDie) {
        const chainNum = this.chainNumber;
        if (!chainNum) {
            // Handle case where Enrichment is used on Radiation Leak
            const counts = this.countDiceValues(this.currentRoll);
            const mostFrequent = Object.entries(counts).sort(([,a],[,b]) => b-a)[0];
            const targetValue = parseInt(mostFrequent[0], 10); // Pick one value to make a pair
            this.diceController.changeDieValue(targetDie, targetValue);
            // Re-evaluate the initial roll *with the changed die*
            const updatedResults = this.diceController.getDiceValues(); // Get fresh values including the changed one
            this.afterRoll(); // Re-process the roll

        } else {
            // Standard case: add to existing chain
            this.diceController.changeDieValue(targetDie, chainNum);
            this.chainDice.push(targetDie); // Add the changed die to the chain
            this.diceController.setDiceAside(this.chainDice); // Update visuals
            this.uiManager.updateChainInfo(chainNum, this.chainDice.length);
            // Re-evaluate the outcome of the roll (did it prevent meltdown, or just add a die?)
            // Check if the original roll WAS a meltdown
            const originalMatchingDiceCount = this.currentRoll
                .filter(r => r.die !== targetDie) // Exclude the changed die from original check
                .filter(r => r.value === chainNum).length;

            if (originalMatchingDiceCount === 0) { // Enrichment prevented a meltdown
                this.uiManager.displayMessage("Enrichment prevented Meltdown!", "success");
                // Now decide next step (all dice in chain? -> score/end, else -> DECISION)
                if (this.chainDice.length === 5) {
                    this.scoreChain();
                    this.endTurn();
                } else {
                    this.phase = 'DECISION';
                    this.uiManager.updateTurnInfo(this.getCurrentPlayer().name, this.phase);
                    this.uiManager.enableDecisionButtons();
                    this.uiManager.updateEnhancementButtons(this.getCurrentPlayer(), this.phase); // Update buttons state
                }
            } else { // Enrichment just added another die
                this.uiManager.displayMessage("Enrichment added a die!", "info");
                // Already added to chain, just ensure state is correct
                if (this.chainDice.length === 5) {
                    this.scoreChain();
                    this.endTurn();
                } else {
                    this.phase = 'DECISION';
                    this.uiManager.updateTurnInfo(this.getCurrentPlayer().name, this.phase);
                    this.uiManager.enableDecisionButtons();
                    this.uiManager.updateEnhancementButtons(this.getCurrentPlayer(), this.phase);
                }
            }
        }
        this.enhancementUsedThisTurn = true;
        this.uiManager.updateEnhancementButtons(this.getCurrentPlayer(), this.phase); // Disable others
    }

    applyControlRod() {
        this.uiManager.displayMessage("Control Rod used! Emergency Shutdown initiated.", "success");
        // Score the chain as it was *before* the meltdown roll
        this.scoreChain();
        this.enhancementUsedThisTurn = true; // Mark as used for this "roll resolution"
        this.endTurn(); // Control rod always ends the turn
    }

    applyFusion(newSetNumber, newSetDice) {
        const player = this.getCurrentPlayer();
        // Score original chain
        const originalScore = this.chainNumber * this.chainDice.length;
        // Score new set
        const fusionScore = newSetNumber * newSetDice.length;
        const totalScore = originalScore + fusionScore;

        player.addScore(totalScore);
        this.uiManager.updateScore(player.id, player.score);
        this.uiManager.displayMessage(`Fusion! Scored ${originalScore} + ${fusionScore} = ${totalScore} points!`, "success");

        // Visually highlight both sets briefly?
        this.diceController.setDiceAside([...this.chainDice, ...newSetDice]);

        this.enhancementUsedThisTurn = true;
        this.endTurn(); // Fusion always ends the turn
    }

    // --- Utility & Checks ---

    canPlayerAct() {
        // Add checks: return this.gameState === 'PLAYING' && this.players[this.currentPlayerIndex].isHuman;
        // For now, assuming human controls all players
        return this.phase === 'DECISION' || this.phase === 'CHAIN_SELECTION' || this.phase === 'ROLL';
    }

    canSelectDie() {
        return this.canPlayerAct() &&
            (this.phase === 'CHAIN_SELECTION' || this.waitingForEnrichmentTarget);
    }

    canUseEnhancement(type) {
        if (!this.canPlayerAct() || this.enhancementUsedThisTurn) return false;

        const player = this.getCurrentPlayer();
        if (!player.enhancements[type]) return false; // Already used this game

        const phase = this.phase;

        switch (type) {
            case 'enrichment':
                // Usable after any roll resolution (before bust confirmed), or during pending leak/meltdown
                return phase === 'DECISION' || phase === 'RADIATION_LEAK_PENDING' || phase === 'CHAIN_SELECTION' ;
            case 'controlRod':
                // Usable *only* immediately after a roll results in a Meltdown (during MELTDOWN_CHECK)
                return phase === 'DECISION';
            case 'fusion':
                // Usable after a roll (initial or extend) results in *at least two matching dice* of a *different* number than the current chain
                if (phase !== 'DECISION' && phase !== 'CHAIN_SELECTION') return false; // Must be after a roll resolution
                if (!this.chainNumber && phase !== 'CHAIN_SELECTION') return false; // Fusion needs an existing chain, unless it's the first roll choice

                const counts = this.countDiceValues(this.currentRoll);
                return Object.entries(counts).some(([valStr, count]) => {
                    const val = parseInt(valStr, 10);
                    return count >= 2 && val !== this.chainNumber;
                });
            default:
                return false;
        }
    }

    isWaitingForEnrichmentTarget() {
        return this.waitingForEnrichmentTarget;
    }

    setWaitingForEnrichmentTarget(isWaiting, selectableDice) {
        this.waitingForEnrichmentTarget = isWaiting;
        if (isWaiting) {
            this.diceController.highlightSelectableDiceForEnrichment(selectableDice);
            this.uiManager.displayMessage("Click a non-matching die to change it to your chain number.", "info", true); // true = make prompt prominent
        } else {
            this.diceController.clearDiceHighlights(); // Clear enrichment highlights
            this.uiManager.clearEnhancementPrompt();
        }
    }

    countDiceValues(diceResults) {
        const counts = {};
        for (const result of diceResults) {
            counts[result.value] = (counts[result.value] || 0) + 1;
        }
        return counts;
    }

    updateScoreboard() {
        const thead = document.querySelector('#scoreboard thead');
        const tbody = document.querySelector('#scoreboard tbody');
        
        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Create the header row
        const headerRow = document.createElement('tr');
        
        // Add headers for each player
        this.players.forEach((player, index) => {
            const th = document.createElement('th');
            th.textContent = player.name;
            
            // Add current player class if it's this player's turn
            if (index === this.currentPlayerIndex) {
                th.classList.add('current-player');
            }
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        
        // Create score row
        const scoreRow = document.createElement('tr');
        
        // Add current player class to the entire row if applicable
        if (this.currentPlayerIndex !== -1) {
            scoreRow.classList.add('current-player');
        }
        
        // Add scores for each player
        this.players.forEach((player, index) => {
            const td = document.createElement('td');
            td.textContent = player.score;
            
            // Add current player class if it's this player's turn
            if (index === this.currentPlayerIndex) {
                td.classList.add('current-player');
            }
            
            scoreRow.appendChild(td);
        });
        
        tbody.appendChild(scoreRow);
        
        // Create enhancement rows
        const enhancementTypes = ['Enr', 'CR', 'Fus']; // Shortened labels for tokens
        
        enhancementTypes.forEach((enhType, rowIndex) => {
            const enhRow = document.createElement('tr');
            
            this.players.forEach((player, playerIndex) => {
                const td = document.createElement('td');
                let tokenUsed = false;
                
                // Check if this enhancement has been used
                if (enhType === 'Enr' && player.enhancementsUsed.includes('enrichment')) {
                    tokenUsed = true;
                } else if (enhType === 'CR' && player.enhancementsUsed.includes('controlRod')) {
                    tokenUsed = true;
                } else if (enhType === 'Fus' && player.enhancementsUsed.includes('fusion')) {
                    tokenUsed = true;
                }
                
                td.textContent = enhType;
                if (tokenUsed) {
                    td.classList.add('used');
                    td.style.textDecoration = 'line-through';
                    td.style.opacity = '0.5';
                }
                
                // Add current player class if it's this player's turn
                if (playerIndex === this.currentPlayerIndex) {
                    td.classList.add('current-player');
                }
                
                enhRow.appendChild(td);
            });
            
            tbody.appendChild(enhRow);
        });
        
        // Update enhancement tokens too
        this.updateEnhancementTokensDisplay();
    }
    
    // Update the display of enhancement tokens
    updateEnhancementTokensDisplay() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Manage token displays and states
        const enrichmentToken = document.getElementById('enrichment-token');
        const controlRodToken = document.getElementById('controlrod-token');
        const fusionToken = document.getElementById('fusion-token');
        
        if (currentPlayer) {
            // Update tokens based on current player's state
            enrichmentToken.classList.toggle('used', currentPlayer.enhancementsUsed.includes('enrichment'));
            controlRodToken.classList.toggle('used', currentPlayer.enhancementsUsed.includes('controlRod'));
            fusionToken.classList.toggle('used', currentPlayer.enhancementsUsed.includes('fusion'));
            
            // Update button states
            const enrichmentButton = document.getElementById('enrichment-button');
            const controlRodButton = document.getElementById('controlrod-button');
            const fusionButton = document.getElementById('fusion-button');
            
            if (enrichmentButton) {
                enrichmentButton.disabled = currentPlayer.enhancementsUsed.includes('enrichment') || !this.isPlayerTurn;
            }
            
            if (controlRodButton) {
                controlRodButton.disabled = currentPlayer.enhancementsUsed.includes('controlRod') || !this.isPlayerTurn;
            }
            
            if (fusionButton) {
                fusionButton.disabled = currentPlayer.enhancementsUsed.includes('fusion') || !this.isPlayerTurn;
            }
        }
    }
}

// Expose the class to global scope for traditional script loading
window.GameManager = GameManager;
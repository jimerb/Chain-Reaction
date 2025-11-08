// gameManager.js
// Using globally loaded utility functions

const TARGET_SCORE = 100;

// We're now using the global AssessDiceRoll from diceLogic.js,
// which is loaded via a script tag before this file.
// No need to import or redefine it - checking that it's available:
if (typeof AssessDiceRoll !== 'function') {
    console.error("ERROR: AssessDiceRoll function not found! Make sure diceLogic.js is loaded before gameManager.js");
}

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
        this.phase = 'SETUP'; // SETUP, ROLL, CHAIN_SELECTION, DECISION, CHAIN_SWITCH_DECISION, EXTEND, MELTDOWN_CHECK, SCORING, END
        this.currentRoll = [];
        this.chainNumber = null;
        this.chainDice = [];
        this.potentialChains = [];
        this.newPotentialChain = null; // For storing a new potential chain when one already exists
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
        
        console.log("--- Handling Continue Action ---");
        console.log("   Current chain dice (to keep):", JSON.stringify(this.chainDice));
        
        // Determine which dice to roll (those *not* in the chain)
        const allDiceIndices = this.diceController.dice.map(die => die.userData.id);
        const diceToRollIndices = allDiceIndices.filter(index => !this.chainDice.includes(index));
        
        console.log("   All dice indices:", allDiceIndices);
        console.log("   Indices to roll:", diceToRollIndices);
        
        if (diceToRollIndices.length === 0) {
            console.log("   No remaining dice to roll. Stopping turn instead.");
            this.handleStopAction(); // If all dice are part of the chain, just score.
            return;
        }
        
        this.phase = 'ROLL'; // Change phase *before* async roll call
        this.uiManager.hideAllButtons(); // Hide decision buttons immediately
        this.uiManager.displayMessage(`${this.getCurrentPlayer().name} continues rolling with ${diceToRollIndices.length} dice...`);
        
        // Roll ONLY the dice that are NOT part of the current chain
        this.diceController.rollDice(diceToRollIndices).then(() => {
            console.log("   Roll completed after continue action.");
            this.afterRoll(); // Process the results of the new roll
        });
        
        console.log("--- Exiting Handle Continue Action (Roll Initiated) ---");
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

        // Check if this die is already set aside - if so, ignore the click
        const clickedDieData = this.currentRoll.find(d => d.index === die.userData.id);
        if (!clickedDieData || clickedDieData.setAside) {
            console.log(`   Ignoring click on die ${die.userData.id} - die is already set aside or invalid.`);
            this.uiManager.displayMessage("This die is already part of a chain. Select an active die.", "warning");
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

        // Check if we already have a chain and need to extend it with newly rolled dice
        if (this.chainNumber !== null && this.chainDice.length > 0) {
            console.log(" Checking for chain extension with value:", this.chainNumber);
            
            // First, we need to run AssessDiceRoll on all dice to properly determine chain membership
            // Extract values for AssessDiceRoll (including set aside dice)
            const allDiceValuesArray = this.currentRoll.map(die => die.value);
            console.log(" All Dice Values Array for chain extension check:", allDiceValuesArray);
            
            // Run AssessDiceRoll to get proper chain membership
            const assessmentResult = AssessDiceRoll(allDiceValuesArray);
            console.log(" Extension AssessDiceRoll Result:", JSON.stringify(assessmentResult));
            
            // Find which chain (if any) matches our current chain value
            let chainId = 0; // 0=none, 1=Chain1, 2=Chain2
            if (assessmentResult.Chain1Number === this.chainNumber) {
                chainId = 1;
            } else if (assessmentResult.Chain2Number === this.chainNumber) {
                chainId = 2;
            }
            
            console.log(` Chain with value ${this.chainNumber} has chainId: ${chainId}`);
            
            if (chainId > 0) {
                // Now find newly rolled dice that are part of this chain but not yet set aside
                const matchingNewDice = [];
                
                for (let i = 0; i < 5; i++) {
                    // Check if this die belongs to our chain based on AssessDiceRoll
                    if (assessmentResult[`Die${i+1}`] === chainId) {
                        const die = this.currentRoll[i];
                        if (!die.setAside) {
                            matchingNewDice.push(die.index);
                        }
                    }
                }
                
                console.log(" Found matching new dice for existing chain using AssessDiceRoll:", matchingNewDice);
                
                if (matchingNewDice.length > 0) {
                    console.log(" Extending existing chain with", matchingNewDice.length, "additional dice");
                    
                    // Add these dice to the existing chain
                    this.chainDice = [...this.chainDice, ...matchingNewDice];
                    
                    // Set these dice aside
                    this.diceController.setDiceAside(matchingNewDice);
                    
                    // Highlight all dice in the chain with the same color
                    this.diceController.highlightAllChainDice(this.chainDice);
                    
                    // Update UI to reflect the extended chain
                    const chainScore = this.chainNumber * this.chainDice.length;
                    this.uiManager.updateChainInfo(this.chainDice.length, chainScore);
                    this.uiManager.displayMessage(`Chain extended! ${matchingNewDice.length} additional dice added to your chain of ${this.chainNumber}s (now ${this.chainDice.length} total). Continue or Stop?`, true);
                    
                    // Move to decision phase to let player decide to continue or stop
                    this.phase = 'DECISION';
                    this.uiManager.showTurnChoiceButtons(true);
                    return;
                }
            }

            // At this point, no matching dice were found for the current chain
            // Before declaring MELTDOWN, check if there's a NEW potential chain to switch to
            console.log(" No matching dice for current chain. Checking for new potential chains...");

            // Check if there are any NEW chains (different value) in the active dice
            // Look through the assessment result for other chains
            const newPotentialChains = [];

            // Check Chain1 if it exists and is different from current chain
            if (assessmentResult.Chain1Size >= 2 && assessmentResult.Chain1Number !== this.chainNumber) {
                const chain1DiceIndices = [];
                for (let i = 0; i < 5; i++) {
                    if (assessmentResult[`Die${i+1}`] === 1) {
                        const die = this.currentRoll[i];
                        if (!die.setAside) {
                            chain1DiceIndices.push(die.index);
                        }
                    }
                }
                if (chain1DiceIndices.length >= 2) {
                    newPotentialChains.push({
                        value: assessmentResult.Chain1Number,
                        count: chain1DiceIndices.length,
                        diceIndices: chain1DiceIndices
                    });
                    console.log(` Found new potential Chain1: Value=${assessmentResult.Chain1Number}, Count=${chain1DiceIndices.length}`);
                }
            }

            // Check Chain2 if it exists and is different from current chain
            if (assessmentResult.Chain2Size >= 2 && assessmentResult.Chain2Number !== this.chainNumber) {
                const chain2DiceIndices = [];
                for (let i = 0; i < 5; i++) {
                    if (assessmentResult[`Die${i+1}`] === 2) {
                        const die = this.currentRoll[i];
                        if (!die.setAside) {
                            chain2DiceIndices.push(die.index);
                        }
                    }
                }
                if (chain2DiceIndices.length >= 2) {
                    newPotentialChains.push({
                        value: assessmentResult.Chain2Number,
                        count: chain2DiceIndices.length,
                        diceIndices: chain2DiceIndices
                    });
                    console.log(` Found new potential Chain2: Value=${assessmentResult.Chain2Number}, Count=${chain2DiceIndices.length}`);
                }
            }

            // If a new potential chain exists, offer SWITCH/KEEP choice
            if (newPotentialChains.length > 0) {
                console.log(` Found ${newPotentialChains.length} new potential chain(s). Offering SWITCH/KEEP choice.`);

                // Use the first (or best) new potential chain
                this.newPotentialChain = newPotentialChains[0];

                // Move to chain switch decision phase
                this.phase = 'CHAIN_SWITCH_DECISION';

                // Display the chain switch UI
                const { keepButton, switchButton } = this.uiManager.showChainSwitchButtons(
                    this.chainNumber,
                    this.newPotentialChain.value,
                    this.chainDice.length,
                    this.newPotentialChain.count
                );

                // Attach event listeners to the buttons
                keepButton.addEventListener('click', () => this.handleKeepChainDecision());
                switchButton.addEventListener('click', () => this.handleSwitchChainDecision());

                // Display informative message
                this.uiManager.displayMessage(`New chain available! Keep your current chain or switch to the new one?`);

                return; // Wait for player decision
            }

            // No matching dice AND no new chains were found - this is a MELTDOWN
            console.log(" No matching dice and no new chains - this is a MELTDOWN!");
            this.uiManager.displayMessage("MELTDOWN! No matching dice for your chain and no new chains. Your turn ends with 0 points.", "error");
            this.endTurn();
            return; // Stop further processing for this roll
        }

        // Ensure activeDice are valid
        if (!activeDice || activeDice.length === 0) {
            console.warn(" No active dice found after roll. Ending turn prematurely.");
            this.endTurn();
            return;
        }

        // Extract just the values for AssessDiceRoll
        const allDiceValuesArray = this.currentRoll.map(die => die.value);
        console.log(" All Dice Values Array for AssessDiceRoll:", allDiceValuesArray);

        // Validate that we have the AssessDiceRoll function
        if (typeof AssessDiceRoll !== 'function') {
            console.error("CRITICAL ERROR: AssessDiceRoll function is not available!");
            this.uiManager.displayMessage("Game error: Chain detection function not available. Please refresh the page.", "error");
            return;
        }

        // Use AssessDiceRoll to analyze the dice
        console.log(" Calling AssessDiceRoll with values:", allDiceValuesArray);
        const assessmentResult = AssessDiceRoll(allDiceValuesArray);
        console.log(" AssessDiceRoll Result:", JSON.stringify(assessmentResult));

        // Group active dice by value - keeping this for compatibility with existing code 
        // and because it's useful for additional logic
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

        // --- Chain Detection using AssessDiceRoll --- 
        this.potentialChains = [];
        console.log("--- Starting Chain Detection from AssessDiceRoll Results ---");
        
        // Process Chain 1 if it exists
        if (assessmentResult.Chain1Size >= 2) {
            const chain1DiceIndices = [];
            
            // Map the Die1-Die5 membership to actual dice indices
            for (let i = 0; i < 5; i++) {
                if (assessmentResult[`Die${i+1}`] === 1) { // Die belongs to Chain1
                    // Get the die index from the currentRoll array
                    const dieIndex = this.currentRoll[i].index;
                    chain1DiceIndices.push(dieIndex);
                }
            }
            
            console.log(`   -> Chain 1 Found: Value=${assessmentResult.Chain1Number}, Count=${assessmentResult.Chain1Size}, Indices=${JSON.stringify(chain1DiceIndices)}`);
            
            this.potentialChains.push({
                value: assessmentResult.Chain1Number,
                count: assessmentResult.Chain1Size,
                diceIndices: chain1DiceIndices
            });
        }
        
        // Process Chain 2 if it exists
        if (assessmentResult.Chain2Size >= 2) {
            const chain2DiceIndices = [];
            
            // Map the Die1-Die5 membership to actual dice indices
            for (let i = 0; i < 5; i++) {
                if (assessmentResult[`Die${i+1}`] === 2) { // Die belongs to Chain2
                    // Get the die index from the currentRoll array
                    const dieIndex = this.currentRoll[i].index;
                    chain2DiceIndices.push(dieIndex);
                }
            }
            
            console.log(`   -> Chain 2 Found: Value=${assessmentResult.Chain2Number}, Count=${assessmentResult.Chain2Size}, Indices=${JSON.stringify(chain2DiceIndices)}`);
            
            this.potentialChains.push({
                value: assessmentResult.Chain2Number,
                count: assessmentResult.Chain2Size,
                diceIndices: chain2DiceIndices
            });
        }
        
        console.log("--- Finished Chain Detection ---");
        console.log(" Final Potential Chains Array:", JSON.stringify(this.potentialChains));

        // Check for radiation leak (all 5 dice different values, none set aside)
        if (assessmentResult.ChainCount === 0 && activeDice.length === 5) {
            console.log(" Radiation Leak Detected (All 5 dice have different values)!");
            this.uiManager.displayMessage("Radiation Leak! All 6s will be set aside in future rolls.", true);
            this.radiationLeakValue = 6; // Mark 6s for future removal
            this.endTurn();
            return;
        }

        // --- Handle Game Flow based on Chains --- 
        if (this.potentialChains.length === 0) {
            console.log(" No potential chains found. Ending turn.");
            this.uiManager.displayMessage("No chain combinations possible. Turn ends with no points.");
            this.endTurn(); // Ensure the turn ends properly
            return;
        }
        
        console.log(` Moving to CHAIN_SELECTION phase with ${this.potentialChains.length} potential chains.`);
        this.phase = 'CHAIN_SELECTION';
        this.uiManager.displayMessage(`Select a chain. ${this.potentialChains.length} possible chains.`);

        // Hide roll button during chain selection
        this.uiManager.showRollButton(false);

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
            // If no chains are truly valid, the turn should properly end
            this.uiManager.displayMessage("Error: No valid chains found after final check. Ending turn.", "error");
            this.endTurn(); // Ensure the turn ends properly
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
        
        // Check if we already have a chain set aside in this turn
        const existingSetAsideDice = this.currentRoll.filter(die => die.setAside);
        if (existingSetAsideDice.length > 0) {
            console.log(`   Cannot select new chain: Already have ${existingSetAsideDice.length} dice set aside with value ${this.chainNumber}`);
            this.uiManager.displayMessage(`You've already selected a chain with value ${this.chainNumber}. Continue rolling or stop to score.`, "warning");
            
            // Move to decision phase with the existing chain
            this.phase = 'DECISION';
            this.uiManager.showTurnChoiceButtons(true);
            return;
        }
        
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
        
        // Ensure all chain dice have consistent highlighting
        this.diceController.highlightAllChainDice(this.chainDice);
        
        // Calculate score for this specific chain segment
        const chainScore = this.chainNumber * this.chainDice.length;
        
        // Update UI immediately
        this.uiManager.clearMessages();
        this.uiManager.updateChainInfo(this.chainDice.length, chainScore); // Show initial chain info
        this.uiManager.displayMessage(`Selected chain: ${this.chainDice.length} x ${this.chainNumber}. Continue or Stop?`);
        
        // Move to the decision phase
        this.phase = 'DECISION';
        console.log("   Moving to DECISION phase.");
        
        // Now rely *only* on the UIManager method, which uses .hidden class
        console.log("BUTTONS DEBUG - Before calling showTurnChoiceButtons:");
        console.log("   - Roll button hidden:", this.uiManager.rollButton.classList.contains('hidden'));
        console.log("   - Continue button hidden:", this.uiManager.continueButton.classList.contains('hidden'));
        console.log("   - Stop button hidden:", this.uiManager.stopButton.classList.contains('hidden'));

        this.uiManager.showTurnChoiceButtons(true); 

        console.log("BUTTONS DEBUG - After calling showTurnChoiceButtons:");
        console.log("   - Roll button hidden:", this.uiManager.rollButton.classList.contains('hidden'));
        console.log("   - Continue button hidden:", this.uiManager.continueButton.classList.contains('hidden'));
        console.log("   - Stop button hidden:", this.uiManager.stopButton.classList.contains('hidden'));
        
        console.log("   Buttons set: Continue and Stop buttons shown, Roll button hidden");
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
        this.newPotentialChain = null;
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

    // Add methods to handle chain switch decisions
    handleKeepChainDecision() {
        console.log("--- Handling Keep Chain Decision ---");
        console.log(`   Keeping current chain: ${this.chainDice.length}x${this.chainNumber}`);
        
        // Player decided to keep their current chain
        // Clear the new potential chain
        this.newPotentialChain = null;
        
        // Remove the chain switch buttons
        this.uiManager.removeChainSwitchButtons();
        
        // Use AssessDiceRoll to properly identify any matching dice for the existing chain
        const allDiceValuesArray = this.currentRoll.map(die => die.value);
        console.log(`   All dice values for post-switch assessment: ${allDiceValuesArray}`);
        
        const assessmentResult = AssessDiceRoll(allDiceValuesArray);
        console.log(`   AssessDiceRoll result after keep decision: ${JSON.stringify(assessmentResult)}`);
        
        // Find which chain (if any) matches our current chain value
        let chainId = 0; // 0=none, 1=Chain1, 2=Chain2
        if (assessmentResult.Chain1Number === this.chainNumber) {
            chainId = 1;
        } else if (assessmentResult.Chain2Number === this.chainNumber) {
            chainId = 2;
        }
        
        console.log(`   Chain with value ${this.chainNumber} has chainId: ${chainId}`);
        
        if (chainId > 0) {
            // Find dice that are part of this chain but not yet set aside
            const matchingDice = [];
            
            for (let i = 0; i < 5; i++) {
                // Check if this die belongs to our chain based on AssessDiceRoll
                if (assessmentResult[`Die${i+1}`] === chainId) {
                    const die = this.currentRoll[i];
                    if (!die.setAside) {
                        matchingDice.push(die.index);
                    }
                }
            }
            
            if (matchingDice.length > 0) {
                // Process as a chain extension
                console.log(`   Found ${matchingDice.length} dice matching the current chain after assessment`);
                this.chainDice = [...this.chainDice, ...matchingDice];
                this.diceController.setDiceAside(matchingDice);
            }
        }
        
        // Ensure all chain dice have consistent highlighting
        this.diceController.highlightAllChainDice(this.chainDice);
        
        // Calculate score for chain
        const chainScore = this.chainNumber * this.chainDice.length;
        this.uiManager.updateChainInfo(this.chainDice.length, chainScore);
        
        // Move to decision phase to let player decide to continue or stop
        this.phase = 'DECISION';
        this.uiManager.showTurnChoiceButtons(true);
        this.uiManager.displayMessage(`Keeping your chain of ${this.chainDice.length} ${this.chainNumber}s. Continue or Stop?`);
    }
    
    handleSwitchChainDecision() {
        console.log("--- Handling Switch Chain Decision ---");
        console.log(`   Switching from chain ${this.chainDice.length}x${this.chainNumber} to new chain ${this.newPotentialChain.count}x${this.newPotentialChain.value}`);
        
        // Player decided to switch to the new chain
        
        // First, reset all dice to normal state (un-set-aside)
        this.diceController.resetDice();
        
        // Update chain values
        const oldChainNumber = this.chainNumber;
        const oldChainLength = this.chainDice.length;
        
        this.chainNumber = this.newPotentialChain.value;
        this.chainDice = [...this.newPotentialChain.diceIndices];
        
        // Set aside the dice in the new chain
        this.diceController.setDiceAside(this.chainDice);
        
        // Ensure all chain dice have consistent highlighting
        this.diceController.highlightAllChainDice(this.chainDice);
        
        // Calculate score for new chain
        const chainScore = this.chainNumber * this.chainDice.length;
        this.uiManager.updateChainInfo(this.chainDice.length, chainScore);
        
        // Remove the chain switch buttons
        this.uiManager.removeChainSwitchButtons();
        
        // Clear the new potential chain
        this.newPotentialChain = null;
        
        // Move to decision phase to let player decide to continue or stop
        this.phase = 'DECISION';
        this.uiManager.showTurnChoiceButtons(true);
        this.uiManager.displayMessage(`Switched from ${oldChainLength}x${oldChainNumber} to ${this.chainDice.length}x${this.chainNumber}. Continue or Stop?`);
    }
}

// Expose the class to global scope for traditional script loading
window.GameManager = GameManager;
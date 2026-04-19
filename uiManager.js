// uiManager.js

class UIManager {
    constructor() {
        // Scoreboard Elements
        this.scoreboardTable = document.getElementById('scoreboard');
        this.scoreboardHead = this.scoreboardTable.querySelector('thead');
        this.scoreboardBody = this.scoreboardTable.querySelector('tbody');

        // Message Area Elements
        this.gameMessage = document.getElementById('game-message');
        this.turnInfo = document.getElementById('turn-info');
        this.chainInfo = document.getElementById('chain-info');

        // Control Elements
        this.rollButton = document.getElementById('roll-button');
        this.continueButton = document.getElementById('continue-button');
        this.stopButton = document.getElementById('stop-button');
        
        // Enhancement Elements
        this.enhancementButtons = document.getElementById('enhancement-buttons');
        this.enhancementPrompt = document.getElementById('enhancement-prompt');
        this.enrichmentButton = document.getElementById('enrichment-button');
        this.controlRodButton = document.getElementById('controlrod-button');
        this.fusionButton = document.getElementById('fusion-button');
        
        // UI Screen Elements
        this.setupScreen = document.getElementById('setup-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.enhancementsDisplay = document.getElementById('enhancements-display-area');
    }

    // Screen Management
    showGameScreen() {
        this.setupScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
    }

    // Scoreboard Methods
    initializeScoreboard(players) {
        // Clear any existing content
        this.scoreboardHead.innerHTML = '';
        this.scoreboardBody.innerHTML = '';
        
        // Add player name headers
        const headerRow = document.createElement('tr');
        players.forEach(player => {
            const th = document.createElement('th');
            th.textContent = player.name;
            th.dataset.playerId = player.id;
            headerRow.appendChild(th);
        });
        this.scoreboardHead.appendChild(headerRow);
        
        // Add initial scores (all zeros)
        const bodyRow = document.createElement('tr');
        players.forEach(player => {
            const td = document.createElement('td');
            td.textContent = '0';
            td.dataset.playerId = player.id;
            bodyRow.appendChild(td);
        });
        this.scoreboardBody.appendChild(bodyRow);
    }
    
    updateScore(playerId, newScore) {
        const scoreCell = this.scoreboardBody.querySelector(`tr td[data-player-id="${playerId}"]`);
        if (scoreCell) {
            scoreCell.textContent = newScore;
        }
    }
    
    highlightActivePlayer(playerId) {
        // Remove highlight from all players
        this.scoreboardHead.querySelectorAll('th').forEach(th => {
            th.classList.remove('active-player');
        });
        
        // Add highlight to active player
        const activePlayerHeader = this.scoreboardHead.querySelector(`th[data-player-id="${playerId}"]`);
        if (activePlayerHeader) {
            activePlayerHeader.classList.add('active-player');
        }
    }

    // Message Display Methods
    displayMessage(message, isError = false) {
        this.gameMessage.textContent = message;
        this.gameMessage.classList.toggle('error-message', isError);
        
        // Flash animation if important
        if (isError) {
            this.gameMessage.classList.add('flash');
            setTimeout(() => {
                this.gameMessage.classList.remove('flash');
            }, 1000);
        }
    }
    
    updateTurnInfo(playerName, turnNumber, turnState) {
        this.turnInfo.textContent = `Turn ${turnNumber}: ${playerName}'s ${turnState}`;
    }
    
    updateChainInfo(chainLength, potentialScore = null) {
        if (potentialScore !== null) {
            this.chainInfo.textContent = `Chain Length: ${chainLength} | Potential Score: ${potentialScore}`;
        } else {
            this.chainInfo.textContent = `Chain Length: ${chainLength}`;
        }
    }
    
    clearChainInfo() {
        this.chainInfo.textContent = '';
    }
    
    clearMessages() {
        console.log("UIManager: Clearing all message areas.");
        this.gameMessage.textContent = '';
        this.turnInfo.textContent = '';
        this.chainInfo.textContent = '';
        this.gameMessage.classList.remove('error-message'); // Remove error styling too
    }

    // Button Control Methods - Simplified to use only .hidden class
    showRollButton(enabled = true) {
        this.rollButton.classList.toggle('hidden', !enabled);
        this.rollButton.disabled = !enabled;
    }
    
    showTurnChoiceButtons(enabled = true) {
        this.continueButton.classList.toggle('hidden', !enabled);
        this.continueButton.disabled = !enabled;
        this.stopButton.classList.toggle('hidden', !enabled);
        this.stopButton.disabled = !enabled;
        this.rollButton.classList.add('hidden');
    }
    
    hideAllButtons() {
        this.rollButton.classList.add('hidden');
        this.rollButton.disabled = true;
        this.continueButton.classList.add('hidden');
        this.continueButton.disabled = true;
        this.stopButton.classList.add('hidden');
        this.stopButton.disabled = true;
        this.showEnhancementButtons(false);
        this.removeChainSwitchButtons();
    }
    
    // Keep showContinueButton and showStopButton simple if needed for specific cases,
    // but primarily rely on showRollButton and showTurnChoiceButtons
    showContinueButton(enabled = true) {
        this.continueButton.classList.toggle('hidden', !enabled);
    }
    
    showStopButton(enabled = true) {
        this.stopButton.classList.toggle('hidden', !enabled);
    }
    
    // Add new method for chain switching buttons
    showChainSwitchButtons(currentChainValue, newChainValue, currentChainLength, newChainLength) {
        // Hide standard buttons
        this.hideAllButtons();
        
        // Create switch chain buttons dynamically
        const controlsArea = document.getElementById('controls-area');
        
        // Remove any existing chain switch buttons
        const existingSwitchButtons = document.querySelectorAll('.chain-switch-button');
        existingSwitchButtons.forEach(button => button.remove());
        
        // Calculate scores for both chains
        const currentChainScore = currentChainValue * currentChainLength;
        const newChainScore = newChainValue * newChainLength;
        
        // Create Keep Current Chain button
        const keepButton = document.createElement('button');
        keepButton.textContent = `Keep Chain: ${currentChainLength}x${currentChainValue} (${currentChainScore} pts)`;
        keepButton.classList.add('chain-switch-button', 'keep-chain-button');
        keepButton.id = 'keep-chain-button';
        controlsArea.appendChild(keepButton);
        
        // Create Switch to New Chain button
        const switchButton = document.createElement('button');
        switchButton.textContent = `Switch Chain: ${newChainLength}x${newChainValue} (${newChainScore} pts)`;
        switchButton.classList.add('chain-switch-button', 'switch-chain-button');
        switchButton.id = 'switch-chain-button';
        controlsArea.appendChild(switchButton);
        
        return { keepButton, switchButton };
    }
    
    // Remove chain switching buttons
    removeChainSwitchButtons() {
        const switchButtons = document.querySelectorAll('.chain-switch-button');
        switchButtons.forEach(button => button.remove());
    }
    
    showEnhancementButtons(show = true) {
        this.enhancementButtons.classList.toggle('hidden', !show);
    }

    enableEnhancementButton(type, enable = true) {
        switch (type) {
            case 'enrichment': this.enrichmentButton.disabled = !enable; break;
            case 'controlRod': this.controlRodButton.disabled = !enable; break;
            case 'fusion':     this.fusionButton.disabled = !enable;     break;
        }
    }

    showEnhancementPrompt(message, show = true) {
        this.enhancementPrompt.textContent = message;
        this.enhancementPrompt.classList.toggle('hidden', !show);
    }

    hideEnhancementPrompt() {
        this.enhancementPrompt.textContent = '';
        this.enhancementPrompt.classList.add('hidden');
    }

    /**
     * Refresh the enabled/disabled state of the three enhancement buttons
     * based on what the game manager currently allows for the active player.
     */
    refreshEnhancementButtons(gameManager) {
        this.showEnhancementButtons(true);
        ['enrichment', 'controlRod', 'fusion'].forEach(type => {
            this.enableEnhancementButton(type, gameManager.canUseEnhancement(type));
        });
    }
    
    // Enhancement Token Display
    displayPlayerEnhancements(players, tokenObjects) {
        this.enhancementsDisplay.innerHTML = '';
        
        // Create a mapping for player enhancements to be used in the scoreboard
        const enhancementsByPlayer = {};
        players.forEach(player => {
            enhancementsByPlayer[player.id] = player.enhancements;
        });
        
        // Create enhancement tokens below each player in the scoreboard
        const scoreboardBodyRow = this.scoreboardBody.querySelector('tr');
        if (scoreboardBodyRow) {
            // Add a new row for enhancements below the scores
            const enhancementsRow = document.createElement('tr');
            enhancementsRow.className = 'enhancements-row';
            
            scoreboardBodyRow.querySelectorAll('td').forEach(td => {
                const playerId = td.dataset.playerId;
                const enhancementCell = document.createElement('td');
                enhancementCell.dataset.playerId = playerId;
                
                if (playerId && enhancementsByPlayer[playerId]) {
                    const enhancements = enhancementsByPlayer[playerId];
                    
                    // Create compact enhancement tokens
                    for (const type in enhancements) {
                        const tokenElem = document.createElement('div');
                        tokenElem.className = 'enhancement-token-placeholder';
                        
                        // Add used class if enhancement is used
                        if (enhancements[type] === 'used') {
                            tokenElem.classList.add('used');
                        }
                        
                        // Use shorter display names
                        let displayName = type;
                        switch(type) {
                            case 'enrichment': displayName = 'Enr'; break;
                            case 'controlRod': displayName = 'CR'; break;
                            case 'fusion': displayName = 'Fus'; break;
                        }
                        
                        tokenElem.textContent = displayName;
                        enhancementCell.appendChild(tokenElem);
                    }
                }
                
                enhancementsRow.appendChild(enhancementCell);
            });
            
            this.scoreboardBody.appendChild(enhancementsRow);
        }
    }
    
    updateEnhancementTokenVisual(playerId, type, isUsed) {
        // Update in the scoreboard
        const enhancementsRow = this.scoreboardBody.querySelector('.enhancements-row');
        if (enhancementsRow) {
            const playerCell = enhancementsRow.querySelector(`td[data-player-id="${playerId}"]`);
            if (playerCell) {
                // Find matching token by text content
                let displayName = type;
                switch(type) {
                    case 'enrichment': displayName = 'Enr'; break;
                    case 'controlRod': displayName = 'CR'; break;
                    case 'fusion': displayName = 'Fus'; break;
                }
                
                const tokens = playerCell.querySelectorAll('.enhancement-token-placeholder');
                tokens.forEach(token => {
                    if (token.textContent === displayName) {
                        if (isUsed) {
                            token.classList.add('used');
                        } else {
                            token.classList.remove('used');
                        }
                    }
                });
            }
        }
    }

    // Game End
    displayWinner(winnerInfo) {
        let message;
        
        if (winnerInfo.tie) {
            message = `Tie game between ${winnerInfo.winners.map(p => p.name).join(' and ')} with ${winnerInfo.score} points!`;
        } else {
            message = `${winnerInfo.winners[0].name} wins with ${winnerInfo.score} points!`;
        }
        
        this.displayMessage(message);
        this.hideAllButtons();
        
        // Create a "play again" button
        const playAgainButton = document.createElement('button');
        playAgainButton.textContent = 'Play Again';
        playAgainButton.id = 'play-again-button';
        playAgainButton.addEventListener('click', () => {
            window.location.reload();
        });
        
        // Add to controls area
        document.getElementById('controls-area').appendChild(playAgainButton);
    }
}

// Expose the class to global scope for traditional script loading
window.UIManager = UIManager;
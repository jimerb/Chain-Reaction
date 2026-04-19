// diceController.js
// Using globally loaded THREE from script tag
// Using globally loaded gsap from script tag
// Using globally loaded utility functions

const DICE_SIZE = 1.5; // Increased dice size
const TABLE_WIDTH = 24; // Wider table
const TABLE_DEPTH = 16; // Less deep table
const DICE_POSITIONS = [ // Initial spread-out positions for dice
    new THREE.Vector3(-8, DICE_SIZE / 2 + 0.1, 0),
    new THREE.Vector3(-4, DICE_SIZE / 2 + 0.1, 0),
    new THREE.Vector3(0, DICE_SIZE / 2 + 0.1, 0),
    new THREE.Vector3(4, DICE_SIZE / 2 + 0.1, 0),
    new THREE.Vector3(8, DICE_SIZE / 2 + 0.1, 0),
];

class DiceController {
    constructor(scene, interactionObjects) {
        this.scene = scene;
        this.interactionObjects = interactionObjects;
        this.dice = [];
        this.table = null;
        this.diceValues = [];
        this.enhancementTokens = {};
        
        // Materials and textures
        this.diceMaterials = this.createDiceMaterials();
    }
    
    createDiceMaterials() {
        // BoxGeometry material order is [+X, -X, +Y, -Y, +Z, -Z].
        // Lay out the die so opposite faces sum to 7 (standard die).
        // This ordering must stay in sync with getDiceValueFromRotation in utils.js.
        const faceValuesInGeometryOrder = [1, 6, 2, 5, 3, 4];
        return faceValuesInGeometryOrder.map(value => {
            return new THREE.MeshStandardMaterial({
                map: createDiceTexture(value),
                color: 0xffffff,
                roughness: 0.2,
                metalness: 0.5,
                emissive: 0x222222,
                emissiveIntensity: 0.1
            });
        });
    }
    
    createTable() {
        // Create a rectangular table surface with a reactor-themed look
        const tableGeometry = new THREE.BoxGeometry(TABLE_WIDTH, 0.5, TABLE_DEPTH);
        const tableMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1e3b1e, // Dark reactor green
            roughness: 0.6,
            metalness: 0.3,
            emissive: 0x0a1f0a, // Subtle glow
            emissiveIntensity: 0.2
        });
        
        this.table = new THREE.Mesh(tableGeometry, tableMaterial);
        this.table.position.y = -0.25; // Half height below origin
        this.table.receiveShadow = true;
        
        this.scene.add(this.table);
        
        // Add grid pattern to table for reactor feel
        const gridHelper = new THREE.GridHelper(Math.min(TABLE_WIDTH, TABLE_DEPTH) * 0.8, 10, 0x10ff00, 0x003300);
        gridHelper.position.y = 0.01; // Just above table
        gridHelper.material.opacity = 0.15;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
        
        // Add a thicker, more visible rim around the table
        const rimGeometryLong = new THREE.BoxGeometry(TABLE_WIDTH + 1, 0.8, 0.8);
        const rimGeometryShort = new THREE.BoxGeometry(TABLE_DEPTH + 1, 0.8, 0.8);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d2817, // Darker brown for wooden rim
            roughness: 0.7,
            metalness: 0.2,
            emissive: 0x1f140b, // Subtle glow
            emissiveIntensity: 0.1
        });
        
        // Four sides of the rim
        const edges = [
            { position: new THREE.Vector3(0, 0, TABLE_DEPTH/2 + 0.4), rotation: new THREE.Euler(0, 0, 0), geometry: rimGeometryLong },
            { position: new THREE.Vector3(0, 0, -TABLE_DEPTH/2 - 0.4), rotation: new THREE.Euler(0, 0, 0), geometry: rimGeometryLong },
            { position: new THREE.Vector3(TABLE_WIDTH/2 + 0.4, 0, 0), rotation: new THREE.Euler(0, Math.PI/2, 0), geometry: rimGeometryShort },
            { position: new THREE.Vector3(-TABLE_WIDTH/2 - 0.4, 0, 0), rotation: new THREE.Euler(0, Math.PI/2, 0), geometry: rimGeometryShort }
        ];
        
        edges.forEach(edge => {
            const rim = new THREE.Mesh(edge.geometry, rimMaterial);
            rim.position.copy(edge.position);
            rim.rotation.copy(edge.rotation);
            rim.position.y = 0.15; // Slightly above table
            rim.castShadow = true;
            rim.receiveShadow = true;
            this.scene.add(rim);
        });
        
        // Add corner pieces to the table
        const cornerGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const cornerMaterial = rimMaterial.clone();
        
        const corners = [
            { x: TABLE_WIDTH/2 + 0.4, z: TABLE_DEPTH/2 + 0.4 },
            { x: -TABLE_WIDTH/2 - 0.4, z: TABLE_DEPTH/2 + 0.4 },
            { x: TABLE_WIDTH/2 + 0.4, z: -TABLE_DEPTH/2 - 0.4 },
            { x: -TABLE_WIDTH/2 - 0.4, z: -TABLE_DEPTH/2 - 0.4 }
        ];
        
        corners.forEach(corner => {
            const cornerPiece = new THREE.Mesh(cornerGeometry, cornerMaterial);
            cornerPiece.position.set(corner.x, 0.15, corner.z);
            cornerPiece.castShadow = true;
            cornerPiece.receiveShadow = true;
            this.scene.add(cornerPiece);
        });
        
        // Add subtle ambient light to the table
        const tableLight = new THREE.PointLight(0x10ff00, 1, 25);
        tableLight.position.set(0, 5, 0);
        tableLight.intensity = 0.2;
        this.scene.add(tableLight);
    }
    
    createDice(count = 5) {
        // Create dice with beveled edges for a more realistic look
        const diceGeometry = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 2, 2, 2);
        
        // Create dice with proper material for each face
        for (let i = 0; i < count; i++) {
            const diceMesh = new THREE.Mesh(diceGeometry);

            // Apply materials to each face of the die
            diceMesh.material = this.diceMaterials;

            // Apply yaw before the face rotation so spinning around the
            // vertical never flips which face is up. See utils.js.
            diceMesh.rotation.order = 'YXZ';

            // Position dice in their starting positions
            const position = DICE_POSITIONS[i % DICE_POSITIONS.length].clone();
            diceMesh.position.copy(position);
            
            // Add user data for raycasting and game logic
            diceMesh.userData = {
                id: i,
                type: 'die',
                isInteractable: true,
                isRolling: false,
                isSetAside: false
            };
            
            // Enable shadows
            diceMesh.castShadow = true;
            diceMesh.receiveShadow = true;
            
            // Add to scene and tracking arrays
            this.scene.add(diceMesh);
            this.dice.push(diceMesh);
            this.interactionObjects.push(diceMesh);
        }
    }
    
    rollDice(activeIndices = null) {
        if (!activeIndices) {
            activeIndices = Array.from({ length: this.dice.length }, (_, i) => i);
        }
        console.log("Rolling dice with indices:", activeIndices);

        const tableWidth = TABLE_WIDTH * 0.8;
        const tableDepth = TABLE_DEPTH * 0.7;

        const rollPromises = activeIndices.map((index, i) => {
            const die = this.dice[index];
            die.userData.isRolling = true;

            // Pick the final value uniformly and pre-compute the rotation that
            // puts that face up. This guarantees displayed value == reported value.
            const finalValue = 1 + Math.floor(Math.random() * 6);
            const targetEuler = getRotationForValue(finalValue);

            // Spread dice across the top portion of the table so set-aside
            // dice (bottom row) have room.
            const padding = DICE_SIZE * 1.2;
            const xSpan = tableWidth - padding * 2;
            const zMin = -tableDepth / 2 + padding;
            const zMax = tableDepth / 2 - DICE_SIZE * 3;
            const targetX = (Math.random() * xSpan) - xSpan / 2;
            const targetZ = zMin + Math.random() * Math.max(0.1, zMax - zMin);

            // Accumulate spin distance so the die visibly tumbles, then lands
            // on the chosen orientation.
            const spinTurnsX = Math.floor(2 + Math.random() * 3);
            const spinTurnsZ = Math.floor(2 + Math.random() * 3);

            return new Promise(resolve => {
                const tl = gsap.timeline({
                    onComplete: () => {
                        die.userData.isRolling = false;
                        die.userData.finalValue = finalValue;
                        // Sanity check: quaternion-derived value should match
                        // the chosen final value. Log if not.
                        const observed = getDiceValueFromRotation(die.quaternion);
                        if (observed !== finalValue) {
                            console.warn(`Die ${index}: chosen ${finalValue}, read ${observed}`);
                        } else {
                            console.log(`Die ${index} settled with value: ${finalValue}`);
                        }
                        resolve(die);
                    }
                });

                // Hop up, tumble toward the target orientation, land.
                tl.to(die.position, {
                    x: targetX,
                    y: DICE_SIZE * 2.2,
                    z: targetZ,
                    duration: 0.35,
                    ease: "power2.out"
                }, 0);
                tl.to(die.rotation, {
                    x: targetEuler.x + Math.PI * 2 * spinTurnsX,
                    y: targetEuler.y + Math.PI * 2,
                    z: targetEuler.z + Math.PI * 2 * spinTurnsZ,
                    duration: 0.75,
                    ease: "power2.out"
                }, 0);
                tl.to(die.position, {
                    y: DICE_SIZE / 2 + 0.1,
                    duration: 0.4,
                    ease: "bounce.out"
                }, 0.35);
                // Snap final rotation precisely so readback matches chosen value.
                tl.call(() => {
                    die.rotation.set(targetEuler.x, targetEuler.y, targetEuler.z);
                });
            });
        });

        return Promise.all(rollPromises);
    }
    
    getDiceValues() {
        console.log("Reading final dice values...");
        
        // Get the actual values from the dice, using their stored final values when available
        const diceValues = this.dice.map((die, index) => {
            // Use the stored final value if available, otherwise calculate from current rotation
            const value = die.userData.finalValue || getDiceValueFromRotation(die.quaternion);
            
            console.log(`Die ${index}: value = ${value}, setAside = ${die.userData.isSetAside}`);
            
            return { 
                index, 
                value,
                setAside: die.userData.isSetAside
            };
        });
        
        console.log("All dice values:", diceValues);
        return diceValues;
    }
    
    // Resets the appearance of dice that are NOT set aside
    resetDiceAppearance() {
        console.log("--- Resetting Dice Appearance (Non-Set-Aside Only) ---");
        this.dice.forEach(die => {
            if (!die.userData.isSetAside) {
                // Restore default material (removes highlights)
                die.material = this.diceMaterials;
                console.log(`   Reset appearance for Die ${die.userData.id}`);
            } else {
                console.log(`   Skipping appearance reset for Set Aside Die ${die.userData.id}`);
            }
        });
        console.log("--- Finished Resetting Dice Appearance ---");
    }

    resetDice() {
        console.log("DiceController: Resetting all dice positions and states.");
        this.dice.forEach((die, index) => {
            // Reset position to initial
            if (index < DICE_POSITIONS.length) {
                 die.position.copy(DICE_POSITIONS[index]);
            } else {
                 // Fallback if more dice than defined positions (shouldn't happen with 5)
                 die.position.set(0, DICE_SIZE / 2 + 0.1, 0);
            }
            die.rotation.set(0, 0, 0); // Reset rotation (face 2 up)
            die.userData.isRolling = false;
            die.userData.isSetAside = false;
            die.userData.value = undefined;
            die.userData.finalValue = 2; // Match the reset rotation.
            die.visible = true; // Ensure dice are visible
            // No physics engine currently, so no need to reset physics state
        });
        this.diceValues = []; // Clear cached values
        this.unhighlightDice(); // Remove any leftover highlights
    }

    // Method to highlight all validated potential chains simultaneously
    highlightAllPotentialChains(validatedChains) {
        console.log("--- Highlighting All Potential Chains --- Input (Validated):", JSON.stringify(validatedChains));
        
        // 1. Reset appearance of all non-set-aside dice first
        this.resetDiceAppearance(); 
        
        // 2. Define colors
        const chainColors = [
            new THREE.Color(0x10ff00), // Green
            new THREE.Color(0x00ffff), // Cyan
            new THREE.Color(0xffff00), // Yellow
            new THREE.Color(0xff00ff), // Magenta
            new THREE.Color(0xffa500)  // Orange 
        ];
        
        // 3. Highlight each validated chain with a distinct color
        if (!validatedChains || validatedChains.length === 0) {
             console.log("   No validated chains to highlight. Skipping highlight loop.");
        } else {
            validatedChains.forEach((chain, chainIndex) => {
                const color = chainColors[chainIndex % chainColors.length];
                console.log(`   Highlighting Chain ${chainIndex}: Value=${chain.value}, Color=${color.getHexString()}, Indices=${JSON.stringify(chain.diceIndices)}`);
                
                if (!chain.diceIndices || chain.diceIndices.length === 0) {
                    console.warn(`    Chain ${chainIndex} has no dice indices. Skipping.`);
                    return; // Skip to next chain
                }

                chain.diceIndices.forEach(dieIndex => {
                    console.log(`    Attempting to highlight Die Index: ${dieIndex}`);
                    if (dieIndex >= 0 && dieIndex < this.dice.length) {
                        const die = this.dice[dieIndex];
                        console.log(`     Found Die Object: ID=${die.userData.id}, isSetAside=${die.userData.isSetAside}`);
                        
                        if (die.userData.isSetAside) {
                            console.warn(`     Skipping highlight for Die ${dieIndex} because it is already set aside.`);
                            return; // Skip to next die index
                        }
                        
                        try {
                            // Clone materials for highlighting
                            const highlightMaterials = this.diceMaterials.map(mat => mat.clone());
                            console.log(`      Cloned ${highlightMaterials.length} base materials for Die ${dieIndex}.`);
                            
                            highlightMaterials.forEach((mat, matIndex) => {
                                mat.emissive = color;
                                mat.emissiveIntensity = 0.6; 
                                console.log(`       Set emissive color/intensity for material ${matIndex}`);
                            });
                            
                            die.material = highlightMaterials; 
                            console.log(`      SUCCESS: Assigned highlighted materials to Die ${dieIndex}.`);
                        } catch (error) {
                            console.error(`      ERROR applying highlight to Die ${dieIndex}:`, error);
                        }
                    } else {
                         console.error(`     ERROR: Invalid die index ${dieIndex} encountered.`);
                    }
                }); // End loop through dice indices for one chain
            }); // End loop through all chains
        }
        console.log("--- Finished Highlighting All Potential Chains ---");
    }
    
    // Sets dice aside visually and logically
    setDiceAside(diceIndices) {
        console.log("--- Setting Dice Aside --- Indices:", JSON.stringify(diceIndices));
        
        diceIndices.forEach((index, i) => {
            if (index >= 0 && index < this.dice.length) {
                const die = this.dice[index];
                
                // Mark logically as set aside
                die.userData.isSetAside = true;
                die.userData.isRolling = false; // Ensure it stops any residual rolling state
                console.log(`   Marked Die ${index} as setAside.`);

                // Move visually to the side area
                // Calculate target position based on how many are already there
                const asideIndex = this.dice.filter(d => d.userData.isSetAside).length - 1; // 0-based index of this die among those set aside
                
                // Position at the BOTTOM of the table instead of left side
                // Using negative Z values to place at the bottom
                const targetX = (asideIndex * (DICE_SIZE * 1.2)) - ((diceIndices.length - 1) * DICE_SIZE * 0.6); // Center the group
                const targetZ = TABLE_DEPTH / 2 - DICE_SIZE * 1.5; // Bottom of table with margin
                
                console.log(`   Moving Die ${index} to aside position: X=${targetX.toFixed(2)}, Z=${targetZ.toFixed(2)}`);
                gsap.to(die.position, {
                    x: targetX,
                    y: DICE_SIZE / 2 + 0.1, // Keep it flat on the ground
                    z: targetZ,
                    duration: 0.8,
                    ease: "power2.out"
                });
                
                // Optional: Keep highlight briefly? Or remove it now?
                // For now, let's keep the highlight until the next resetDiceAppearance call.
                // die.material = this.diceMaterials; // Uncomment to remove highlight immediately

            } else {
                console.error(`   Invalid index ${index} passed to setDiceAside.`);
            }
        });
        console.log("--- Finished Setting Dice Aside ---");
    }

    // Resets dice state for a new turn or roll (position, flags, NOT appearance)
    resetDiceState() {
        console.log("--- Resetting Dice State (Position & Flags) ---");
        this.dice.forEach(die => {
            die.userData.isSetAside = false;
            die.userData.isRolling = false;
            die.userData.finalValue = null; // Clear final value
            
            // Reset position to starting grid
            const startPos = DICE_POSITIONS[die.userData.id % DICE_POSITIONS.length];
            console.log(`   Resetting Die ${die.userData.id} to position X=${startPos.x}, Z=${startPos.z}`);
            gsap.to(die.position, {
                x: startPos.x,
                y: DICE_SIZE / 2 + 0.1,
                z: startPos.z,
                duration: 0.5,
                ease: "power1.out"
            });
            gsap.to(die.rotation, { x: 0, y: 0, z: 0, duration: 0.5 });
        });
        console.log("--- Finished Resetting Dice State ---");
    }
    
    // --- Enhancement Token Management ---
    
    // Creates visual tokens for player enhancements
    createEnhancementTokens(players, interactionObjects) {
        console.log("--- Creating Enhancement Tokens ---");
        this.enhancementTokens = {}; // Reset token tracking
        
        const tokenGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 24); // Slightly smaller tokens
        const tokenSpacing = 1.5;
        const playerGroupSpacing = 4.0;
        const tokenRowZ = -TABLE_DEPTH / 2 + 1.5; // Positioned near the front edge

        // Calculate starting position to center the tokens approximately
        const totalWidth = (players.length -1) * playerGroupSpacing + (Object.keys(players[0].enhancements).length) * tokenSpacing;
        let startX = -totalWidth / 2;

        players.forEach((player, playerIndex) => {
            this.enhancementTokens[player.id] = {};
            console.log(` Creating tokens for Player ${player.id} (${player.name})`);

            let currentTokenX = startX + playerIndex * playerGroupSpacing;

            Object.entries(player.enhancements).forEach(([type, isAvailable], tokenIndex) => {
                 console.log(`   - Token Type: ${type}, Available: ${isAvailable}`);
                const texture = createTokenTexture(type, isAvailable ? 'available' : 'used'); // Assumes createTokenTexture exists globally or is imported
                const tokenMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.4,
                    metalness: 0.6
                });

                const token = new THREE.Mesh(tokenGeometry, tokenMaterial);
                token.rotation.x = Math.PI / 2; // Lay flat
                token.position.set(currentTokenX, 0.1, tokenRowZ);

                token.userData = {
                    type: 'enhancementToken',
                    enhancementType: type,
                    playerId: player.id,
                    isInteractable: isAvailable,
                    isAvailable: isAvailable
                };

                token.castShadow = true;
                token.receiveShadow = false; // Tokens probably don't need to receive shadows

                this.scene.add(token);
                this.enhancementTokens[player.id][type] = token;
                console.log(`     Token created at X=${currentTokenX.toFixed(2)}`);

                // Add to interaction objects ONLY if it's available
                if (isAvailable) {
                    interactionObjects.push(token);
                    console.log(`     Added token ${type} for player ${player.id} to interactables.`);
                }
                
                currentTokenX += tokenSpacing; // Move to the next token position within the player group
            });
        });
        console.log("--- Finished Creating Enhancement Tokens ---");
    }

    // Updates the visual state (texture) of a specific token
    updateTokenVisual(playerId, type, newState = 'used') {
        const token = this.enhancementTokens?.[playerId]?.[type];
        if (!token) return;
        
        // Update texture based on new state
        const newTexture = createTokenTexture(type, newState);
        token.material.map = newTexture;
        token.material.needsUpdate = true;
        
        // Update interaction status
        token.userData.isInteractable = (newState === 'available');
        token.userData.isAvailable = (newState === 'available');
        
        // Visual feedback - flip token animation
        gsap.to(token.rotation, {
            z: token.rotation.z + Math.PI * 2, // Full flip
            duration: 1,
            ease: "power1.out"
        });
        
        // If used, change the appearance (greyed out)
        if (newState === 'used') {
            token.material.color.setRGB(0.7, 0.7, 0.7); // Grey tint
            
            // Remove from interaction objects if it was there
            const index = this.interactionObjects.indexOf(token);
            if (index !== -1) {
                this.interactionObjects.splice(index, 1);
            }
        } else {
            token.material.color.setRGB(1, 1, 1); // Reset to normal
        }
    }
    
    // For Enrichment enhancement visualization
    highlightSelectableDiceForEnrichment(diceIndices) {
        diceIndices.forEach(index => {
            const die = this.dice[index];
            // Clone materials to avoid affecting other dice
            const highlightMaterials = this.diceMaterials.map(mat => mat.clone());
            
            // Apply highlight
            highlightMaterials.forEach(mat => {
                mat.emissive = new THREE.Color(0x00ffff); // Cyan glow for enrichment target
                mat.emissiveIntensity = 0.7;
            });
            
            die.material = highlightMaterials;
            
            // Temporarily make it a special interactable type
            die.userData.originalType = die.userData.type;
            die.userData.type = 'selectableDieForEnrichment';
        });
    }
    
    resetEnrichmentHighlights() {
        this.dice.forEach(die => {
            // Reset material
            die.material = this.diceMaterials;
            
            // Reset type if it was changed
            if (die.userData.originalType) {
                die.userData.type = die.userData.originalType;
                delete die.userData.originalType;
            }
        });
    }
    
    highlightDiceForChain(chainValue, diceIndices, color = new THREE.Color(0x10ff00)) {
        console.log(`Highlighting chain: value=${chainValue}, indices=`, diceIndices);
        
        // Reset non-set-aside dice first
        this.resetDiceAppearance();
        
        // Highlight each die in this chain
        diceIndices.forEach(index => {
            if (index >= 0 && index < this.dice.length) {
                const die = this.dice[index];
                
                // Skip dice that are already set aside
                if (die.userData.isSetAside) return;
                
                // Clone materials to avoid affecting other dice
                const highlightMaterials = this.diceMaterials.map(mat => mat.clone());
                
                // Apply glow highlight with the specified color
                highlightMaterials.forEach(mat => {
                    mat.emissive = color;
                    mat.emissiveIntensity = 0.5;
                });
                
                die.material = highlightMaterials;
            } else {
                console.warn(`Invalid die index: ${index}`);
            }
        });
    }
    
    highlightAllChainDice(diceIndices, color = new THREE.Color(0x10ff00)) {
        console.log(`Highlighting entire chain with indices:`, diceIndices);
        
        // Highlight each die in this chain regardless of setAside status
        diceIndices.forEach(index => {
            if (index >= 0 && index < this.dice.length) {
                const die = this.dice[index];
                
                // Clone materials to avoid affecting other dice
                const highlightMaterials = this.diceMaterials.map(mat => mat.clone());
                
                // Apply glow highlight with the specified color
                highlightMaterials.forEach(mat => {
                    mat.emissive = color;
                    mat.emissiveIntensity = 0.5;
                });
                
                die.material = highlightMaterials;
            } else {
                console.warn(`Invalid die index: ${index}`);
            }
        });
    }
    
    // Rotate a die so the given face value (1-6) ends up pointing up,
    // and update its stored final value. Used by Enrichment.
    setDieValue(index, value) {
        if (index < 0 || index >= this.dice.length) {
            console.warn(`setDieValue: invalid index ${index}`);
            return;
        }
        const die = this.dice[index];
        const euler = getRotationForValue(value);
        die.rotation.set(euler.x, euler.y, euler.z);
        die.userData.finalValue = value;
        console.log(`setDieValue: die ${index} set to ${value}`);
    }

    unhighlightDice() {
        this.dice.forEach(die => {
            if (!die.userData.isSetAside) {
                // Restore original materials
                die.material = this.diceMaterials;
            }
        });
    }
} // <-- This closing brace was moved to enclose the unhighlightDice method correctly

// Expose the class to global scope for traditional script loading
window.DiceController = DiceController;
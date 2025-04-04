Code Structure Summary:

    index.html: Sets up the page structure, containers for setup/game screens, scoreboard, messages, canvas, controls, and includes necessary libraries and the main script (main.js).

    style.css: Provides styling for layout, appearance, responsiveness, active player highlights, message formatting, button states, and basic placeholders.

    main.js:

        Initializes the Three.js scene, camera, renderer, lighting, and optional controls.

        Sets up the main game modules (GameManager, UIManager, DiceController, EnhancementController).

        Handles the transition from setup screen to game screen.

        Contains the main animation loop (animate).

        Sets up raycasting for clicking on dice/tokens and delegates clicks via handleInteraction.

        Connects UI button clicks to GameManager or EnhancementController actions.

    gameManager.js:

        Manages game state (players, scores, current turn, phase, etc.).

        Handles the core turn sequence logic (rolling, chain selection, decision, extending, meltdown, scoring).

        Implements specific game rules (Radiation Leak, Critical Mass re-roll).

        Interfaces with UIManager to update the display.

        Interfaces with DiceController to trigger dice actions (roll, set aside).

        Interfaces with EnhancementController to check usability and apply enhancement effects.

        Checks win conditions and handles game end, including the fairness rule and ties.

    uiManager.js:

        Handles all DOM manipulation.

        Updates the scoreboard, messages, turn info, and chain info.

        Manages button visibility and enabled/disabled states.

        Displays enhancement tokens visually (using placeholders for now, interacts with DiceController for 3D updates).

        Highlights the active player.

        Displays winner messages.

    diceController.js:

        Manages all Three.js objects (dice, table, tokens).

        Creates materials and geometries.

        Handles dice rolling animation (using GSAP).

        Determines final dice values (using utils.js).

        Visually moves/highlights dice (set aside, potential chains, enrichment targets).

        Updates enhancement token 3D visuals (material change/flip animation).

    enhancementController.js:

        Mediates the use of enhancements.

        Checks if an enhancement can be used based on game state and player availability.

        Handles player interaction required for enhancements (like selecting a die for Enrichment).

        Calls the appropriate methods in GameManager to apply the enhancement's effect.

        Triggers visual updates for used tokens via DiceController and UIManager.

    utils.js:

        Contains helper functions, notably getDiceValueFromRotation (to determine the top face of a die) and texture generation functions (createDiceTexture, createTokenTexture) using the Canvas API.

This provides a complete, functional structure for the Chain Reaction game as requested. Remember to place the logo.png file in the same directory as the HTML file, or adjust the path accordingly.
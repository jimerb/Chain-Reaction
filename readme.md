# Chain Reaction

A local push-your-luck dice game for 2–5 players, with pass-and-play and computer opponents. Choose your matching group, build or switch chains, and decide when to bank the energy.

## Run

Requires Node.js. No installation is needed to play:

    node server.js

Open http://localhost:8000. The server binds to this computer only. Set PORT to choose a different port. The runtime is plain HTML, CSS and JavaScript, with no CDN or network dependency.

Games last for the current browser session; refreshing starts over. Sound is optional and starts off. The game supports keyboard controls. Full dice rolls visibly travel, tumble, bounce and settle; the Full rolls / Gentle rolls button selects a gentler animation without a rapid flash.

## Rules and review

- [Authoritative rules](docs/Chain%20Reaction%20Game%20Conceptual%20Overview.md)
- [Technical and gameplay review](GAME_DISPLAY_REVIEW.md)

Five matching dice score and end the turn. Switching gives up the old chain's points and returns its dice to the rolling pool, so a new pair or triple can keep going. The final round gives everyone equal turns. Tied leaders play extra rounds.

## Structure

- gameManager.js: independently testable rules, dice ownership, enhancements, scoring and round transitions.
- enhancementController.js: computer decision policy using the engine's public actions.
- diceController.js: dice appearance, tumble animation, and optional synthesized clatter.
- uiManager.js: accessible display and explicit choices derived from game state.
- main.js: setup, interaction lock during rolls, opponent scheduling and audio controls.
- index.html, style.css: fixed tabletop and responsive layout.
- server.js: local static preview.

diceLogic.js, utils.js, the original AssessDiceRoll test data, and dated review notes are retained as legacy references. The revived game does not load them.

## Verification

    node --test tests/engine.test.js
    node tests/sim_play.js
    node tests/balance.js

For browser verification, install development dependencies with npm install, start the server, and run:

    npm run test:ui

The test uses installed Chrome on Windows. On other platforms, install a Playwright Chromium browser (npx playwright install chromium). You may set PLAYWRIGHT_CHROMIUM to an explicit browser executable or TEST_URL to another local server address.

The browser test captures screenshots at 1920, 1366, 1024, 768, 390 and 320 pixel widths and plays complete games through visible controls.

Automated verification establishes rule consistency and operability. It does not establish human enjoyment or physical-device/speaker quality; see the playtest questions in the rules document.

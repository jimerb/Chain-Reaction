# Chain Reaction

**A reactor-themed dice game about knowing when to stop.** Roll five dice, build a matching chain, and bank its energy before a bad roll melts it down. Play against the computer or share a screen with 2–5 players.

**[Play Chain Reaction online](https://jimerb.github.io/Chain-Reaction/)** · No account or download needed.

## Quick start

1. **Set the table.** The default game is you versus Ada, with sound on and a target of 100 points. You can change the players, target (50, 100, or 200), and enhancements before starting.
2. **Roll five dice.** Choose *any* matching group of at least two dice as your chain. For example, `2, 2, 2, 6, 6` offers either three 2s for **6** points or two 6s for **12** points.
3. **Bank or keep rolling.** Your chain scores its face value × the number of held dice. Bank those points to end your turn, or roll the remaining dice to try for more.
4. **Choose what happens next.** Fresh dice matching your chain extend it. A newly rolled pair of another number can replace it. Switching gives up the old chain's *unbanked* points, returns its dice to the rolling pool, and lets you bank or roll again. If both options appear, you choose.
5. **Watch the risk.** A roll with no chain match and no new pair causes a meltdown: **0 points for that turn**, unless an available enhancement rescues you. Five different dice on your opening roll cause a radiation leak: lose up to **10 banked points**. Five matching dice are Critical Mass: score them and end the turn.

The first player to reach the target **does not win immediately**. Finish the current round so everyone gets an equal number of turns; the highest score wins. Tied leaders play extra rounds.

## Reactor enhancements

Each player has one use of each enhancement for the whole game, with at most one enhancement per roll. The labeled LEDs on the reactor gauge show which are unused. Press **Engage** below an LED when its button becomes available; hover over or focus a button for its full rule and current availability.

| Enhancement | What it does |
| --- | --- |
| **Enrichment** | Change one eligible die from the latest roll to a matching value. This can form a pair or extend your chain. |
| **Control Rod** | After a roll misses your chain, bank the chain you held *before* that roll and end your turn. |
| **Fusion** | Bank **two different matching groups**: your held chain and a newly rolled pair or larger group of another number. A pair plus unrelated single dice is not enough. |

The in-game **How to play** guide includes worked examples for splits, switching, Fusion, and turn endings. The [full rules and conceptual overview](docs/Chain%20Reaction%20Game%20Conceptual%20Overview.md) is the authoritative reference.

## Play locally

You need Node.js. No package installation is needed just to play:

```sh
node server.js
```

Open <http://localhost:8000>. The server listens on your computer only. Set `PORT` to choose another port. The game itself is plain HTML, CSS, and JavaScript with no runtime CDN or network dependency.

The game lasts for the current browser session; refreshing starts a new game. Sound defaults on and can be muted at any time. The **Full rolls / Gentle rolls** control adjusts dice motion.

## Project notes

- [Technical and gameplay review](GAME_DISPLAY_REVIEW.md)
- `gameManager.js`: rules, scoring, dice ownership, enhancements, and round transitions.
- `enhancementController.js`: computer choices using the same legal actions as human players.
- `diceController.js`: dice visuals, motion, and generated sound.
- `uiManager.js` and `main.js`: display, controls, and turn scheduling.
- `index.html` and `style.css`: responsive tabletop and reactor interface.
- `server.js`: local static preview. GitHub Pages serves the same static files directly.

`diceLogic.js`, `utils.js`, and older notes and test logs are retained as historical references. The current game does not load them.

## Verification and feedback

The repository includes rules checks, full-game simulations, and browser checks for the main flows and screen sizes. To run them locally, install the development dependencies and use:

```sh
npm install
npm test
npm run test:simulation
npm run test:ui
```

The browser checks need Chrome on Windows or Playwright Chromium elsewhere (`npx playwright install chromium`). `TEST_URL` can point them at another preview. Automated checks confirm behavior; the [playtest questions](docs/Chain%20Reaction%20Game%20Conceptual%20Overview.md#human-playtest-questions) cover enjoyment and balance.

# Chain Reaction — revival review

Reviewed and rebuilt September 27, 2026.

## Outcome

The game now uses a fixed responsive tabletop, CSS 3D dice, a pure rules engine, and explicit controls for every chain option. Desktop, tablet, and phone layouts share the same game rules. There are no external fonts, graphics scripts, or runtime libraries to download.

The current rules incorporate the user's gameplay correction: five matching dice automatically score and end the turn; switching gives up the old chain's points and returns its dice to the rolling pool. A new pair or triple can continue.

The authoritative rules are in [Chain Reaction Game Conceptual Overview](docs/Chain%20Reaction%20Game%20Conceptual%20Overview.md). Earlier review files under docs are historical evidence, not current instructions.

## Problems found and addressed

| Area | Finding in the old implementation | Resolution |
|---|---|---|
| Initial board visibility | Three.js renderer and camera sized while the game screen was hidden. Window resize was the repair path. | Normal document layout; dice are present and visible at game start, with no canvas measurement dependency. |
| Camera | OrbitControls allowed table rotation and tilt. | Fixed tabletop. Only dice animate. |
| Dependencies | Remote graphics libraries and fonts were essential; the old UI test also expected nonexistent local vendor files and a Linux browser path. | Self-contained runtime. Portable test configuration uses installed Chrome on Windows or Playwright Chromium elsewhere. |
| Dice presentation | Small scene, weak hierarchy, confusing highlights. | Large ivory dice with scoring face on top, die IDs, a separate held tray, and a rolling pool. |
| Audio | No coherent roll sound tied to the dice sequence. | Optional layered, filtered clatter scheduled during rolling; audio starts only after user interaction. Sound defaults off. |
| Simultaneous outcomes | Extending the chain could return before presenting a different pair. | Both alternatives are offered with points and dice left. |
| Missed chain | Old keep/switch flow and written examples could imply that “keep” banked a chain that had missed. | Keep is legal only with a fresh match. Switching, rescue, or meltdown are the choices after a miss. |
| Switching continuity | Removing old dice could end a turn immediately after choosing a new triple. | Old chain dice return to the rolling pool; only the new chain counts, and the player chooses whether to continue. |
| Rescue timing | Some failure paths ended the turn before enhancement decisions. | All failure rolls pause for a legal rescue or explicit acceptance. |
| Enhancements | Availability and usage were spread across UI/controller/state paths. | The engine validates timing, ownership, target, once-per-game use, and one-per-roll limits before mutation. |
| Critical Mass | Conflicting rules and special opening rerolls. | Exactly five matches score and end the turn, on opening or continuation. |
| Final round | Immediate wins, one extra turn each, same-round comparisons and shared ties conflicted. | Complete the current round with equal turns, then extra full rounds for tied leaders only. |
| Turn transitions | Outcome messages were rapidly overwritten by reset/next-turn messages. | Human turns have an explicit result and Next action; computer results remain visible briefly. |
| Opponents | Player identity flags did not provide a complete visible opponent workflow. | Explicit pass-and-play or computer mode; bots use the same legal actions. |
| Accessibility | Important decisions depended on 3D clicking and highlight interpretation. | Named native buttons, keyboard focus, semantic dialogs, live decision text, high contrast, reduced motion, and text equivalents for dice. |

## Design choices and limits

The presentation is an animated CSS tabletop, not a physics simulation. Roll values come from the engine and are rendered consistently on the scoring face. Tumble and bounce convey motion without letting collisions or orientation-readback corrupt the outcome.

Audio is synthesized clatter, not a recording of physical dice. Automated verification can establish that the audio context starts and controls work, but cannot establish how convincing it sounds through the user's speakers.

Linear scoring is strategically conservative. The exact analysis in the revised overview explains why low pairs can benefit from another roll while high-value or long chains favor banking. Abilities and endgame pressure matter. Scoring and penalties have not been silently rebalanced.

The game is local to the current browser session. Refreshing starts over. There is no online multiplayer or account system.

## Verification

Run from the repository:

    node --test tests/engine.test.js
    node tests/sim_play.js
    node tests/balance.js
    node tests/ui_test.js

The engine tests cover deterministic rule and transition regressions, including every possible opening roll.

The simulator runs 1,000 seeded complete games using both cautious and adventurous policies. Invariants check physical die count, held-dice stability and all-five-dice conservation, scores, legal actions and termination.

The balance analysis calculates exact expected returns and survival probabilities.

The browser tests interact through pairing, simultaneous extension/switch, recycled dice and triple-switch continuation, all abilities, Critical Mass, handoffs, complete games, dialogs, audio controls and six responsive sizes. They require Playwright and a running local server.

Browser screenshots are generated in tests/screenshots/ and ignored by Git. Human playtesting remains necessary to assess enjoyment, game length, readability on physical devices, and sound quality. The revised overview includes specific playtest questions.

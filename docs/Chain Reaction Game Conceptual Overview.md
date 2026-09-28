# Chain Reaction — rules and conceptual overview

**Revised September 27, 2026.** This is the authoritative ruleset for the revived game. Earlier reviews and test notes describe historical implementations. Where they disagree with this document, follow this version.

## The idea

You are a reactor operator deciding how much energy to risk. Roll five ordinary six-sided dice, choose a group of matching faces, then either bank it or try to improve it. A later roll may let you extend your chain or switch to a different matching group. Your choice of pairing is the central decision.

- **Players:** 2–5, sharing a screen, or one human with computer opponents.
- **Target:** 50 for a short game, 100 standard, or 200 for a longer game.
- **Score:** face value multiplied by the number of dice in the chosen chain.
- **Abilities:** optional; each player receives one Enrichment, one Control Rod and one Fusion for the whole game.
- **Starting player:** the first seat. Take turns in seat order.

Playing time and age suitability need human playtesting. The old “20 minutes” and “8 and up” claims have not been validated.

## A turn, step by step

### 1. Roll all five dice

Every matching group of **at least two dice** is a possible opening chain. Choose one; all dice showing its face join the chain. The game must show every option and must not silently select the largest or highest-scoring group.

**Example:** 2, 2, 2, 6, 6 offers either three 2s for 6 energy or two 6s for 12 energy. Taking the 6s also leaves three dice available, whereas taking the 2s leaves two.

Before choosing, Enrichment can change one die to another face already present, forming or improving a group.

If all five values differ, there is a **Radiation Leak**. You may use Enrichment to create a pair. Otherwise, the turn ends and you lose 10 banked points, stopping at zero. Control Rod and Fusion cannot rescue an opening leak because no chain exists yet.

If all five match, this is **Critical Mass**: automatically score five times the face value and end the turn. There is no reroll or second chain within the same turn. Three or four matching dice are not Critical Mass.

### 2. Bank or continue

After choosing a chain, either:

- **Bank:** add its energy to your total and end the turn.
- **Continue:** roll every available die, leaving held dice untouched.

Only one chain is active. Unselected opening dice remain available, including any other pair you chose not to keep.

### 3. Resolve the next roll

Evaluate only the dice just rolled, before changing the held chain.

| Outcome | Choices |
|---|---|
| One or more dice match your chain, with no different pair | Extend your chain by taking every new match. |
| A different pair or larger group appears, with no chain match | Switch to that new group, use an eligible ability, or accept a meltdown. |
| Both a chain match and a different pair appear | Choose between extending the old chain and switching to the new group. Both options must remain visible. |
| No chain match and no different pair | Use an eligible rescue ability or accept a meltdown. |

**A missed roll cannot preserve the old chain just by choosing “keep.”** Banking was the decision before the roll. After a miss, Control Rod is the ability that saves the pre-roll chain.

A **Meltdown** ends the turn and scores zero for this turn. It does not deduct previously banked points.

### 4. What switching does

Switching gives up **the old chain's unbanked points** and returns all its held dice to the rolling pool. The newly chosen matching group becomes the held chain. All five physical dice stay in play throughout the turn.

**Reported example:** You hold two 2s and roll 3, 3, 3. Switching holds the three 3s, worth 9, and releases the two old 2s. Choose **Bank 9 points** or **Roll 2 dice**. Switching does not bank points or end the turn.

**Pair-to-pair example:** You hold two 3s and roll 5, 5, 2. Switch to two 5s for 10, leaving three dice available: the two released 3s and the newly rolled 2. Roll those three dice if you continue.

**Simultaneous choice:** You hold two 3s and roll 3, 5, 5. Either extend to three 3s (9 energy, two dice to roll), or switch to two 5s (10 energy, three dice to roll).

Released dice must be rolled again before their old faces can qualify as a fresh matching group for switching or Fusion, or as an Enrichment target. This prevents recovering the abandoned chain for free immediately after a switch.

You may switch again on a later roll when a new matching group appears. Only collecting all five dice in the held chain triggers automatic Critical Mass scoring and ends the turn. A pair or triple always leaves dice to roll.

This clarification replaces the earlier interpretation that removed old chain dice from the turn.

## Enhancements

Each token is **once per player per game**. Use no more than **one enhancement per roll**, although different rolls in the same turn may use different tokens. A new roll resets the per-roll limit, not the tokens.

Abilities remain available during result review and, where applicable, after choosing the chain, until the player rolls again or ends the turn. A failing result must pause for a rescue decision.

### Enrichment

Change exactly one available die to your current chain face. Choose which freshly rolled, available die; held dice and dice just released from an old chain cannot be changed.

Before the opening chain is selected, choose an available die and a different face already showing on another die. This can rescue a leak, improve a pair, or create a competing pair.

After a chain has been selected, the changed die immediately joins it. Before a choice has been resolved, the changed roll is reviewed again so the player still chooses their pairing. Completing all five automatically banks Critical Mass.

Opening example: 1, 2, 3, 4, 6 can become 6, 2, 3, 4, 6 by changing the first die. This creates two 6s; the game does not choose an arbitrary face for you.

### Control Rod

Use only after a continuation roll produced **no matches to your current chain**, before resolving that roll. Bank exactly the chain held before the roll, then end the turn.

Control Rod is legal even if a different pair appeared: you can rescue your original chain instead of switching. It is not available on the opening roll, after a successful match, or after another ability was used on the same roll.

### Fusion

With an established chain and a newly rolled matching group of a different face, choose that second group. Bank:

**current held chain + new matches to that chain + the chosen different group**

Then end the turn immediately. The second group needs at least two dice. Old chain dice released by switching must be rerolled before they can count.

Both strands must be real matching groups of at least two dice, with different face values. A held pair of 5s plus a roll of 6, 2, 3 cannot be fused. A held pair of 5s plus 6, 6, 2 can: bank 10 + 12 = **22**, ignoring the unmatched 2. Human and computer players use exactly the same eligibility check. The Fusion result shows both scored strands.

Example: hold two 5s, then roll 5, 6, 6. Fusion banks three 5s plus two 6s: 15 + 12 = **27**.

On an opening split, choose one chain first, then you may fuse the other group from that same roll. Choosing the first group does not consume an enhancement.

## Turn handoff and the winner

Show the completed turn's outcome before the next player begins. The next turn resets all five dice, chain selection, and the per-roll enhancement limit. Banked scores and used tokens persist.

When anyone reaches the target, finish the **current round**. Every player therefore has an equal number of ordinary turns. There is no immediate win and no additional turn for players who already acted that round.

At round end, the highest total wins. If the lead is tied, only the tied leaders play an additional full round, keeping their scores and remaining tokens. Repeat until there is one leader. Someone who was not tied for the lead does not re-enter the tiebreak.

## Is the game fun, and where is the strategy?

The strongest ingredients are visible competing pairs, the risk of losing a chain, choosing when to spend a scarce rescue token, and chasing a leader in the final round. Explicit point totals and dice-left counts make those decisions understandable.

Linear scoring also has a limitation: without enhancements, large chains generally reward stopping. Exact enumeration of one more roll, followed by banking the best legal result, gives:

| Current chain | Bank now | Average score after rolling, including failures |
|---|---:|---:|
| Two 1s | 2 | 4.19 |
| Two 2s | 4 | 5.23 |
| Two 3s | 6 | 6.33 |
| Two 4s | 8 | 7.50 |
| Two 5s | 10 | 8.71 |
| Two 6s | 12 | 9.93 |
| Three 6s | 18 | 8.33 |
| Four 6s | 24 | 5.00 |

These are expected energy points, not chances of winning. A player behind on the final round may rationally accept a worse average return for a chance to win.

The displayed survival odds include either a chain match or a replacement pair: **72.22% with three dice, 44.44% with two, 16.67% with one**. They exclude enhancements and do not promise that the replacement chain is worth as much.

This revision retains the original scoring. It repairs the decision flow without introducing an untested bonus economy. Enhancements supply the main reason to push valuable chains. A more aggressive scoring variant should be designed and compared through playtesting.

## Human playtest questions

Technical tests cannot establish enjoyment. Run several two-player and four-player sessions, with new and returning players, and record:

1. Can a first-time player explain why a missed old chain cannot be kept?
2. Do players see both choices when a roll extends one chain and forms another?
3. Do they understand that switching gives up the old points but returns those dice to the rolling pool?
4. How often do they continue after the first successful roll, and does that decrease sharply once tokens are spent?
5. Are all three abilities used, and do their names match players' expectations?
6. Does the opening 10-point leak feel dramatic or unfair?
7. How long do 50- and 100-point games actually take?
8. Do people want to play again?

Use those observations to decide whether to soften the leak penalty, add a chain-length bonus, or simplify enhancements. None of those balance changes is assumed by the current implementation.

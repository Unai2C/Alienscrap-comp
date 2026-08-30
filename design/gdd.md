# Alien Scrapyard

| | |
|---|---|
| Public experience title | Alien Scrapyard — IP & Content Policy self-check: TBD: final check before submission |
| Deployment target | World: alienscrapyard.dcl.eth. Target date: September 8, 2026. |
| Studio / team name | Imagine to Create |
| Date | August 30, 2026 |
| Contact (Discord + email) | unai.dasilva@imaginetocreate.com |

## 0. TL;DR

| | |
|---|---|
| **Player promise** | Build fast, score big, use artifacts, and beat other players in the alien scrapyard. |
| **Primary player** | For players who enjoy short competitive arcade games, arriving alone or with friends, looking for fast rounds, visible scores and a reason to beat other players. |
| **Current status** | Playable core loop in SDK7; public World link TBD after deployment. |
| **Requested round** | v1 |
| **Live at end of the round** | Players can enter the Alien Scrapyard World, compete in timed build rounds, earn score/crystals/scrap, use artifacts, view rankings and chase weekly rivals. |

## 1. Player Promise

**One-line promise**

Build fast, score big, use artifacts, and beat other players in the alien scrapyard.

## 2. First Minutes & How to Play

| Time | Player experience |
|---|---|
| **0-5 seconds after control** | You see the central arena, an unfinished alien scrap creation, floating pieces, the leaderboard, and player traces from earlier rounds. |
| **5-10 seconds** | You understand the goal: enter the round, place pieces, score points, and beat other players. |
| **10-60 seconds** | You join, choose a piece, place your first block, and see points, scrap, crystals or cooldown feedback change immediately. |
| **1-3 minutes** | You complete a short round or reach the round summary, where MVP, rewards and the top players are shown. |
| **3-10 minutes** | You decide whether to play again, use artifacts, check inventory, or chase a rival on the leaderboard. |
| **Natural stopping point** | Your score, crystals, rank and next rival are saved, so you know who you want to beat next time. |

**Player-facing How to Play**

- Place pieces before time runs out
- Score more with smart placement
- Beat rivals on the leaderboard

## 3. Core Loop

| # | Step (verb) | What the player does (Player input → what they see or hear → what changes) | Why do it again? |
|---|---|---|---|
| 1 | Choose | The player selects cube, cylinder or pyramid with E or the piece buttons → the selected piece is highlighted → the next placement choice is set. | Different pieces score differently and create better or worse timing choices. |
| 2 | Place | The player taps/clicks a matching slot for full points, or presses F to auto-place more easily → the piece fills a slot → score, scrap and cooldown update. | Manual placement gives higher score, while auto-place helps under pressure. |
| 3 | Time | The player waits, moves, watches cooldown and chooses the next target → the cooldown bar shows when they can act again → better rhythm creates better score. | The player can improve by placing faster without wasting high-value pieces. |
| 4 | Boost | The player can use an equipped artifact with 1, 2 or touch → a temporary effect changes placement, cooldown or completion → the round can swing. | Artifacts create comeback moments and tactical decisions. |
| 5 | Finish | Players complete the alien scrap creation or run out of time → the round summary shows scores, MVP and rewards → rankings and crystals update. | The next round is a new chance to beat rivals and earn more. |

| | |
|---|---|
| **One complete loop takes** | About 45-90 seconds. A loop ends when one build is completed or the timer runs out, followed by score, rewards and a reset. |
| **Decision, challenge, or expression** | Strategic efficiency: choose the right piece, decide manual vs auto-place, manage cooldowns, and time artifacts better than other players. |
| **Shortest satisfying visit / typical session** | A shortest satisfying visit is about 3 minutes: one round, one reward, and one ranking check. A typical session is about 8-12 minutes: several rounds, one artifact decision, and a visible rival target. |
| **Why repetition 10 differs from repetition 1** | Rival players, rotating creations, cooldown choices and artifacts should keep later rounds from feeling identical. |

**Pillars**

1. Strategic efficiency
2. Arcade readability
3. Competitive status

## 4. Why Players Come Back

### 4.1 The next-day (D1) sentence

A player who enjoyed their first session returns the next day because the weekly leaderboard race is still open until Sunday 00:00 UTC.

### 4.2 The progression chain

| Moment | What persists or has been built? | What becomes possible next? | How can another player tell? |
|---|---|---|---|
| **End of first session** | Score, crystals, scrap, equipped artifacts, player level and leaderboard position persist. | The player can buy or equip artifacts and chase a better score in the next round. | Other players see their name, level, title, score, trophies or leaderboard position. |
| **End of first week** | The player has a stronger rank, more crystals, more scrap, and progress toward cosmetic park upgrades. | They can spend resources on artifacts and visible upgrades that show long-term progress. | Their title, leaderboard position and visible upgrade progress make them look more established. |
| **Week 3+ — what takes more than two weeks?** | Larger cosmetic park upgrades and rare artifact stock take more than two weeks to build up. | Long-term players gain more ways to prepare for competitive rounds without making new players useless. | Other players see upgraded park elements, stronger titles and repeated names on weekly boards. |

Crystals are earned from successful rounds and high placement, then spent on artifacts and cosmetic upgrades; the main abuse risk is farming low-effort rounds, so rewards should depend on active placement and round completion.

By the end of the first week, you know the names above and below you on the leaderboard. You have earned crystals, bought artifacts, improved your score, and started building visible upgrade progress in the scrapyard. When the weekly reset approaches, you have one clear target: beat the rival just above you before Sunday.

### 4.3 Two return hooks

| Selected hook | Exact trigger or timing | What the player anticipates | Reminder channel + no-reminder fallback |
|---|---|---|---|
| **1. Weekly leaderboard reset** | Weekly reset on Sunday 00:00 UTC. | A fresh chance to beat rivals and win status without needing to catch old scores forever. | Event/community posts can remind players; without reminders, the in-scene leaderboard shows the weekly race and reset rhythm. |
| **2. Collection and upgrades** | After each completed round, crystals and scrap move the player toward artifacts and visible park upgrades. | The player wants one more round because the next artifact or upgrade is close. | Inventory and upgrade panels show progress; without reminders, unfinished progress is visible when the player returns. |

## 5. Social by Design

| | |
|---|---|
| **The repeatable social loop** | Player A joins a live build round and starts scoring → Player B sees their name, score and progress → Player B tries to beat them through better placement, timing and artifact use → MVP, crystals, trophies and leaderboard position make the rivalry visible. |
| **The disappearance test** | If all other players disappeared, the core game would still work, but the main tension would break: there would be no live rivals, no MVP race, and less reason to replay immediately. |
| **From strangers to a group** | A newcomer sees the active build, live scores and player names near the play area, then joins the queue for the next round without voice or chat. The scoreboard shows who to beat. |
| **Recognition & continuity** | Players first learn names through the live ranking, scene leaderboard, MVP summary and trophy displays. Returning players recognize rivals through scores, titles, trophies, records and repeated leaderboard names. |
| **Quiet hours & player counts** | When alone, a player can complete rounds, earn score, scrap and crystals, and chase saved leaderboard records. Social play starts at 2 players; the ideal group is 4-8 players; the v1 tested maximum is 20 players. |
| **Drop-in / drop-out** | A late player can join the queue and start competing in the next round. If someone leaves, the round continues because placed pieces, scores and rankings already belong to the active players who remain. |
| **Visible play (the bystander test)** | A bystander sees avatars placing scrap pieces into a visible build while scores and rankings change in real time. |
| **Shareable play (the memorable moment)** | A player screenshots the final round summary when they win MVP or pass a rival on the leaderboard. |
| **Bring-a-friend** | A player invites a friend when they are close to beating a rival. Another skilled player increases the pace, creates a direct duel, and makes MVP harder to win. |

## 6. Mobile-First

**Every core-loop verb on touch**

| Core-loop verb | How it works with touch controls |
|---|---|
| Choose | The player taps large piece buttons to select cube, cylinder or pyramid. Devices with a keyboard can also use E. |
| Place | The player taps a matching slot for maximum points, or uses F / the assisted action to auto-place more easily. |
| Time | The player reads a large cooldown bar and waits for the next action window. |
| Boost | The player taps one of two equipped artifact slots, or uses 1 and 2 on keyboard. |
| Finish | Round summary, MVP, crystals and ranking are shown clearly without requiring small menu navigation. |

**UI plan**

The mobile UI uses large bottom controls for pieces and artifacts, keeps ranking/profile panels away from movement buttons, and makes cooldown, remaining pieces and rewards readable at a glance.

**Performance**

Target: 60 fps on recommended desktop hardware and 30 fps on a named mobile device and client, both at the v1 tested maximum of 20 players. The main risk is asset and effect weight, especially environment models, animated pieces, particles, trophies and UI textures; the fallback is to reduce mobile particles, hide non-essential trophies, simplify active visuals and keep tutorial assets lightweight.

**Desktop-only dependencies**

TBD: checking the current Decentraland desktop/mobile feature gap before submission. The core loop has touch fallbacks for keyboard actions, so E, F, 1 and 2 are convenience inputs rather than desktop-only requirements.

## 7. World, Look & Story

**Story / world**

Alien Scrapyard is an alien junk arena where unstable scrap is rebuilt into weird trophy creations. Reclaimers compete for score, crystals and status before each build timer runs out.

**Visual direction**

The scene uses oversized scrap pieces, glowing crystals, readable silhouettes and high-contrast arcade UI so the build, selected piece and rivals are clear on small screens. Its signature screenshot is a neon scrapyard arena with floating blocks, leaderboard names and trophy builds showing who won.

## 8. Audience & Comparables

**Primary player + arrival context**

For players who enjoy short competitive arcade games, arriving alone or with friends, looking for fast rounds, visible scores and a reason to beat other players.

**How the first group arrives**

The first group comes from Decentraland Discover, scheduled weekly leaderboard events, and direct community links. Weekly races create a shared reason for players to overlap, while solo players can still play against saved records when no event is live.

**Deliberately not for**

Not for players looking for a slow exploration world or a story-heavy quest.

### Comparables

| | Comparable A — outside Decentraland: Overcooked | Comparable B — outside Decentraland: Fall Guys |
|---|---|---|
| What we observed works | Fast readable tasks, pressure from a timer, simple inputs, short rounds, and chaotic player behaviour make each session easy to understand. | Short competitive rounds, clear visual goals, instant failure/retry energy, readable rivals, and leaderboard-like status make players want one more run. |
| What does not fit our audience or context—and why | Alien Scrapyard should not depend on heavy coordination or voice chat; the competition must work even when players arrive alone. | Alien Scrapyard is not an elimination race or large obstacle course; the skill is efficient building, not surviving movement challenges. |
| What we will do differently | Replace cooking tasks with alien scrap placement, piece values, cooldowns, artifacts and MVP scoring. | Keep the short-round arcade feel, but make the contest about building score, crystals, trophies and repeatable rivalries. |

## 9. 4 Week Plan (v1 scope)

| Week | What is playable / done |
|---|---|
| 1 — Prototype definition | Lock scoring, cooldowns, crystal economy, artifact behaviour, inventory flow and the minimum shop loop. |
| 2 — Core interaction + first-group test | Single-player and multiplayer rounds work with ranking, mobile controls, simplified tutorial, spectator/queued/active states and a first 2-player social threshold. |
| 3 — Core systems refinement | Polish UI, scene leaderboard, round summary, artifact shop, trophy display, audio states and mobile optimization. |
| 4 — Playable prototype, final design direction (mobile playtest) | Final balance pass, minimum template set, desktop/mobile QA, performance fallback rules and World/public repository preparation. |

**What keeps the experience changing after launch**

- Without building a new level, we can change or rotate weekly leaderboard focus, score categories and artifact balance every week.
- If an update is skipped, rivals, rotating builds, artifact timing and weekly resets still create variation.
- If progression creates a power gap, weekly rankings reset; a new or returning player can compete meaningfully within 3 minutes through a fresh round and starter artifacts.
- One player behaviour that would change what we build next: players farming low-effort rounds for crystals instead of competing for strong scores.

**Not building in v1**

1. Advanced park-upgrade construction systems.
2. Full seasonal progression tracks.
3. A large artifact catalogue beyond the first balanced set.

**Top risk + fallback**

The top risk is mobile performance, especially heavy environment assets, UI textures, particles, animated pieces and trophy displays. The fallback is a mobile-light mode with reduced particles, fewer visible trophies, simpler active effects, lighter tutorial assets and stricter limits on non-essential visuals.



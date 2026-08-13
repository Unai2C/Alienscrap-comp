import {
  engine, Entity, Transform, GltfContainer, AudioSource, UiCanvasInformation,
  InputAction, inputSystem, PointerEventType
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { ReactEcsRenderer, UiEntity, Label, ReactEcs } from '@dcl/sdk/react-ecs'
import {
  PART_TYPES, PART_GLB, PART_LABEL, PART_SYMBOL, PartType,
  SCENE_CENTER, PERFORMANCE_LABEL, RoundPhase,
  COUNTDOWN_SECONDS, PERFORMANCE_DURATION_SECONDS, RESET_DELAY_SECONDS
} from './shared/constants'
import { getLevelProgress, getScraperTitle } from './shared/progression'
import {
  getClientSnapshot,
  requestCompleteTutorial,
  requestJoinGame,
  requestLeaveGame,
  requestLeaderboards
} from './game/gameState'

let selectedIndex = 0
// Persistent carried-piece entities.
let feedbackText = ''
let feedbackTimer = 0
let showOnboarding = false
let onboardingAlpha = 0
let onboardingDismissed = true
let floatTime = 0
let ambientEntity: Entity = 0 as Entity
const shoulderEntities: Entity[] = []
const SHOULDER_SCALE = 0.272
let carriedVisible = false
let cinematicCameraActive = false
let profilePanelOpen = false
let rankingPanelOpen = false
type RankingTab = 'SESSION' | 'DAILY' | 'WEEKLY' | 'TOTAL'
const RANKING_TABS: RankingTab[] = ['SESSION', 'DAILY', 'WEEKLY', 'TOTAL']
let rankingTab: RankingTab = 'SESSION'
let lastCommunityMilestoneSeq = 0
let communityTierUpTimer = 0
let joinPromptVisible = true
let tutorialVisible = false
let tutorialStep = 0
let tutorialJoinAfter = false
let tutorialMandatory = false
let tutorialShownForParticipation = false

interface TutorialSlide {
  marker: string
  title: string
  description: string
}

const TUTORIAL_CORE_SLIDES: TutorialSlide[] = [
  {
    marker: '1',
    title: 'CLICK BLOCKS TO VALIDATE',
    description: 'Tap or click the blocks in the template to validate and place them.'
  },
  {
    marker: 'E',
    title: 'CHOOSE THE RIGHT BLOCK',
    description: 'Press E to cycle through the available blocks and select the correct one.'
  },
  {
    marker: '+PTS',
    title: 'EARN POINTS',
    description: 'You earn points for every block you validate correctly.'
  }
]

const TUTORIAL_INFO_SLIDES: TutorialSlide[] = [
  {
    marker: 'PERFECT',
    title: 'COMPLETE THE FULL TEMPLATE',
    description: 'Validate every block before time runs out to earn a Perfect Build and create an orbiting trophy with the builders names.'
  },
  {
    marker: 'MVP',
    title: 'MOST VALUABLE PLAYER',
    description: 'The player with the most points in a round earns MVP. MVP is only awarded when at least two players participate.'
  },
  {
    marker: 'LEVEL',
    title: 'LEVELS AND TITLES',
    description: 'Your total points raise your personal level on a Fibonacci progression. Higher levels unlock new Scraper titles.'
  },
  {
    marker: 'RANK',
    title: 'COMPARE YOUR RESULTS',
    description: 'Session shows the current game. Daily, Weekly and Total leaderboards track persistent points, rounds and MVP awards.'
  },
  {
    marker: 'TIER',
    title: 'COMMUNITY PROGRESS',
    description: 'Every active player contributes points to the shared Scrapyard Tier. Each completed tier requires a larger collective score.'
  },
  {
    marker: 'PROFILE',
    title: 'TRACK YOUR PROGRESS',
    description: 'Open your profile to view rankings. Excellence is your average points per round; Dominance is the percentage of rounds in which you earned MVP.'
  }
]

let lastTutorialInfoIndex = -1
let TUTORIAL_SLIDES: TutorialSlide[] = [...TUTORIAL_CORE_SLIDES, TUTORIAL_INFO_SLIDES[0]]

function selectTutorialInfoSlide(): void {
  let nextIndex = Math.floor(Math.random() * TUTORIAL_INFO_SLIDES.length)
  if (TUTORIAL_INFO_SLIDES.length > 1 && nextIndex === lastTutorialInfoIndex) {
    nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (TUTORIAL_INFO_SLIDES.length - 1))) % TUTORIAL_INFO_SLIDES.length
  }
  lastTutorialInfoIndex = nextIndex
  TUTORIAL_SLIDES = [...TUTORIAL_CORE_SLIDES, TUTORIAL_INFO_SLIDES[nextIndex]]
}

function stepRankingTab(direction: -1 | 1): void {
  const currentIndex = RANKING_TABS.indexOf(rankingTab)
  rankingTab = RANKING_TABS[(currentIndex + direction + RANKING_TABS.length) % RANKING_TABS.length]
  if (rankingTab !== 'SESSION') requestLeaderboards()
}

function openTutorial(joinAfter: boolean, mandatory = false): void {
  selectTutorialInfoSlide()
  tutorialStep = 0
  tutorialJoinAfter = joinAfter
  tutorialMandatory = mandatory
  tutorialVisible = true
  joinPromptVisible = false
  profilePanelOpen = false
  rankingPanelOpen = false
}

function finishTutorial(): void {
  const joinAfter = tutorialJoinAfter
  tutorialVisible = false
  tutorialStep = 0
  tutorialJoinAfter = false
  tutorialMandatory = false
  if (!getClientSnapshot().tutorialCompleted) {
    requestCompleteTutorial(joinAfter)
  } else if (joinAfter) {
    requestJoinGame()
  }
}

function advanceTutorial(): void {
  if (tutorialStep < TUTORIAL_SLIDES.length - 1) {
    tutorialStep += 1
    return
  }
  finishTutorial()
}

const FEEDBACK_DURATION = 2.5

// Public API
export function getSelectedPart(): PartType {
  return PART_TYPES[selectedIndex]
}

export function showFeedback(text: string): void {
  feedbackText = text
  feedbackTimer = FEEDBACK_DURATION
}

export function onWrongPart(required: PartType): void {
  showFeedback(`Wrong piece — need ${PART_LABEL[required]}`)
  playWrong()
}

export function dismissOnboarding(): void {
  if (!onboardingDismissed) onboardingDismissed = true
}

function selectPart(index: number): void {
  if (index < 0 || index >= PART_TYPES.length) return
  selectedIndex = index
  applyShoulderVisibility()
  playPress()
  dismissOnboarding()
}

export function setCinematicCameraActive(active: boolean): void {
  cinematicCameraActive = active
}

// True only when the virtual camera is active.

// Total cinematic seconds left.
function cinematicSecondsLeft(phase: RoundPhase, secondsLeftInPhase: number): number {
  if (phase === 'COUNTDOWN') return secondsLeftInPhase + PERFORMANCE_DURATION_SECONDS + RESET_DELAY_SECONDS
  if (phase === 'PERFORM')   return secondsLeftInPhase + RESET_DELAY_SECONDS
  if (phase === 'RESET')     return secondsLeftInPhase
  return 0
}

// Audio
// Small voice pools allow overlapping one-shot sounds.
const SFX_VOICES = 3
const successVoices: Entity[] = []
const pressVoices: Entity[] = []
const wrongVoices: Entity[] = []
let successCursor = 0
let pressCursor = 0
let wrongCursor = 0

function createVoiceEntity(): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent: engine.PlayerEntity, position: Vector3.Zero() })
  return e
}

function playVoice(voices: Entity[], cursor: number, url: string, volume: number): number {
  if (voices.length === 0) return cursor
  try {
    AudioSource.createOrReplace(voices[cursor], { audioClipUrl: url, playing: true, loop: false, volume })
  } catch (_) {}
  return (cursor + 1) % voices.length
}

export function playSuccess(): void {
  successCursor = playVoice(successVoices, successCursor, 'assets/sounds/success.mp3', 0.75)
}

export function playWrong(): void {
  wrongCursor = playVoice(wrongVoices, wrongCursor, 'assets/sounds/wrong.mp3', 0.75)
}

function playPress(): void {
  pressCursor = playVoice(pressVoices, pressCursor, 'assets/sounds/pressE.mp3', 1.0)
}

function initAudio(): void {
  if (ambientEntity !== (0 as Entity)) return
  for (let i = 0; i < SFX_VOICES; i++) {
    successVoices.push(createVoiceEntity())
    pressVoices.push(createVoiceEntity())
    wrongVoices.push(createVoiceEntity())
  }
  ambientEntity = engine.addEntity()
  Transform.create(ambientEntity, { parent: engine.PlayerEntity, position: Vector3.Zero() })
  AudioSource.create(ambientEntity, {
    audioClipUrl: 'assets/sounds/ambient.mp3',
    playing: true,
    loop: true,
    volume: 0.08
  })
}

// Shoulder carried piece
export function initShoulder(): void {
  if (shoulderEntities.length > 0) return

  for (let i = 0; i < PART_TYPES.length; i++) {
    const entity = engine.addEntity()
    const show = carriedVisible && i === selectedIndex
    Transform.create(entity, {
      position: Vector3.create(0.5, 1.5, -0.5),
      scale: show
        ? Vector3.create(SHOULDER_SCALE, SHOULDER_SCALE, SHOULDER_SCALE)
        : Vector3.Zero(),
      rotation: Quaternion.Identity(),
      parent: engine.PlayerEntity
    })
    GltfContainer.create(entity, {
      src: PART_GLB[PART_TYPES[i]],
      visibleMeshesCollisionMask: 0,
      invisibleMeshesCollisionMask: 0
    })
    shoulderEntities.push(entity)
  }
}

function applyShoulderVisibility(): void {
  for (let i = 0; i < shoulderEntities.length; i++) {
    const show = carriedVisible && i === selectedIndex
    try {
      Transform.getMutable(shoulderEntities[i]).scale = show
        ? Vector3.create(SHOULDER_SCALE, SHOULDER_SCALE, SHOULDER_SCALE)
        : Vector3.Zero()
    } catch (_) {}
  }
}

export function setCarriedVisible(visible: boolean): void {
  carriedVisible = visible
  applyShoulderVisibility()
}

function joinGame(): void {
  const snapshot = getClientSnapshot()
  if (!snapshot.profileLoaded) return
  tutorialShownForParticipation = true
  if (!snapshot.tutorialCompleted) {
    openTutorial(true, true)
    return
  }
  joinPromptVisible = false
  requestJoinGame()
  openTutorial(false, true)
}

function leaveGame(): void {
  joinPromptVisible = false
  profilePanelOpen = false
  rankingPanelOpen = false
  requestLeaveGame()
}

// Input
export function hudInputSystem(_dt: number): void {
  const snapshot = getClientSnapshot()

  const primaryPressed = inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)
  const secondaryPressed = inputSystem.isTriggered(InputAction.IA_SECONDARY, PointerEventType.PET_DOWN)

  if (tutorialVisible) {
    if (secondaryPressed) finishTutorial()
    return
  }

  if (snapshot.playerStatus === 'SPECTATOR') {
    if (primaryPressed && joinPromptVisible && !tutorialVisible) joinGame()
    return
  }

  if (snapshot.phase !== 'BUILD' || snapshot.playerStatus !== 'ACTIVE') return
  if (primaryPressed) selectPart((selectedIndex + 1) % PART_TYPES.length)
}

// Per-frame ticks
let lastHudPhase: RoundPhase = 'IDLE'
let lastHudPlayerStatus = 'SPECTATOR'
let blueFlashAlpha = 0
let blueFlashFired = false

export function hudTickSystem(dt: number): void {
  // Clear build hints on phase changes.
  const snap = getClientSnapshot()
  const phase = snap.phase
  const prevPhase = lastHudPhase
  if (phase !== lastHudPhase) {
    lastHudPhase = phase
    feedbackText = ''
    feedbackTimer = 0
    if (phase === 'BUILD_COMPLETE') {
      profilePanelOpen = false
      rankingPanelOpen = false
    }
  }
  if (snap.playerStatus !== lastHudPlayerStatus) {
    lastHudPlayerStatus = snap.playerStatus
    if (snap.playerStatus === 'SPECTATOR') {
      tutorialShownForParticipation = false
    } else if (snap.playerStatus === 'QUEUED' && !tutorialShownForParticipation) {
      tutorialShownForParticipation = true
      openTutorial(false, true)
    }
    if (!cinematicCameraActive) {
      setCarriedVisible(phase === 'BUILD' && snap.playerStatus === 'ACTIVE')
    }
  }

  if (feedbackTimer > 0) {
    feedbackTimer = Math.max(0, feedbackTimer - dt)
    if (feedbackTimer <= 0) feedbackText = ''
  }
  if (snap.communityMilestoneSeq !== lastCommunityMilestoneSeq) {
    if (snap.communityMilestoneSeq > lastCommunityMilestoneSeq) communityTierUpTimer = 3
    lastCommunityMilestoneSeq = snap.communityMilestoneSeq
  }
  if (communityTierUpTimer > 0) communityTierUpTimer = Math.max(0, communityTierUpTimer - dt)
  if (onboardingDismissed && onboardingAlpha > 0) {
    onboardingAlpha = Math.max(0, onboardingAlpha - dt * 1.8)
    if (onboardingAlpha <= 0) showOnboarding = false
  }

  // Round effects only apply to active players.
  if (snap.playerStatus === 'ACTIVE') {
    if (phase === 'COUNTDOWN' && prevPhase !== 'COUNTDOWN') {
      blueFlashFired = false
    }
    if (!blueFlashFired && phase === 'RESET' && snap.secondsLeft <= 1) {
      blueFlashFired = true
      blueFlashAlpha = 1.0
    }
    if (phase === 'BUILD' && prevPhase !== 'BUILD') {
      blueFlashAlpha = 1.0
    }
  } else {
    blueFlashAlpha = 0
    blueFlashFired = false
  }
  if (blueFlashAlpha > 0) {
    blueFlashAlpha = Math.max(0, blueFlashAlpha - dt * 16)
  }

  floatTime += dt
  const shoulderY = 1.5 + Math.sin(floatTime * 2.5) * 0.06
  for (const entity of shoulderEntities) {
    try {
      Transform.getMutable(entity).position = Vector3.create(0.5, shoulderY, -0.5)
    } catch (_) {}
  }
}

// UI
const PART_UI_COLOR: Record<PartType, { r: number; g: number; b: number; a: number }> = {
  CUBE:     { r: 0.2, g: 0.5, b: 1,    a: 1 },
  CYLINDER: { r: 1,   g: 0.2, b: 0.2,  a: 1 },
  CONE:     { r: 1,   g: 0.85, b: 0,   a: 1 }
}

function phaseLabel(phase: RoundPhase, snap: ReturnType<typeof getClientSnapshot>): string {
  switch (phase) {
    case 'BUILD':          return `BUILD THE ${snap.templateId} — ${snap.secondsLeft}s`
    case 'BUILD_COMPLETE': return snap.performanceType === 'PERFECT' ? PERFORMANCE_LABEL.PERFECT : PERFORMANCE_LABEL.FAIL
    case 'COUNTDOWN':      return `GET READY... ${snap.secondsLeft}`
    case 'PERFORM':        return snap.performanceType === 'PERFECT' ? PERFORMANCE_LABEL.PERFECT : PERFORMANCE_LABEL.FAIL
    case 'RESET':          return 'NEXT ROUND...'
    default:               return 'WAITING...'
  }
}

export function setupUi(): void {
  applyHudRenderer()
}

export function setupAudio(): void {
  try { initAudio() } catch (_) {}
}

function applyHudRenderer(): void {
  ReactEcsRenderer.setUiRenderer(() => {
    const snap = getClientSnapshot()
    const phase = snap.phase
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    const compactUi = canvasInfo !== null && (
      canvasInfo.width < 1500 ||
      canvasInfo.height < 850 ||
      canvasInfo.devicePixelRatio >= 1.75
    )
    const font = (size: number): number => compactUi ? Math.round(size * 1.65) : size
    const blockPanelFont = (size: number): number => compactUi ? Math.round(size * 1.485) : size
    const isPlaying = snap.playerStatus === 'ACTIVE'
    const isQueued = snap.playerStatus === 'QUEUED'
    const isCinematicViewer = isPlaying || isQueued
    const inBuild = phase === 'BUILD' && isPlaying && !snap.isStale
    const inCinematic = cinematicCameraActive && !snap.isStale
    const syncing = !snap.resolved || snap.isStale

    const partsRequired = Math.max(1, snap.partsRequired)
    const pct = Math.round((snap.partsAttached / partsRequired) * 100)
    const isUrgent = inBuild && snap.secondsLeft <= 10
    const label = syncing
      ? 'Syncing with server...'
      : phaseLabel(phase, snap)
    const isSpectator = snap.playerStatus === 'SPECTATOR'
    const showInformationPanels = isPlaying
      ? !inCinematic && phase !== 'BUILD_COMPLETE'
      : !inCinematic
    const participationLabel = isSpectator ? 'JOIN GAME' : isQueued ? 'LEAVE QUEUE' : 'LEAVE GAME'
    const roster = snap.players
    const rosterHeaderHeight = compactUi ? 68 : 52
    const rosterRowHeight = compactUi ? 48 : 30
    const rosterHeight = rosterHeaderHeight + Math.max(1, roster.length) * rosterRowHeight
    const cinematicBarWidth = compactUi ? 1400 : 1200
    const levelProgress = getLevelProgress(snap.totalXp)
    const profileProgressionLabel = levelProgress.isMaxLevel
      ? `LEVEL: ${levelProgress.level}   |   MAX LEVEL`
      : `LEVEL: ${levelProgress.level}   |   PTS TO NEXT LEVEL: ${levelProgress.pointsToNext}`
    const excellence = snap.roundsPlayed > 0 ? Math.round(snap.totalXp / snap.roundsPlayed) : 0
    const dominance = snap.roundsPlayed > 0 ? Math.round((snap.mvpAwards / snap.roundsPlayed) * 100) : 0
    const scraperTitle = getScraperTitle(snap.level)
    const persistentRows = rankingTab === 'DAILY'
      ? snap.leaderboards.daily
      : rankingTab === 'WEEKLY'
        ? snap.leaderboards.weekly
        : snap.leaderboards.total
    const rankingRows = rankingTab === 'SESSION'
      ? roster.map((player) => ({
        name: player.name,
        points: player.sessionPoints,
        level: player.level,
        rounds: player.rounds,
        mvps: player.mvps
      }))
      : persistentRows
    const rankingNameWidth = compactUi ? 260 : 210
    const rankingLevelWidth = compactUi ? 100 : 80
    const rankingRoundsWidth = compactUi ? 130 : 110
    const rankingMvpWidth = compactUi ? 146 : 110
    const rankingPointsWidth = compactUi ? 180 : 140
    const communityRequired = Math.max(1, snap.communityRequiredPoints)
    const communityPct = Math.min(100, Math.round((snap.communityPoints / communityRequired) * 100))
    const communityLabel = communityTierUpTimer > 0
      ? `COMMUNITY PROGRESS   |   SCRAPYARD TIER: ${snap.communityTier} REACHED!`
      : `COMMUNITY PROGRESS   |   SCRAPYARD TIER: ${snap.communityTier}   |   PTS: ${snap.communityPoints} / ${communityRequired}`
    const tutorialSlide = TUTORIAL_SLIDES[tutorialStep]

    return (
      <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute', position: { top: 0, left: 0 } }}>

        {/* Top bar */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 12, left: compactUi ? 300 : 480 },
            width: compactUi ? 1320 : 960,
            height: compactUi ? 64 : 38,
            alignItems: 'center',
            justifyContent: 'center',
            display: syncing || isPlaying ? 'flex' : 'none'
          }}
          uiBackground={{
            color: syncing
              ? { r: 0.25, g: 0.15, b: 0.05, a: 0.92 }
              : { r: 0.05, g: 0.05, b: 0.18, a: 0.92 }
          }}
        >
          <Label
            value={label}
            fontSize={font(isUrgent ? 18 : 15)}
            color={{
              r: 1,
              g: isUrgent ? 0.3 : (syncing ? 0.8 : 1),
              b: isUrgent ? 0.3 : (syncing ? 0.4 : 1),
              a: 1
            }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Player summary */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 88 : 58, left: compactUi ? 1260 : 1420 },
            width: compactUi ? 600 : 420,
            height: compactUi ? 144 : 90,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && snap.profileLoaded && showInformationPanels ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.02, g: 0.12, b: 0.16, a: 0.94 } }}
        >
          <Label
            value={snap.playerName}
            fontSize={font(24)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 48 : 30 }}
            textAlign='middle-center'
          />
          <Label
            value={scraperTitle}
            fontSize={font(18)}
            color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 42 : 26 }}
            textAlign='middle-center'
          />
          <Label
            value={profileProgressionLabel}
            fontSize={font(18)}
            color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 42 : 26 }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Panel controls */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 232 : 148, left: compactUi ? 1260 : 1420 },
            width: compactUi ? 600 : 420,
            height: compactUi ? 64 : 46,
            flexDirection: 'row',
            display: !syncing && snap.profileLoaded && showInformationPanels ? 'flex' : 'none'
          }}
        >
          <UiEntity
            uiTransform={{ width: '50%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: profilePanelOpen
              ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
              : { r: 0.025, g: 0.2, b: 0.25, a: 0.96 }
            }}
            onMouseDown={() => {
              profilePanelOpen = !profilePanelOpen
              rankingPanelOpen = false
            }}
          >
            <Label value='PROFILE' fontSize={font(15)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: '50%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: rankingPanelOpen
              ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
              : { r: 0.025, g: 0.2, b: 0.25, a: 0.96 }
            }}
            onMouseDown={() => {
              rankingPanelOpen = !rankingPanelOpen
              profilePanelOpen = false
              if (rankingPanelOpen) requestLeaderboards()
            }}
          >
            <Label value='RANKING' fontSize={font(15)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
        </UiEntity>

        {/* Active players */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 312 : 210, left: compactUi ? 1400 : 1520 },
            width: compactUi ? 460 : 320,
            height: rosterHeight,
            flexDirection: 'column',
            display: !syncing && showInformationPanels ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.02, g: 0.03, b: 0.09, a: 0.9 } }}
        >
          <Label
            value={`ACTIVE PLAYERS: ${roster.length}`}
            fontSize={font(14)}
            color={{ r: 0.35, g: 0.9, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 62 : 44 }}
            textAlign='middle-center'
          />
          {roster.length === 0 ? (
            <Label
              value='No active players'
              fontSize={font(12)}
              color={{ r: 0.65, g: 0.65, b: 0.75, a: 1 }}
              uiTransform={{ width: '100%', height: rosterRowHeight }}
              textAlign='middle-center'
            />
          ) : roster.map((player, index) => (
            <UiEntity
              key={`${player.name}-${index}`}
              uiTransform={{ width: '100%', height: rosterRowHeight, flexDirection: 'row', alignItems: 'center' }}
              uiBackground={{ color: index === 0
                ? { r: 0.16, g: 0.13, b: 0.03, a: 0.82 }
                : { r: 0.04, g: 0.05, b: 0.12, a: index % 2 === 0 ? 0.65 : 0.35 }
              }}
            >
              <Label
                value={`${index + 1}. ${player.name}`}
                fontSize={font(14)}
                color={index === 0
                  ? { r: 1, g: 0.85, b: 0.25, a: 1 }
                  : { r: 0.9, g: 0.92, b: 1, a: 1 }}
                uiTransform={{ width: compactUi ? 310 : 210, height: rosterRowHeight }}
                textAlign='middle-left'
              />
              <Label
                value={`PTS: ${player.sessionPoints}`}
                fontSize={font(12)}
                color={{ r: 0.2, g: 1, b: 0.85, a: 1 }}
                uiTransform={{ width: compactUi ? 140 : 100, height: rosterRowHeight }}
                textAlign='middle-right'
              />
            </UiEntity>
          ))}
        </UiEntity>

        {/* Profile / ranking panel */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 312 : 210, left: compactUi ? 552 : 760 },
            width: compactUi ? 816 : 680,
            height: profilePanelOpen ? (compactUi ? 450 : 350) : (compactUi ? 700 : 720),
            flexDirection: 'column',
            display: (profilePanelOpen || rankingPanelOpen) && !syncing && snap.profileLoaded && showInformationPanels ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.015, g: 0.025, b: 0.075, a: 0.98 } }}
        >
          <UiEntity
            uiTransform={{ width: '100%', height: compactUi ? 120 : 92, flexDirection: 'row', alignItems: 'center' }}
            uiBackground={{ color: { r: 0.02, g: 0.16, b: 0.18, a: 1 } }}
          >
            <UiEntity uiTransform={{ width: compactUi ? 696 : 580, height: '100%', flexDirection: 'column', justifyContent: 'center' }}>
              <Label
                value={rankingPanelOpen ? 'RANKINGS' : snap.playerName}
                fontSize={font(33)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: compactUi ? 62 : 48 }}
                textAlign='middle-left'
              />
              <Label
                value={rankingPanelOpen ? 'SESSION   |   DAILY   |   WEEKLY   |   TOTAL' : `${scraperTitle}   |   LEVEL: ${snap.level}`}
                fontSize={font(18)}
                color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
                uiTransform={{ width: '100%', height: compactUi ? 45 : 32 }}
                textAlign='middle-left'
              />
            </UiEntity>
            <UiEntity
              uiTransform={{ width: compactUi ? 120 : 80, height: compactUi ? 100 : 72, alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.35, g: 0.08, b: 0.12, a: 1 } }}
              onMouseDown={() => {
                profilePanelOpen = false
                rankingPanelOpen = false
              }}
            >
              <Label value='X' fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 66 : 48, flexDirection: 'row', alignItems: 'center', display: profilePanelOpen ? 'flex' : 'none' }}>
            <Label value={`TOTAL PTS: ${snap.totalXp}`} fontSize={font(20)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '30%', height: '100%' }} textAlign='middle-center' />
            <Label value={`LEVEL: ${levelProgress.level}`} fontSize={font(20)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '20%', height: '100%' }} textAlign='middle-center' />
            <Label
              value={levelProgress.isMaxLevel ? 'MAX LEVEL' : `PTS TO NEXT LEVEL: ${levelProgress.pointsToNext}`}
              fontSize={font(20)}
              color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
              uiTransform={{ width: '50%', height: '100%' }}
              textAlign='middle-center'
            />
          </UiEntity>

          <UiEntity uiTransform={{
            width: '100%',
            height: compactUi ? 150 : 108,
            flexDirection: 'column',
            display: profilePanelOpen ? 'flex' : 'none'
          }}>
            <UiEntity uiTransform={{ width: '100%', height: '33%', flexDirection: 'row' }}>
              <Label value={`SESSION PTS: ${snap.sessionPoints}`} fontSize={font(18)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '33%', height: '100%' }} textAlign='middle-center' />
              <Label value={`CORRECT PIECES: ${snap.correctPieces}`} fontSize={font(18)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '34%', height: '100%' }} textAlign='middle-center' />
              <Label value={`ROUNDS: ${snap.roundsPlayed}`} fontSize={font(18)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '33%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
            <UiEntity uiTransform={{ width: '100%', height: '33%', flexDirection: 'row' }}>
              <Label value={`TIMES MVP: ${snap.mvpAwards}`} fontSize={font(18)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '33%', height: '100%' }} textAlign='middle-center' />
              <Label value={`PERFECT BUILDS: ${snap.perfectBuilds}`} fontSize={font(18)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '34%', height: '100%' }} textAlign='middle-center' />
              <Label value={`#1 BONUSES: ${snap.sessionLeaderAwards}`} fontSize={font(18)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '33%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
            <UiEntity uiTransform={{ width: '100%', height: '34%', flexDirection: 'row' }}>
              <Label value={`EXCELLENCE: ${excellence} PTS / ROUND`} fontSize={font(18)} color={{ r: 0.25, g: 1, b: 0.86, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-center' />
              <Label value={`DOMINANCE: ${dominance}% MVP / ROUND`} fontSize={font(18)} color={{ r: 0.25, g: 1, b: 0.86, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 58 : 44, alignItems: 'center', justifyContent: 'center', display: profilePanelOpen ? 'flex' : 'none' }}>
            <UiEntity
              uiTransform={{ width: '36%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.08, g: 0.26, b: 0.34, a: 1 } }}
              onMouseDown={() => { openTutorial(false) }}
            >
              <Label
                value='TUTORIAL'
                fontSize={font(15)}
                color={{ r: 0.45, g: 0.95, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 58 : 44, flexDirection: 'row', alignItems: 'center', display: rankingPanelOpen ? 'flex' : 'none' }}>
            <UiEntity
              uiTransform={{ width: '15%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.04, g: 0.32, b: 0.31, a: 1 } }}
              onMouseDown={() => { stepRankingTab(-1) }}
            >
              <Label
                value={'<'}
                fontSize={font(25)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
            </UiEntity>
            <Label value='LEADERBOARDS' fontSize={font(23)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '70%', height: '100%' }} textAlign='middle-center' />
            <UiEntity
              uiTransform={{ width: '15%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.04, g: 0.32, b: 0.31, a: 1 } }}
              onMouseDown={() => { stepRankingTab(1) }}
            >
              <Label
                value={'>'}
                fontSize={font(25)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 74 : 54, flexDirection: 'row', display: rankingPanelOpen ? 'flex' : 'none' }}>
            {RANKING_TABS.map((tab) => (
              <UiEntity
                key={tab}
                uiTransform={{ width: '25%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                uiBackground={{ color: rankingTab === tab
                  ? { r: 0.05, g: 0.5, b: 0.44, a: 1 }
                  : { r: 0.04, g: 0.06, b: 0.14, a: 1 }
                }}
                onMouseDown={() => {
                  rankingTab = tab
                  if (tab !== 'SESSION' && snap.leaderboards.generatedAt === 0) requestLeaderboards()
                }}
              >
                <Label value={tab} fontSize={font(18)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
              </UiEntity>
            ))}
          </UiEntity>

          <UiEntity
            uiTransform={{ width: '100%', height: compactUi ? 60 : 42, flexDirection: 'row', alignItems: 'center', display: rankingPanelOpen ? 'flex' : 'none' }}
            uiBackground={{ color: { r: 0.025, g: 0.11, b: 0.16, a: 1 } }}
          >
            <Label value='NAME' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingNameWidth, height: '100%' }} textAlign='middle-left' />
            <Label value='LEVEL' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingLevelWidth, height: '100%' }} textAlign='middle-center' />
            <Label value='ROUNDS' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingRoundsWidth, height: '100%' }} textAlign='middle-center' />
            <Label value='TIMES MVP' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingMvpWidth, height: '100%' }} textAlign='middle-center' />
            <Label value='POINTS' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingPointsWidth, height: '100%' }} textAlign='middle-right' />
          </UiEntity>

          {snap.leaderboardsLoading && rankingTab !== 'SESSION' ? (
            <Label
              value='Loading rankings...'
              fontSize={font(20)}
              color={{ r: 0.65, g: 0.72, b: 0.85, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 80 : 60, display: rankingPanelOpen ? 'flex' : 'none' }}
              textAlign='middle-center'
            />
          ) : rankingRows.length === 0 ? (
            <Label
              value='No scores yet'
              fontSize={font(20)}
              color={{ r: 0.65, g: 0.72, b: 0.85, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 80 : 60, display: rankingPanelOpen ? 'flex' : 'none' }}
              textAlign='middle-center'
            />
          ) : rankingRows.slice(0, compactUi ? 7 : 10).map((player, index) => (
            <UiEntity
              key={`${rankingTab}-${player.name}-${index}`}
              uiTransform={{ width: '100%', height: compactUi ? 54 : 44, flexDirection: 'row', alignItems: 'center', display: rankingPanelOpen ? 'flex' : 'none' }}
              uiBackground={{ color: index === 0
                ? { r: 0.18, g: 0.14, b: 0.025, a: 0.9 }
                : { r: 0.035, g: 0.045, b: 0.11, a: index % 2 === 0 ? 0.72 : 0.42 }
              }}
            >
              <Label
                value={`${index + 1}. ${player.name}`}
                fontSize={font(20)}
                color={index === 0 ? { r: 1, g: 0.85, b: 0.25, a: 1 } : { r: 0.92, g: 0.94, b: 1, a: 1 }}
                uiTransform={{ width: rankingNameWidth, height: '100%' }}
                textAlign='middle-left'
              />
              <Label
                value={`${player.level}`}
                fontSize={font(17)}
                color={{ r: 0.78, g: 0.84, b: 0.95, a: 1 }}
                uiTransform={{ width: rankingLevelWidth, height: '100%' }}
                textAlign='middle-center'
              />
              <Label
                value={`${player.rounds}`}
                fontSize={font(17)}
                color={{ r: 0.78, g: 0.84, b: 0.95, a: 1 }}
                uiTransform={{ width: rankingRoundsWidth, height: '100%' }}
                textAlign='middle-center'
              />
              <Label
                value={`${player.mvps}`}
                fontSize={font(17)}
                color={{ r: 1, g: 0.78, b: 0.25, a: 1 }}
                uiTransform={{ width: rankingMvpWidth, height: '100%' }}
                textAlign='middle-center'
              />
              <Label
                value={`${player.points}`}
                fontSize={font(17)}
                color={{ r: 0.2, g: 1, b: 0.85, a: 1 }}
                uiTransform={{ width: rankingPointsWidth, height: '100%' }}
                textAlign='middle-right'
              />
            </UiEntity>
          ))}
        </UiEntity>

        {/* Join prompt */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 300 : 330, left: compactUi ? 280 : 660 },
            width: compactUi ? 960 : 600,
            height: compactUi ? 360 : 210,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && isSpectator && joinPromptVisible ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.02, g: 0.03, b: 0.12, a: 0.96 } }}
        >
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: compactUi ? 18 : 12, right: compactUi ? 18 : 12 },
              width: compactUi ? 78 : 48,
              height: compactUi ? 78 : 48,
              alignItems: 'center',
              justifyContent: 'center'
            }}
            uiBackground={{ color: { r: 0.34, g: 0.07, b: 0.12, a: 1 } }}
            onMouseDown={() => { joinPromptVisible = false }}
          >
            <Label value='X' fontSize={font(18)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
          <Label
            value='ALIENSCRAPYARD'
            fontSize={font(38)}
            color={{ r: 0.1, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 112 : 70 }}
            textAlign='middle-center'
          />
          <Label
            value='Join the competitive build when you are ready.'
            fontSize={font(16)}
            color={{ r: 0.85, g: 0.88, b: 1, a: 1 }}
            uiTransform={{ width: compactUi ? 880 : 540, height: compactUi ? 100 : 54 }}
            textAlign='middle-center'
          />
          <UiEntity
            uiTransform={{
              width: compactUi ? 430 : 260,
              height: compactUi ? 90 : 54,
              alignItems: 'center',
              justifyContent: 'center',
              display: 'flex'
            }}
            uiBackground={{ color: { r: 0.05, g: 0.55, b: 0.46, a: 1 } }}
            onMouseDown={joinGame}
          >
            <Label
              value='JOIN GAME'
              fontSize={font(20)}
              color={{ r: 1, g: 1, b: 1, a: 1 }}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
            />
          </UiEntity>
        </UiEntity>

        {/* Build HUD */}

        {/* Progress bar */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 96 : 60, left: compactUi ? 400 : 576 },
            width: compactUi ? 920 : 768,
            height: compactUi ? 24 : 14,
            display: inBuild ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.1, g: 0.1, b: 0.1, a: 0.7 } }}
        >
          <UiEntity
            uiTransform={{ width: `${pct}%`, height: compactUi ? 24 : 14 }}
            uiBackground={{ color: { r: 0.15, g: 0.75, b: 0.3, a: 1 } }}
          />
        </UiEntity>

        {/* Progress label */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 124 : 78, left: compactUi ? 400 : 576 },
            width: compactUi ? 920 : 768,
            height: compactUi ? 36 : 20,
            alignItems: 'center',
            justifyContent: 'center',
            display: inBuild ? 'flex' : 'none'
          }}
        >
          <Label
            value={`PIECES: ${snap.partsAttached} / ${snap.partsRequired}`}
            fontSize={font(12)}
            color={{ r: 0.85, g: 0.85, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Piece picker */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 180 : 110, left: compactUi ? 518 : 740 },
            width: compactUi ? 684 : 440,
            height: compactUi ? 171 : 104,
            flexDirection: 'column',
            alignItems: 'center',
            display: inBuild ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.05, g: 0.05, b: 0.2, a: 0.88 } }}
        >
            <Label
              value='CURRENT BLOCK'
              fontSize={blockPanelFont(10)}
              color={{ r: 0.5, g: 0.5, b: 0.9, a: 0.9 }}
              uiTransform={{ width: '100%', height: compactUi ? 32 : 20 }}
              textAlign='middle-center'
            />
            <UiEntity
              uiTransform={{ width: '100%', height: compactUi ? 95 : 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}
            >
              {PART_TYPES.map(pt => {
                const isSelected = pt === PART_TYPES[selectedIndex]
                const col = PART_UI_COLOR[pt]
                const tint = isSelected
                  ? col
                  : { r: col.r * 0.5, g: col.g * 0.5, b: col.b * 0.5, a: 0.6 }
                return (
                  <UiEntity
                    key={pt}
                    uiTransform={{
                      width: compactUi ? 99 : 60,
                      height: compactUi ? 76 : 48,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    uiBackground={{ color: isSelected
                      ? { r: 0.12, g: 0.12, b: 0.45, a: 1 }
                      : { r: 0.02, g: 0.02, b: 0.1, a: 0.8 }
                    }}
                    onMouseDown={() => selectPart(PART_TYPES.indexOf(pt))}
                  >
                    <Label
                      value={PART_SYMBOL[pt]}
                      fontSize={blockPanelFont(pt === 'CYLINDER' ? 32 : 28)}
                      color={tint}
                      uiTransform={{ width: '100%', height: '100%' }}
                      textAlign='middle-center'
                    />
                  </UiEntity>
                )
              })}
            </UiEntity>
            <Label
              value='<color=#00ffff>E</color> change  |  click a slot to place'
              fontSize={blockPanelFont(9)}
              color={{ r: 0.6, g: 0.6, b: 0.8, a: 0.85 }}
              uiTransform={{ width: '100%', height: compactUi ? 32 : 18 }}
              textAlign='middle-center'
            />
        </UiEntity>

        {/* Community progress */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 20 : 18, left: compactUi ? 260 : 460 },
            width: compactUi ? 1400 : 1000,
            height: compactUi ? 88 : 58,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && !inCinematic && !profilePanelOpen && !rankingPanelOpen ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.015, g: 0.055, b: 0.09, a: 0.94 } }}
        >
          <Label
            value={communityLabel}
            fontSize={font(19)}
            color={communityTierUpTimer > 0
              ? { r: 1, g: 0.84, b: 0.25, a: 1 }
              : { r: 0.25, g: 0.95, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 48 : 32 }}
            textAlign='middle-center'
          />
          <UiEntity
            uiTransform={{ width: compactUi ? 1320 : 940, height: compactUi ? 24 : 16 }}
            uiBackground={{ color: { r: 0.04, g: 0.08, b: 0.14, a: 1 } }}
          >
            <UiEntity
              uiTransform={{ width: `${communityPct}%`, height: '100%' }}
              uiBackground={{ color: communityTierUpTimer > 0
                ? { r: 1, g: 0.72, b: 0.16, a: 1 }
                : { r: 0.05, g: 0.78, b: 0.66, a: 1 }
              }}
            />
          </UiEntity>
        </UiEntity>

        {/* Feedback */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 238 : 166, left: compactUi ? 280 : 480 },
            width: compactUi ? 1360 : 960,
            height: compactUi ? 70 : 38,
            alignItems: 'center',
            justifyContent: 'center',
            display: feedbackText !== '' && isPlaying ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.05, g: 0.05, b: 0.2, a: 0.88 } }}
        >
          <Label
            value={feedbackText}
            fontSize={font(14)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Onboarding */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 390 : 280, left: compactUi ? 280 : 480 },
            width: compactUi ? 960 : 960,
            flexDirection: 'column',
            alignItems: 'center',
            display: showOnboarding && inBuild && !inCinematic && !syncing ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.03, g: 0.03, b: 0.15, a: 0.95 * onboardingAlpha } }}
        >
            <Label
              value='ALIENSCRAPYARD'
              fontSize={font(42)}
              color={{ r: 0, g: 1, b: 1, a: onboardingAlpha }}
              uiTransform={{ width: '100%', height: compactUi ? 100 : 60 }}
              textAlign='middle-center'
            />
            <Label
              value='Place the matching pieces before the timer runs out.'
              fontSize={font(20)}
              color={{ r: 0.9, g: 0.9, b: 1, a: onboardingAlpha }}
              uiTransform={{ width: '100%', height: compactUi ? 58 : 32 }}
              textAlign='middle-center'
            />
            <Label
              value='<color=#00ffff>E</color> changes piece. Click a slot to place it.'
              fontSize={font(16)}
              color={{ r: 0.9, g: 0.9, b: 1, a: onboardingAlpha }}
              uiTransform={{ width: '100%', height: compactUi ? 52 : 28 }}
              textAlign='middle-center'
            />
            <Label value=' ' fontSize={6} color={{ r: 0, g: 0, b: 0, a: 0 }} uiTransform={{ width: '100%', height: 10 }} textAlign='middle-center' />
        </UiEntity>

        {/* Round result */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 220 : 300, left: compactUi ? 180 : 420 },
            width: compactUi ? 1560 : 1080,
            height: compactUi ? 560 : 360,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: isPlaying && phase === 'BUILD_COMPLETE' && snap.resolved && !snap.isStale ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.72 } }}
        >
          <Label
            value={snap.performanceType === 'PERFECT' ? 'PERFECT BUILD!' : 'INCOMPLETE'}
            fontSize={font(64)}
            color={snap.performanceType === 'PERFECT'
              ? { r: 0, g: 1, b: 1, a: 1 }
              : { r: 1, g: 0.25, b: 0.15, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 165 : 105 }}
            textAlign='middle-center'
          />
          <Label
            value={`PIECES PLACED: ${snap.partsAttached} / ${snap.partsRequired}`}
            fontSize={font(20)}
            color={{ r: 0.8, g: 0.8, b: 0.9, a: 0.85 }}
            uiTransform={{ width: '100%', height: compactUi ? 68 : 42 }}
            textAlign='middle-center'
          />
          <Label
            value={snap.mvpName
              ? `ROUND MVP: ${snap.mvpName}   |   PTS: ${snap.mvpPoints}`
              : snap.players.length < 2 ? 'MVP: REQUIRES 2+ PLAYERS' : 'MVP: NONE'}
            fontSize={font(24)}
            color={{ r: 1, g: 0.82, b: 0.2, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 82 : 52 }}
            textAlign='middle-center'
          />
          <Label
            value={snap.playerStatus === 'ACTIVE'
              ? levelProgress.isMaxLevel
                ? `YOU EARNED: ${snap.roundPoints} PTS   |   LEVEL: ${levelProgress.level} MAX`
                : `YOU EARNED: ${snap.roundPoints} PTS   |   LEVEL: ${levelProgress.level}   |   PTS TO NEXT LEVEL: ${levelProgress.pointsToNext}`
              : 'JOIN GAME TO SCORE IN THE NEXT ROUND'}
            fontSize={font(20)}
            color={{ r: 0.2, g: 1, b: 0.85, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 82 : 52 }}
            textAlign='middle-center'
          />
          <Label
            value='NEXT ROUND STARTS AUTOMATICALLY'
            fontSize={font(15)}
            color={{ r: 0.65, g: 0.7, b: 0.85, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 62 : 38 }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Cinematic overlay */}
        <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', display: inCinematic && isCinematicViewer ? 'flex' : 'none' }}>

          {/* Letterbox bars */}
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: 140 }}
            uiBackground={{ color: { r: 0, g: 0, b: 0, a: 1 } }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { bottom: 0, left: 0 }, width: '100%', height: 140 }}
            uiBackground={{ color: { r: 0, g: 0, b: 0, a: 1 } }}
          />

          {/* Edge glow */}
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 136, left: 0 }, width: '100%', height: 4 }}
            uiBackground={{ color: { r: 0.3, g: 0.6, b: 1, a: 0.5 + Math.sin(floatTime * 2.2) * 0.3 } }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { bottom: 136, left: 0 }, width: '100%', height: 4 }}
            uiBackground={{ color: { r: 0.3, g: 0.6, b: 1, a: 0.5 + Math.sin(floatTime * 2.2 + 1.5) * 0.3 } }}
          />

          {/* Accent bars */}
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 140, left: 0 }, width: 4, height: 800 }}
            uiBackground={{ color: { r: 0.3, g: 0.6, b: 1, a: Math.max(0.1, 0.4 + Math.sin(floatTime * 2.5) * 0.4) } }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 140, right: 0 }, width: 4, height: 800 }}
            uiBackground={{ color: { r: 0.3, g: 0.6, b: 1, a: Math.max(0.1, 0.4 + Math.sin(floatTime * 2.5 + Math.PI) * 0.4) } }}
          />

          {/* Scan line */}
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: Math.round(140 + ((Math.sin(floatTime * 0.75) + 1) / 2) * 790), left: 0 },
              width: '100%', height: 3
            }}
            uiBackground={{ color: { r: 0.5, g: 0.8, b: 1, a: 0.45 } }}
          />

          {/* Countdown label */}
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 162, left: 0 }, width: '100%', height: 58, alignItems: 'center', justifyContent: 'center' }}
          >
            <Label
              value='NEXT BUILD IN'
              fontSize={font(26)}
              color={{ r: 0.75, g: 0.85, b: 1, a: Math.max(0.4, 0.7 + Math.sin(floatTime * 3.5) * 0.3) }}
              uiTransform={{ width: '100%', height: 58 }}
              textAlign='middle-center'
            />
          </UiEntity>

          {/* Countdown number */}
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: compactUi ? 220 : 210, left: 0 },
              width: '100%',
              height: compactUi ? 300 : 200,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Label
              value={`${Math.max(0, cinematicSecondsLeft(phase, snap.secondsLeft))}`}
              fontSize={font(160)}
              color={{
                r: Math.min(1, 0.75 + Math.sin(floatTime * 2.0) * 0.25),
                g: Math.max(0, 0.75 + Math.sin(floatTime * 2.0 + 1.2) * 0.25),
                b: Math.max(0, 0.1  + Math.sin(floatTime * 2.0 + 2.4) * 0.15),
                a: 1
              }}
              uiTransform={{ width: '100%', height: compactUi ? 300 : 200 }}
              textAlign='middle-center'
            />
          </UiEntity>

          {/* Cinematic progress */}
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: compactUi ? 550 : 428, left: compactUi ? 260 : 360 },
              width: cinematicBarWidth,
              height: compactUi ? 8 : 5
            }}
            uiBackground={{ color: { r: 0.08, g: 0.08, b: 0.25, a: 0.7 } }}
          >
            <UiEntity
              uiTransform={{
                width: Math.round(
                  (Math.max(0, cinematicSecondsLeft(phase, snap.secondsLeft)) /
                  (COUNTDOWN_SECONDS + PERFORMANCE_DURATION_SECONDS + RESET_DELAY_SECONDS)) * cinematicBarWidth
                ),
                height: compactUi ? 8 : 5
              }}
              uiBackground={{ color: { r: 0.3, g: 0.65, b: 1, a: 0.85 } }}
            />
          </UiEntity>

        </UiEntity>

        {/* Cyan flash */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: '100%', height: '100%',
            display: blueFlashAlpha > 0 && isPlaying ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0, g: 1, b: 1, a: blueFlashAlpha } }}
        />

        {/* Participation control */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 132 : 92, left: compactUi ? 260 : 460 },
            width: compactUi ? 160 : 260,
            height: compactUi ? 64 : 58,
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && !tutorialVisible ? 'flex' : 'none'
          }}
          uiBackground={{ color: isSpectator
            ? { r: 0.04, g: 0.5, b: 0.42, a: 0.98 }
            : { r: 0.42, g: 0.07, b: 0.12, a: 0.98 }
          }}
          onMouseDown={() => { isSpectator ? joinGame() : leaveGame() }}
        >
          <Label
            value={participationLabel}
            fontSize={font(15)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Tutorial */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            display: tutorialVisible ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.005, g: 0.01, b: 0.04, a: 0.86 } }}
        >
          <UiEntity
            uiTransform={{
              width: compactUi ? 840 : 760,
              height: compactUi ? 590 : 500,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            uiBackground={{ color: { r: 0.015, g: 0.055, b: 0.1, a: 0.99 } }}
          >
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { top: compactUi ? 18 : 14, right: compactUi ? 18 : 14 },
                width: compactUi ? 64 : 48,
                height: compactUi ? 64 : 48,
                alignItems: 'center',
                justifyContent: 'center',
                display: tutorialMandatory ? 'none' : 'flex'
              }}
              uiBackground={{ color: { r: 0.34, g: 0.07, b: 0.12, a: 1 } }}
              onMouseDown={() => { tutorialVisible = false }}
            >
              <Label value='X' fontSize={font(18)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>

            <Label
              value={`TUTORIAL   |   STEP ${tutorialStep + 1} / ${TUTORIAL_SLIDES.length}`}
              fontSize={font(16)}
              color={{ r: 0.3, g: 0.85, b: 1, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 62 : 48 }}
              textAlign='middle-center'
            />
            <Label
              value={tutorialSlide.marker}
              fontSize={font(tutorialSlide.marker.length > 4 ? 46 : 72)}
              color={{ r: 0.1, g: 1, b: 0.88, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 155 : 130 }}
              textAlign='middle-center'
            />
            <Label
              value={tutorialSlide.title}
              fontSize={font(28)}
              color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
              uiTransform={{ width: '92%', height: compactUi ? 82 : 66 }}
              textAlign='middle-center'
            />
            <Label
              value={tutorialSlide.description}
              fontSize={font(18)}
              color={{ r: 0.88, g: 0.92, b: 1, a: 1 }}
              uiTransform={{ width: '86%', height: compactUi ? 112 : 86 }}
              textAlign='middle-center'
            />
            <UiEntity uiTransform={{ width: compactUi ? 330 : 280, height: compactUi ? 82 : 62, alignItems: 'center', justifyContent: 'center' }} uiBackground={{ color: { r: 0.04, g: 0.52, b: 0.44, a: 1 } }} onMouseDown={advanceTutorial}>
              <Label
                value={tutorialStep === TUTORIAL_SLIDES.length - 1
                  ? tutorialJoinAfter ? 'JOIN GAME' : tutorialMandatory ? 'READY' : 'DONE'
                  : 'NEXT'}
                fontSize={font(20)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
            </UiEntity>
            <Label
              value='PRESS F TO SKIP'
              fontSize={font(13)}
              color={{ r: 0.58, g: 0.72, b: 0.82, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 42 : 30 }}
              textAlign='middle-center'
            />
          </UiEntity>
        </UiEntity>

      </UiEntity>
    )
  }, { virtualWidth: 1920, virtualHeight: 1080 })
}

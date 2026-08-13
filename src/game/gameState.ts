import { engine, Transform } from '@dcl/sdk/ecs'
import { room } from '../shared/alienMessages'
import { HEARTBEAT_SECONDS, RoundPhase, STALE_THRESHOLD_MS } from '../shared/constants'

export type PlayerStatus = 'SPECTATOR' | 'QUEUED' | 'ACTIVE'

export interface RosterPlayer {
  name: string
  sessionPoints: number
  roundPoints: number
  correctPieces: number
  level: number
  rounds: number
  mvps: number
}

export interface LeaderboardPlayer {
  name: string
  points: number
  level: number
  rounds: number
  mvps: number
}

export interface PersistentLeaderboards {
  daily: LeaderboardPlayer[]
  weekly: LeaderboardPlayer[]
  total: LeaderboardPlayer[]
  generatedAt: number
}

export interface TrophySnapshot {
  id: number
  templateId: string
  builders: string
}

export interface ClientSnapshot {
  resolved: boolean
  phase: RoundPhase
  roundNumber: number
  templateId: string
  partsAttached: number
  partsRequired: number
  occupiedMask: number
  performanceType: string
  builders: string
  players: RosterPlayer[]
  trophies: TrophySnapshot[]
  mvpName: string
  mvpPoints: number
  difficulty: string
  secondsLeft: number
  stateSeq: number
  communityTier: number
  communityPoints: number
  communityRequiredPoints: number
  communityMilestoneSeq: number
  ageMs: number
  isStale: boolean
  playerStatus: PlayerStatus
  playerName: string
  sessionPoints: number
  roundPoints: number
  correctPieces: number
  profileLoaded: boolean
  tutorialCompleted: boolean
  totalXp: number
  level: number
  roundsPlayed: number
  perfectBuilds: number
  mvpAwards: number
  sessionLeaderAwards: number
  leaderboards: PersistentLeaderboards
  leaderboardsLoading: boolean
  cinematicEligible: boolean
}

function emptySnapshot(): ClientSnapshot {
  return {
    resolved: false,
    phase: 'IDLE',
    roundNumber: 0,
    templateId: '',
    partsAttached: 0,
    partsRequired: 0,
    occupiedMask: 0,
    performanceType: '',
    builders: '',
    players: [],
    trophies: [],
    mvpName: '',
    mvpPoints: 0,
    difficulty: 'SOLO',
    secondsLeft: 0,
    stateSeq: 0,
    communityTier: 1,
    communityPoints: 0,
    communityRequiredPoints: 1000,
    communityMilestoneSeq: 0,
    ageMs: Number.POSITIVE_INFINITY,
    isStale: true,
    playerStatus: 'SPECTATOR',
    playerName: 'Scraper',
    sessionPoints: 0,
    roundPoints: 0,
    correctPieces: 0,
    profileLoaded: false,
    tutorialCompleted: false,
    totalXp: 0,
    level: 1,
    roundsPlayed: 0,
    perfectBuilds: 0,
    mvpAwards: 0,
    sessionLeaderAwards: 0,
    leaderboards: { daily: [], weekly: [], total: [], generatedAt: 0 },
    leaderboardsLoading: false,
    cinematicEligible: false
  }
}

let snapshot = emptySnapshot()
let lastStateAtMs = 0
let initialized = false
let lastLoggedPhase: RoundPhase = 'IDLE'
let lastLoggedRound = 0
let heartbeatAccumulator = 0
let cinematicEligibleRound = -1
let manualJoinRequired = true
let wasInsideScene: boolean | null = null

// Scene bounds.
const SCENE_MIN_X = -15.75
const SCENE_MAX_X = 63.75
const SCENE_MIN_Z = -15.75
const SCENE_MAX_Z = 63.75

function isPlayerInsideScene(): boolean {
  const position = Transform.getOrNull(engine.PlayerEntity)?.position
  if (!position) return true
  return position.x >= SCENE_MIN_X && position.x <= SCENE_MAX_X &&
    position.z >= SCENE_MIN_Z && position.z <= SCENE_MAX_Z
}

function forceSpectator(reason: string): void {
  manualJoinRequired = true
  cinematicEligibleRound = -1
  snapshot = { ...snapshot, playerStatus: 'SPECTATOR', cinematicEligible: false }
  void room.send('leaveGame', { requested: true })
  console.log(`[CLIENT] LEAVE GAME reason=${reason}`)
}

function updateScenePresence(): boolean {
  const insideScene = isPlayerInsideScene()
  if (wasInsideScene === null) {
    wasInsideScene = insideScene
    return insideScene
  }

  if (insideScene !== wasInsideScene) {
    wasInsideScene = insideScene
    forceSpectator(insideScene ? 'scene_reentry' : 'scene_exit')
  }
  return insideScene
}

function refreshCinematicEligibility(): void {
  if (snapshot.playerStatus === 'SPECTATOR') cinematicEligibleRound = -1
  if (snapshot.phase === 'BUILD' && snapshot.playerStatus === 'ACTIVE') {
    cinematicEligibleRound = snapshot.roundNumber
  }
  if (snapshot.playerStatus === 'QUEUED' && snapshot.phase !== 'IDLE') {
    cinematicEligibleRound = snapshot.roundNumber
  }
  snapshot = {
    ...snapshot,
    cinematicEligible: cinematicEligibleRound === snapshot.roundNumber
  }
}

export function initGameState(): void {
  if (initialized) return
  initialized = true

  room.onMessage('playerUpdate', (data) => {
    const serverStatus = data.status as PlayerStatus
    snapshot = {
      ...snapshot,
      playerName: data.name,
      playerStatus: manualJoinRequired ? 'SPECTATOR' : serverStatus,
      sessionPoints: data.sessionPoints,
      roundPoints: data.roundPoints,
      correctPieces: data.correctPieces,
      profileLoaded: data.profileLoaded,
      tutorialCompleted: data.tutorialCompleted,
      totalXp: data.totalXp,
      level: data.level,
      roundsPlayed: data.roundsPlayed,
      perfectBuilds: data.perfectBuilds,
      mvpAwards: data.mvpAwards,
      sessionLeaderAwards: data.sessionLeaderAwards
    }
    refreshCinematicEligibility()
  })

  room.onMessage('leaderboardUpdate', (data) => {
    try {
      const parsed = JSON.parse(data.rankingsJson) as PersistentLeaderboards
      snapshot = { ...snapshot, leaderboards: parsed, leaderboardsLoading: false }
    } catch (_) {
      snapshot = { ...snapshot, leaderboardsLoading: false }
    }
  })

  room.onMessage('stateUpdate', (data) => {
    let players: RosterPlayer[] = []
    let trophies: TrophySnapshot[] = []
    try {
      const parsed = JSON.parse(data.playersJson)
      if (Array.isArray(parsed)) players = parsed as RosterPlayer[]
    } catch (_) {}
    try {
      const parsed = JSON.parse(data.trophiesJson)
      if (Array.isArray(parsed)) trophies = parsed as TrophySnapshot[]
    } catch (_) {}

    lastStateAtMs = Date.now()
    snapshot = {
      ...snapshot,
      resolved: true,
      phase: data.phase as RoundPhase,
      roundNumber: data.roundNumber,
      templateId: data.templateId,
      partsAttached: data.partsAttached,
      partsRequired: data.partsRequired,
      occupiedMask: data.occupiedMask,
      performanceType: data.performanceType,
      builders: data.builders,
      players,
      trophies,
      mvpName: data.mvpName,
      mvpPoints: data.mvpPoints,
      difficulty: data.difficulty,
      secondsLeft: data.secondsLeft,
      stateSeq: data.stateSeq,
      communityTier: data.communityTier,
      communityPoints: data.communityPoints,
      communityRequiredPoints: data.communityRequiredPoints,
      communityMilestoneSeq: data.communityMilestoneSeq,
      ageMs: 0,
      isStale: false
    }
    refreshCinematicEligibility()

    if (snapshot.phase !== lastLoggedPhase || snapshot.roundNumber !== lastLoggedRound) {
      lastLoggedPhase = snapshot.phase
      lastLoggedRound = snapshot.roundNumber
      console.log(
        `[CLIENT] phase=${snapshot.phase} round=${snapshot.roundNumber} ` +
        `template=${snapshot.templateId} players=${snapshot.players.length}`
      )
    }
  })

  void room.send('connect', { ready: true })
}

export function getClientSnapshot(): ClientSnapshot {
  if (!snapshot.resolved) return snapshot
  const ageMs = lastStateAtMs ? Date.now() - lastStateAtMs : Number.POSITIVE_INFINITY
  return {
    ...snapshot,
    ageMs,
    isStale: ageMs >= STALE_THRESHOLD_MS && snapshot.phase !== 'IDLE'
  }
}

export function requestAttach(slotId: string, partType: string): void {
  if (snapshot.playerStatus !== 'ACTIVE') return
  void room.send('attach', { slotId, partType })
  console.log(`[CLIENT] attach ${slotId}/${partType}`)
}

export function requestJoinGame(): void {
  if (!isPlayerInsideScene() || snapshot.playerStatus !== 'SPECTATOR' || !snapshot.tutorialCompleted) return
  manualJoinRequired = false
  snapshot = { ...snapshot, playerStatus: 'QUEUED' }
  refreshCinematicEligibility()
  void room.send('joinGame', { requested: true })
  console.log('[CLIENT] JOIN GAME requested')
}

export function requestCompleteTutorial(joinAfter: boolean): void {
  snapshot = { ...snapshot, tutorialCompleted: true }
  if (joinAfter) {
    manualJoinRequired = false
    snapshot = { ...snapshot, playerStatus: 'QUEUED' }
    refreshCinematicEligibility()
  }
  void room.send('completeTutorial', { joinAfter })
  console.log(`[CLIENT] tutorial completed joinAfter=${joinAfter}`)
}

export function requestLeaveGame(): void {
  if (snapshot.playerStatus === 'SPECTATOR') return
  forceSpectator('player_request')
}

export function requestLeaderboards(): void {
  if (snapshot.leaderboardsLoading) return
  snapshot = { ...snapshot, leaderboardsLoading: true }
  void room.send('requestLeaderboards', { requested: true })
}

export function gameStateSystem(dt: number): void {
  if (!updateScenePresence()) {
    heartbeatAccumulator = 0
    return
  }
  heartbeatAccumulator += dt
  if (heartbeatAccumulator < HEARTBEAT_SECONDS) return
  heartbeatAccumulator = 0
  void room.send('heartbeat', { active: true })
}

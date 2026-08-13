import { AvatarBase, engine, Entity, PlayerIdentityData } from '@dcl/sdk/ecs'
import { onLeaveScene } from '@dcl/sdk/players'
import { RoundState, GameTimer } from '../components/alienComponents'
import { room } from '../shared/alienMessages'
import {
  BUILD_COMPLETE_SECONDS,
  COMMUNITY_BASE_POINTS,
  COMMUNITY_GROWTH_POINTS,
  COUNTDOWN_SECONDS,
  DifficultyTier,
  PERFORMANCE_DURATION_SECONDS,
  PLAYER_ONLINE_MS,
  POINTS_CORRECT_PIECE,
  POINTS_FINAL_PIECE,
  POINTS_GROUP_SUCCESS,
  POINTS_SESSION_LEADER,
  RESET_DELAY_SECONDS,
  RoundPhase,
  SESSION_RECONNECT_MS,
  getPerformanceType
} from '../shared/constants'
import { TEMPLATES, TemplateId, findSlotIndex } from '../shared/templates'
import { createPlayerProfileStore } from './storage/playerProfile'
import { createGlobalLeaderboardStore } from './storage/leaderboard'

type PlayerStatus = 'SPECTATOR' | 'QUEUED' | 'ACTIVE'

interface PlayerSession {
  address: string
  name: string
  joined: boolean
  joinedAt: number
  lastSeenAt: number
  sessionPoints: number
  sessionCorrectPieces: number
  sessionRounds: number
  sessionMvpAwards: number
  roundPoints: number
  roundCorrectPieces: number
  profileLoaded: boolean
  tutorialCompleted: boolean
  totalXp: number
  level: number
  roundsPlayed: number
  perfectBuilds: number
  mvpAwards: number
  sessionLeaderAwards: number
}

interface RosterEntry {
  name: string
  sessionPoints: number
  roundPoints: number
  correctPieces: number
  level: number
  rounds: number
  mvps: number
}

interface TrophyRecord {
  id: number
  templateId: TemplateId
  builders: string
}

const TIER_TEMPLATES: Record<DifficultyTier, TemplateId[]> = {
  SOLO: ['CASTLE', 'PYRAMID', 'TOWER'],
  SMALL_GROUP: ['ARCH', 'SPACESHIP', 'ROVER'],
  SOCIAL_GROUP: ['KEEP', 'FORTRESS', 'ROBOT']
}

const TIER_BUILD_SECONDS: Record<DifficultyTier, number> = {
  SOLO: 75,
  SMALL_GROUP: 60,
  SOCIAL_GROUP: 60
}

const PROFILE_AUTOSAVE_SECONDS = 20
const JOIN_GRACE_SECONDS = 5
const MAX_VISIBLE_TROPHIES = 5

let roundEntity: Entity = 0 as Entity
let timerEntity: Entity = 0 as Entity
let currentPhase: RoundPhase = 'IDLE'
let timerAccumulator = 0
let profileAutosaveAccumulator = 0
let currentDifficulty: DifficultyTier = 'SOLO'
let roundMvpName = ''
let roundMvpPoints = 0
let communityTier = 1
let communityPoints = 0
let communityMilestoneSeq = 0
let communitySessionHadPlayers = false

const templateCursor: Record<DifficultyTier, number> = {
  SOLO: 0,
  SMALL_GROUP: 0,
  SOCIAL_GROUP: 0
}

const sessions = new Map<string, PlayerSession>()
const roundParticipants = new Set<string>()
const slotPlacedBy: Record<string, string> = {}
const slotPlacedByName: Record<string, string> = {}
const trophyHistory: TrophyRecord[] = []
const profileStore = createPlayerProfileStore()
const leaderboardStore = createGlobalLeaderboardStore()

export function setupAlienServer(): void {
  roundEntity = engine.addEntity()
  RoundState.create(roundEntity, {
    phase: 'IDLE',
    roundNumber: 0,
    templateId: TIER_TEMPLATES.SOLO[0],
    partsAttached: 0,
    partsRequired: TEMPLATES[TIER_TEMPLATES.SOLO[0]].length,
    occupiedMask: 0,
    performanceType: '',
    builders: '',
    stateSeq: 0
  })

  timerEntity = engine.addEntity()
  GameTimer.create(timerEntity, { secondsLeft: 0 })

  room.onMessage('connect', async (_data, context) => {
    if (!context) return
    const session = touchSession(context.from)
    leaveCompetitiveSession(session, 'scene_entry_reset')
    await ensureProfileLoaded(session)
    sendPlayerUpdate(session)
    broadcastState()
  })

  room.onMessage('heartbeat', (_data, context) => {
    if (!context) return
    touchSession(context.from)
  })

  room.onMessage('joinGame', async (_data, context) => {
    if (!context) return
    const session = touchSession(context.from)
    await ensureProfileLoaded(session)
    if (!session.tutorialCompleted) {
      sendPlayerUpdate(session)
      return
    }
    joinCompetitiveSession(session)
    sendPlayerUpdate(session)
    broadcastState()
  })

  room.onMessage('completeTutorial', async (data, context) => {
    if (!context) return
    const session = touchSession(context.from)
    await ensureProfileLoaded(session)
    profileStore.completeTutorial(session.address)
    session.tutorialCompleted = true
    await profileStore.save(session.address)
    if (data.joinAfter) joinCompetitiveSession(session)
    sendPlayerUpdate(session)
    broadcastState()
  })

  room.onMessage('leaveGame', (_data, context) => {
    if (!context) return
    const session = touchSession(context.from)
    leaveCompetitiveSession(session, 'player_request')
    sendPlayerUpdate(session)
    broadcastState()
  })

  onLeaveScene((userId) => {
    const session = sessions.get(normalizeAddress(userId))
    if (!session) return
    leaveCompetitiveSession(session, 'scene_exit')
    void profileStore.save(session.address)
    void leaderboardStore.save(session.address)
    broadcastState()
  })

  room.onMessage('requestLeaderboards', async (_data, context) => {
    if (!context) return
    const session = touchSession(context.from)
    await ensureProfileLoaded(session)
    await leaderboardStore.saveDirty()
    const rankings = await leaderboardStore.getSnapshot()
    void room.send('leaderboardUpdate', { rankingsJson: JSON.stringify(rankings) }, { to: [session.address] })
  })

  room.onMessage('attach', async (data, context) => {
    if (!context) return
    await handleAttach(context.from, data.slotId, data.partType)
  })

  console.log('[SERVER] competitive mode ready - waiting for JOIN GAME')
  broadcastState()
  engine.addSystem(serverTick, undefined, 'alien-server-tick-system')
}

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function resolvePlayerName(address: string): string {
  const normalized = normalizeAddress(address)
  for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (identity.address.toLowerCase() !== normalized) continue
    const avatar = AvatarBase.getOrNull(entity)
    if (avatar?.name) return avatar.name
    break
  }
  return `Player ${address.slice(2, 6)}`
}

function createSession(address: string): PlayerSession {
  const normalized = normalizeAddress(address)
  const now = Date.now()
  return {
    address: normalized,
    name: resolvePlayerName(normalized),
    joined: false,
    joinedAt: now,
    lastSeenAt: now,
    sessionPoints: 0,
    sessionCorrectPieces: 0,
    sessionRounds: 0,
    sessionMvpAwards: 0,
    roundPoints: 0,
    roundCorrectPieces: 0,
    profileLoaded: false,
    tutorialCompleted: false,
    totalXp: 0,
    level: 1,
    roundsPlayed: 0,
    perfectBuilds: 0,
    mvpAwards: 0,
    sessionLeaderAwards: 0
  }
}

function touchSession(address: string): PlayerSession {
  const normalized = normalizeAddress(address)
  const now = Date.now()
  let session = sessions.get(normalized)

  if (!session || now - session.lastSeenAt > SESSION_RECONNECT_MS) {
    session = createSession(normalized)
    sessions.set(normalized, session)
    roundParticipants.delete(normalized)
  }

  session.lastSeenAt = now
  session.name = resolvePlayerName(normalized)
  return session
}

function leaveCompetitiveSession(session: PlayerSession, reason: string): void {
  const wasPlaying = session.joined || roundParticipants.has(session.address)
  session.joined = false
  session.roundPoints = 0
  session.roundCorrectPieces = 0
  roundParticipants.delete(session.address)
  updateCommunitySessionPresence()
  if (wasPlaying) {
    console.log(
      `[SERVER] left game reason=${reason} player=${session.name} address=${session.address.slice(0, 8)}`
    )
  }
}

async function ensureProfileLoaded(session: PlayerSession): Promise<void> {
  if (session.profileLoaded) return
  const profile = await profileStore.load(session.address, session.name)
  const loadedTotalXp = profile.totalXp
  const totalXpFloor = await leaderboardStore.load(profile)
  if (totalXpFloor > loadedTotalXp) {
    profileStore.ensureMinimumXp(session.address, totalXpFloor)
    void profileStore.save(session.address)
    console.log(
      `[PROFILE] repaired player=${session.name} previousXp=${loadedTotalXp} restoredXp=${totalXpFloor}`
    )
  }
  session.totalXp = profile.totalXp
  session.level = profile.level
  session.roundsPlayed = profile.roundsPlayed
  session.perfectBuilds = profile.perfectBuilds
  session.mvpAwards = profile.mvpAwards
  session.sessionLeaderAwards = profile.sessionLeaderAwards
  session.tutorialCompleted = profile.tutorialCompleted
  session.profileLoaded = true
  console.log(
    `[PROFILE] loaded player=${session.name} level=${session.level} xp=${session.totalXp}`
  )
}

function awardPoints(session: PlayerSession, points: number, correctPieces = 0): void {
  const safePoints = Math.max(0, Math.floor(points))
  const safePieces = Math.max(0, Math.floor(correctPieces))
  session.roundPoints += safePoints
  session.sessionPoints += safePoints
  session.roundCorrectPieces += safePieces
  session.sessionCorrectPieces += safePieces
  addCommunityProgress(safePoints)

  const profile = profileStore.addProgress(session.address, safePoints, safePieces)
  if (!profile) return
  session.totalXp = profile.totalXp
  session.level = profile.level
  leaderboardStore.addPoints(session.address, session.name, profile.totalXp, safePoints)
}

function requiredCommunityPoints(): number {
  return COMMUNITY_BASE_POINTS + (communityTier - 1) * COMMUNITY_GROWTH_POINTS
}

function addCommunityProgress(points: number): void {
  communityPoints += Math.max(0, Math.floor(points))
  let required = requiredCommunityPoints()
  while (communityPoints >= required) {
    communityPoints -= required
    communityTier += 1
    communityMilestoneSeq += 1
    console.log(`[COMMUNITY] SCRAPYARD TIER ${communityTier} reached nextRequired=${requiredCommunityPoints()}`)
    required = requiredCommunityPoints()
  }
}

function resetCommunityProgress(): void {
  communityTier = 1
  communityPoints = 0
  communityMilestoneSeq = 0
  console.log('[COMMUNITY] session ended - progress reset')
}

function updateCommunitySessionPresence(): void {
  const hasJoinedSession = Array.from(sessions.values()).some((session) => session.joined)
  if (hasJoinedSession) {
    communitySessionHadPlayers = true
    return
  }
  if (!communitySessionHadPlayers) return
  communitySessionHadPlayers = false
  resetCommunityProgress()
}

function isOnline(session: PlayerSession): boolean {
  return Date.now() - session.lastSeenAt <= PLAYER_ONLINE_MS
}

function playerStatus(session: PlayerSession): PlayerStatus {
  if (roundParticipants.has(session.address)) return 'ACTIVE'
  if (session.joined) return 'QUEUED'
  return 'SPECTATOR'
}

function joinCompetitiveSession(session: PlayerSession): void {
  if (!session.joined) {
    session.joined = true
    session.joinedAt = Date.now()
    communitySessionHadPlayers = true
    console.log(`[SERVER] queued player=${session.name} address=${session.address.slice(0, 8)}`)
  }

  if (currentPhase === 'IDLE' || (currentPhase === 'BUILD' && roundParticipants.size === 0)) enterBuild()
  else joinCurrentBuildIfOpen(session)
}

function sendPlayerUpdate(session: PlayerSession): void {
  void room.send('playerUpdate', {
    name: session.name,
    status: playerStatus(session),
    sessionPoints: session.sessionPoints,
    roundPoints: session.roundPoints,
    correctPieces: session.sessionCorrectPieces,
    profileLoaded: session.profileLoaded,
    tutorialCompleted: session.tutorialCompleted,
    totalXp: session.totalXp,
    level: session.level,
    roundsPlayed: session.roundsPlayed,
    perfectBuilds: session.perfectBuilds,
    mvpAwards: session.mvpAwards,
    sessionLeaderAwards: session.sessionLeaderAwards
  }, { to: [session.address] })
}

function activeRoster(): RosterEntry[] {
  const roster: RosterEntry[] = []
  for (const address of roundParticipants) {
    const session = sessions.get(address)
    if (!session || !isOnline(session)) continue
    roster.push({
      name: session.name,
      sessionPoints: session.sessionPoints,
      roundPoints: session.roundPoints,
      correctPieces: session.roundCorrectPieces,
      level: session.level,
      rounds: session.sessionRounds,
      mvps: session.sessionMvpAwards
    })
  }
  roster.sort((a, b) => b.sessionPoints - a.sessionPoints || b.roundPoints - a.roundPoints || a.name.localeCompare(b.name))
  return roster
}

function broadcastState(): void {
  const state = RoundState.get(roundEntity)
  const timer = GameTimer.get(timerEntity)
  void room.send('stateUpdate', {
    phase: state.phase,
    roundNumber: state.roundNumber,
    templateId: state.templateId,
    partsAttached: state.partsAttached,
    partsRequired: state.partsRequired,
    occupiedMask: state.occupiedMask,
    performanceType: state.performanceType,
    builders: state.builders,
    playersJson: JSON.stringify(activeRoster()),
    trophiesJson: JSON.stringify(trophyHistory),
    mvpName: roundMvpName,
    mvpPoints: roundMvpPoints,
    difficulty: currentDifficulty,
    secondsLeft: timer.secondsLeft,
    stateSeq: state.stateSeq,
    communityTier,
    communityPoints,
    communityRequiredPoints: requiredCommunityPoints(),
    communityMilestoneSeq
  })

  for (const session of sessions.values()) {
    if (isOnline(session)) sendPlayerUpdate(session)
  }
}

function bumpSeq(): void {
  const state = RoundState.getMutable(roundEntity)
  state.stateSeq = (state.stateSeq || 0) + 1
}

function setPhase(phase: RoundPhase): void {
  currentPhase = phase
  RoundState.getMutable(roundEntity).phase = phase
  bumpSeq()
}

function setTimerSeconds(seconds: number): void {
  GameTimer.getMutable(timerEntity).secondsLeft = seconds
  timerAccumulator = 0
}

function difficultyForPlayers(playerCount: number): DifficultyTier {
  if (playerCount <= 1) return 'SOLO'
  if (playerCount <= 4) return 'SMALL_GROUP'
  return 'SOCIAL_GROUP'
}

function joinCurrentBuildIfOpen(session: PlayerSession): boolean {
  if (currentPhase !== 'BUILD' || roundParticipants.has(session.address)) return false

  const state = RoundState.get(roundEntity)
  const timer = GameTimer.get(timerEntity)
  const openingSeconds = TIER_BUILD_SECONDS[currentDifficulty]
  const graceOpen = state.partsAttached === 0 && timer.secondsLeft >= openingSeconds - JOIN_GRACE_SECONDS
  if (!graceOpen) return false

  roundParticipants.add(session.address)
  session.roundPoints = 0
  session.roundCorrectPieces = 0
  console.log(
    `[SERVER] joined opening round player=${session.name} ` +
    `round=${state.roundNumber} secondsLeft=${timer.secondsLeft}`
  )
  return true
}

function nextTemplate(tier: DifficultyTier): TemplateId {
  const templates = TIER_TEMPLATES[tier]
  const index = templateCursor[tier] % templates.length
  templateCursor[tier]++
  return templates[index]
}

function eligiblePlayers(): PlayerSession[] {
  return Array.from(sessions.values())
    .filter((session) => session.joined && isOnline(session))
    .sort((a, b) => a.joinedAt - b.joinedAt)
}

function enterIdle(): void {
  currentPhase = 'IDLE'
  roundParticipants.clear()
  const state = RoundState.getMutable(roundEntity)
  state.phase = 'IDLE'
  state.partsAttached = 0
  state.occupiedMask = 0
  state.performanceType = ''
  state.builders = ''
  state.stateSeq = (state.stateSeq || 0) + 1
  setTimerSeconds(0)
  console.log('[SERVER] waiting for an online queued player')
}

function enterBuild(): void {
  const players = eligiblePlayers()
  if (players.length === 0) {
    enterIdle()
    return
  }

  roundParticipants.clear()
  for (const session of players) {
    roundParticipants.add(session.address)
    session.roundPoints = 0
    session.roundCorrectPieces = 0
  }

  currentDifficulty = difficultyForPlayers(players.length)
  const templateId = nextTemplate(currentDifficulty)
  const state = RoundState.getMutable(roundEntity)
  state.phase = 'BUILD'
  state.roundNumber += 1
  state.templateId = templateId
  state.partsAttached = 0
  state.partsRequired = TEMPLATES[templateId].length
  state.occupiedMask = 0
  state.performanceType = ''
  state.builders = ''
  state.stateSeq = (state.stateSeq || 0) + 1
  currentPhase = 'BUILD'
  roundMvpName = ''
  roundMvpPoints = 0

  for (const key of Object.keys(slotPlacedBy)) delete slotPlacedBy[key]
  for (const key of Object.keys(slotPlacedByName)) delete slotPlacedByName[key]

  setTimerSeconds(TIER_BUILD_SECONDS[currentDifficulty])
  console.log(
    `[SERVER] BUILD round=${state.roundNumber} tier=${currentDifficulty} ` +
    `players=${players.length} template=${templateId} required=${state.partsRequired}`
  )
}

function calculateRoundMvp(): PlayerSession | null {
  const ranked = Array.from(roundParticipants)
    .map((address) => sessions.get(address))
    .filter((session): session is PlayerSession => session !== undefined)
    .sort((a, b) => b.roundPoints - a.roundPoints || b.roundCorrectPieces - a.roundCorrectPieces || a.joinedAt - b.joinedAt)

  if (ranked.length < 2) {
    roundMvpName = ''
    roundMvpPoints = 0
    return null
  }

  const mvp = ranked[0]
  roundMvpName = mvp && mvp.roundPoints > 0 ? mvp.name : ''
  roundMvpPoints = mvp && mvp.roundPoints > 0 ? mvp.roundPoints : 0
  return roundMvpName ? mvp : null
}

function sessionLeader(): PlayerSession | null {
  const leader = Array.from(roundParticipants)
    .map((address) => sessions.get(address))
    .filter((session): session is PlayerSession => session !== undefined)
    .sort((a, b) => b.sessionPoints - a.sessionPoints || b.roundPoints - a.roundPoints || a.joinedAt - b.joinedAt)[0]
  return leader && leader.sessionPoints > 0 && leader.roundPoints > 0 ? leader : null
}

function enterBuildComplete(reason: 'perfect' | 'timeout'): void {
  if (currentPhase !== 'BUILD') return
  const state = RoundState.getMutable(roundEntity)
  state.performanceType = getPerformanceType(state.partsAttached, state.partsRequired)

  if (state.performanceType === 'PERFECT') {
    for (const address of roundParticipants) {
      const session = sessions.get(address)
      if (!session || session.roundCorrectPieces <= 0) continue
      awardPoints(session, POINTS_GROUP_SUCCESS)
    }

    const seen = new Set<string>()
    const names: string[] = []
    for (const name of Object.values(slotPlacedByName)) {
      if (!seen.has(name)) {
        seen.add(name)
        names.push(name)
      }
    }
    state.builders = names.join(', ')
    trophyHistory.push({
      id: state.roundNumber,
      templateId: state.templateId as TemplateId,
      builders: state.builders
    })
    if (trophyHistory.length > MAX_VISIBLE_TROPHIES) trophyHistory.shift()
  } else {
    state.builders = ''
  }

  const mvp = calculateRoundMvp()
  if (mvp) {
    profileStore.recordMvp(mvp.address)
    mvp.mvpAwards += 1
    mvp.sessionMvpAwards += 1
  }

  const leader = sessionLeader()
  if (leader) {
    awardPoints(leader, POINTS_SESSION_LEADER)
    profileStore.recordSessionLeader(leader.address)
    leader.sessionLeaderAwards += 1
  }

  const perfect = state.performanceType === 'PERFECT'
  for (const address of roundParticipants) {
    profileStore.recordRound(address, perfect)
    const session = sessions.get(address)
    if (!session) continue
    session.roundsPlayed += 1
    session.sessionRounds += 1
    if (perfect) session.perfectBuilds += 1
    leaderboardStore.recordRound(
      session.address,
      session.roundsPlayed,
      session.mvpAwards,
      mvp?.address === session.address
    )
  }
  void Promise.all([profileStore.saveDirty(), leaderboardStore.saveDirty()])

  setPhase('BUILD_COMPLETE')
  setTimerSeconds(BUILD_COMPLETE_SECONDS)
  console.log(
    `[SERVER] BUILD_COMPLETE reason=${reason} round=${state.roundNumber} ` +
    `parts=${state.partsAttached}/${state.partsRequired} mvp=${roundMvpName || 'none'}`
  )
}

function enterCountdown(): void {
  if (currentPhase !== 'BUILD_COMPLETE') return
  setPhase('COUNTDOWN')
  setTimerSeconds(COUNTDOWN_SECONDS)
}

function enterPerform(): void {
  if (currentPhase !== 'COUNTDOWN') return
  setPhase('PERFORM')
  setTimerSeconds(PERFORMANCE_DURATION_SECONDS)
}

function enterReset(): void {
  if (currentPhase !== 'PERFORM') return
  setPhase('RESET')
  setTimerSeconds(RESET_DELAY_SECONDS)
}

async function handleAttach(address: string, slotId: string, partType: string): Promise<void> {
  const session = touchSession(address)
  await ensureProfileLoaded(session)
  const state = RoundState.getMutable(roundEntity)

  function reject(reason: string, required: string): void {
    void room.send('attachResult', { slotId, ok: false, reason, required }, { to: [session.address] })
  }

  if (currentPhase !== 'BUILD') return reject('phase', '')
  if (!roundParticipants.has(session.address)) return reject('not_active', '')

  const slotIndex = findSlotIndex(state.templateId, slotId)
  if (slotIndex < 0) return reject('unknown_slot', '')

  const slot = TEMPLATES[state.templateId as TemplateId][slotIndex]
  const requiredPart = slot.requiredPart
  const occupiedBit = 1 << slotIndex
  if (((state.occupiedMask ?? 0) & occupiedBit) !== 0) return reject('slot_occupied', requiredPart)
  if (partType !== requiredPart) return reject('wrong_part', requiredPart)

  state.occupiedMask = (state.occupiedMask ?? 0) | occupiedBit
  state.partsAttached += 1
  state.stateSeq = (state.stateSeq || 0) + 1
  slotPlacedBy[slotId] = session.address
  slotPlacedByName[slotId] = session.name

  let earned = POINTS_CORRECT_PIECE
  if (state.partsAttached >= state.partsRequired) earned += POINTS_FINAL_PIECE
  awardPoints(session, earned, 1)

  void room.send('attachResult', { slotId, ok: true, reason: '', required: requiredPart }, { to: [session.address] })
  if (state.partsAttached >= state.partsRequired) enterBuildComplete('perfect')
  broadcastState()
}

function pruneExpiredSessions(): void {
  const now = Date.now()
  for (const [address, session] of sessions) {
    if (now - session.lastSeenAt <= SESSION_RECONNECT_MS) continue
    sessions.delete(address)
    roundParticipants.delete(address)
    void profileStore.saveAndEvict(address)
    void leaderboardStore.save(address)
  }
}

function serverTick(dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return

  // Clamp slow frames so phase changes stay controlled.
  const safeDt = Math.min(dt, 5)
  profileAutosaveAccumulator += safeDt
  if (profileAutosaveAccumulator >= PROFILE_AUTOSAVE_SECONDS) {
    profileAutosaveAccumulator %= PROFILE_AUTOSAVE_SECONDS
    void Promise.all([profileStore.saveDirty(), leaderboardStore.saveDirty()])
  }

  timerAccumulator += safeDt
  if (timerAccumulator < 1) return
  const elapsedSeconds = Math.floor(timerAccumulator)
  timerAccumulator -= elapsedSeconds
  pruneExpiredSessions()
  updateCommunitySessionPresence()

  if (currentPhase === 'IDLE') {
    broadcastState()
    return
  }

  const timer = GameTimer.getMutable(timerEntity)
  timer.secondsLeft = Math.max(0, timer.secondsLeft - elapsedSeconds)
  bumpSeq()

  if (timer.secondsLeft <= 0) {
    if (currentPhase === 'BUILD') enterBuildComplete('timeout')
    else if (currentPhase === 'BUILD_COMPLETE') enterCountdown()
    else if (currentPhase === 'COUNTDOWN') enterPerform()
    else if (currentPhase === 'PERFORM') enterReset()
    else if (currentPhase === 'RESET') enterBuild()
  }

  broadcastState()
}

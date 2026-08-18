import {
  ColliderLayer,
  engine,
  Entity,
  InputAction,
  inputSystem,
  MainCamera,
  Material,
  MeshCollider,
  MeshRenderer,
  pointerEventsSystem,
  PointerEventType,
  TextShape,
  Transform,
  VirtualCamera
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getClientSnapshot, requestLeaderboards, LeaderboardPlayer } from '../game/gameState'

const DISPLAY_POSITION = Vector3.create(-4.9, 10.25, -8.85)
const DISPLAY_ROTATION = Quaternion.fromEulerDegrees(0, 200, 0)
const DISPLAY_SCALE = 4
const REFRESH_SECONDS = 18
const ROWS = 5
const NAME_TEXT_SCALE = 1.65
const HEADER_TEXT_SCALE = 2.25
const NUMBER_TEXT_SCALE = 1.9125
const FONT_MONOSPACE = 2
const TEXT_ALIGN_MIDDLE_LEFT = 3
const TEXT_ALIGN_MIDDLE_CENTER = 4
const CAMERA_POSITION = Vector3.create(0.1, 10.25, 10.2)
const CAMERA_ROTATION = Quaternion.fromEulerDegrees(0, 200, 0)

type LeaderboardMode =
  | 'TOTAL' | 'DAILY' | 'WEEKLY' | 'MVP' | 'ROUNDS'
  | 'LEVEL' | 'PERFECT' | 'PIECES' | 'EXCELLENCE' | 'DOMINANCE'

const MODES: LeaderboardMode[] = [
  'TOTAL', 'DAILY', 'WEEKLY', 'MVP', 'ROUNDS',
  'LEVEL', 'PERFECT', 'PIECES', 'EXCELLENCE', 'DOMINANCE'
]

interface ColumnDefinition {
  label: string
  x: number
  width: number
  value: (player: LeaderboardPlayer) => number
}

const displayEntities: Entity[] = []
let displayKey = ''
let refreshAccumulator = REFRESH_SECONDS
let displayRoot: Entity | null = null
let modeIndex = 0
let viewCamera: Entity | null = null
let cameraActive = false

function track(entity: Entity): Entity {
  displayEntities.push(entity)
  return entity
}

function clearDisplay(): void {
  for (const entity of displayEntities) {
    try { engine.removeEntity(entity) } catch (_) {}
  }
  displayEntities.length = 0
  displayRoot = null
}

function createRoot(): void {
  displayRoot = track(engine.addEntity())
  Transform.create(displayRoot, {
    position: DISPLAY_POSITION,
    rotation: DISPLAY_ROTATION,
    scale: Vector3.create(DISPLAY_SCALE, DISPLAY_SCALE, DISPLAY_SCALE)
  })
}

function currentMode(): LeaderboardMode {
  return MODES[modeIndex % MODES.length]
}

function stepMode(direction: -1 | 1): void {
  modeIndex = (modeIndex + direction + MODES.length) % MODES.length
  displayKey = ''
  requestLeaderboards()
}

function cameraEntity(): Entity {
  if (viewCamera !== null) return viewCamera
  viewCamera = engine.addEntity()
  Transform.create(viewCamera, {
    position: CAMERA_POSITION,
    rotation: CAMERA_ROTATION
  })
  VirtualCamera.create(viewCamera, {
    defaultTransition: { transitionMode: VirtualCamera.Transition.Time(0.35) }
  })
  return viewCamera
}

function setLeaderboardCamera(active: boolean): void {
  if (cameraActive === active) return
  cameraActive = active
  try {
    if (active) {
      const transform = Transform.getMutable(cameraEntity())
      transform.position = CAMERA_POSITION
      transform.rotation = CAMERA_ROTATION
    }
    MainCamera.createOrReplace(engine.CameraEntity, {
      virtualCameraEntity: active ? cameraEntity() : undefined
    })
  } catch (error) {
    cameraActive = false
    console.log(`[LEADERBOARD] camera failed: ${error}`)
  }
}

export function openLeaderboardCamera(): void {
  setLeaderboardCamera(true)
}

export function closeLeaderboardCamera(): void {
  setLeaderboardCamera(false)
}

export function previousLeaderboardMode(): void {
  stepMode(-1)
}

export function nextLeaderboardMode(): void {
  stepMode(1)
}

export function getLeaderboardModeLabel(): string {
  return currentMode()
}

function createText(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: Color4,
  width: number,
  scale = HEADER_TEXT_SCALE,
  textAlign = TEXT_ALIGN_MIDDLE_CENTER
): void {
  if (displayRoot === null) return
  const entity = track(engine.addEntity())
  Transform.create(entity, {
    parent: displayRoot,
    position: Vector3.create(x, y, -0.08),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  TextShape.create(entity, {
    text,
    font: FONT_MONOSPACE,
    fontSize: fontSize * scale,
    fontAutoSize: false,
    textAlign,
    width,
    height: 0.85,
    lineCount: 1,
    textWrapping: false,
    textColor: color,
    outlineColor: Color3.create(0, 0, 0),
    outlineWidth: 0.22,
    shadowColor: Color3.create(0, 0, 0),
    shadowBlur: 0.28,
    shadowOffsetX: 0.08,
    shadowOffsetY: -0.08
  })
}

function clippedName(name: string): string {
  return name.length > 13 ? name.slice(0, 13) : name
}

function createPanel(x: number, y: number, width: number, height: number, color: Color4): void {
  if (displayRoot === null) return
  const entity = track(engine.addEntity())
  Transform.create(entity, {
    parent: displayRoot,
    position: Vector3.create(x, y, 0.02),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(width, height, 1)
  })
  MeshRenderer.setPlane(entity)
  Material.setBasicMaterial(entity, {
    diffuseColor: color,
    castShadows: false
  })
}

function createHitbox(
  x: number,
  y: number,
  width: number,
  height: number,
  hoverText: string,
  onClick: () => void
): void {
  if (displayRoot === null) return
  const entity = track(engine.addEntity())
  Transform.create(entity, {
    parent: displayRoot,
    position: Vector3.create(x, y, -0.16),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(width, height, 0.12)
  })
  MeshCollider.setBox(entity, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText,
        maxDistance: 18
      }
    },
    onClick
  )
}

function createAvatar(address: string | undefined, x: number, y: number): void {
  if (!address) return
  if (displayRoot === null) return
  const entity = track(engine.addEntity())
  Transform.create(entity, {
    parent: displayRoot,
    position: Vector3.create(x, y, -0.1),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(0.4, 0.4, 1)
  })
  MeshRenderer.setPlane(entity)
  Material.setBasicMaterial(entity, {
    texture: Material.Texture.Avatar({ userId: address }),
    diffuseColor: Color4.White(),
    castShadows: false
  })
}

function playerKey(player: LeaderboardPlayer): string {
  return [
    player.address ?? '',
    player.name,
    player.points,
    player.level,
    player.rounds,
    player.mvps,
    player.pieces ?? 0,
    player.perfects ?? 0,
    player.excellence ?? 0,
    player.dominance ?? 0
  ].join('|')
}

function leaderboardRows(snapshot: ReturnType<typeof getClientSnapshot>): LeaderboardPlayer[] {
  const boards = snapshot.leaderboards
  switch (currentMode()) {
    case 'DAILY': return boards.daily ?? []
    case 'WEEKLY': return boards.weekly ?? []
    case 'MVP': return boards.mvp ?? []
    case 'ROUNDS': return boards.rounds ?? []
    case 'LEVEL': return boards.level ?? []
    case 'PERFECT': return boards.perfect ?? []
    case 'PIECES': return boards.pieces ?? []
    case 'EXCELLENCE': return boards.excellence ?? []
    case 'DOMINANCE': return boards.dominance ?? []
    default: return boards.total ?? []
  }
}

function fallbackRows(snapshot: ReturnType<typeof getClientSnapshot>): LeaderboardPlayer[] {
  return snapshot.players.map((player) => ({
    name: player.name,
    points: player.sessionPoints,
    level: player.level,
    rounds: player.rounds,
    mvps: player.mvps,
    pieces: player.correctPieces,
    perfects: 0,
    excellence: player.rounds > 0 ? Math.round(player.sessionPoints / player.rounds) : 0,
    dominance: player.rounds > 0 ? Math.round((player.mvps / player.rounds) * 100) : 0
  }))
}

function columnsForMode(): ColumnDefinition[] {
  switch (currentMode()) {
    case 'MVP':
      return [
        { label: 'MVP', x: -0.12, width: 0.36, value: (player) => player.mvps },
        { label: 'RDS', x: 0.27, width: 0.34, value: (player) => player.rounds },
        { label: 'LVL', x: 0.68, width: 0.36, value: (player) => player.level },
        { label: 'PTS', x: 1.27, width: 0.56, value: (player) => player.points }
      ]
    case 'ROUNDS':
      return [
        { label: 'RDS', x: -0.12, width: 0.36, value: (player) => player.rounds },
        { label: 'LVL', x: 0.27, width: 0.34, value: (player) => player.level },
        { label: 'MVP', x: 0.68, width: 0.36, value: (player) => player.mvps },
        { label: 'PTS', x: 1.27, width: 0.56, value: (player) => player.points }
      ]
    case 'LEVEL':
      return [
        { label: 'LVL', x: -0.12, width: 0.36, value: (player) => player.level },
        { label: 'RDS', x: 0.27, width: 0.34, value: (player) => player.rounds },
        { label: 'MVP', x: 0.68, width: 0.36, value: (player) => player.mvps },
        { label: 'PTS', x: 1.27, width: 0.56, value: (player) => player.points }
      ]
    case 'PERFECT':
      return [
        { label: 'PER', x: -0.12, width: 0.36, value: (player) => player.perfects ?? 0 },
        { label: 'RDS', x: 0.27, width: 0.34, value: (player) => player.rounds },
        { label: 'LVL', x: 0.68, width: 0.36, value: (player) => player.level },
        { label: 'PTS', x: 1.27, width: 0.56, value: (player) => player.points }
      ]
    case 'PIECES':
      return [
        { label: 'PCS', x: -0.12, width: 0.36, value: (player) => player.pieces ?? 0 },
        { label: 'LVL', x: 0.27, width: 0.34, value: (player) => player.level },
        { label: 'RDS', x: 0.68, width: 0.36, value: (player) => player.rounds },
        { label: 'PTS', x: 1.27, width: 0.56, value: (player) => player.points }
      ]
    case 'EXCELLENCE':
      return [
        { label: 'AVG', x: -0.12, width: 0.36, value: (player) => player.excellence ?? 0 },
        { label: 'RDS', x: 0.27, width: 0.34, value: (player) => player.rounds },
        { label: 'LVL', x: 0.68, width: 0.36, value: (player) => player.level },
        { label: 'PTS', x: 1.27, width: 0.56, value: (player) => player.points }
      ]
    case 'DOMINANCE':
      return [
        { label: 'DOM', x: -0.12, width: 0.36, value: (player) => player.dominance ?? 0 },
        { label: 'MVP', x: 0.27, width: 0.34, value: (player) => player.mvps },
        { label: 'RDS', x: 0.68, width: 0.36, value: (player) => player.rounds },
        { label: 'PTS', x: 1.27, width: 0.56, value: (player) => player.points }
      ]
    default:
      return [
        { label: 'LVL', x: -0.12, width: 0.36, value: (player) => player.level },
        { label: 'RDS', x: 0.27, width: 0.34, value: (player) => player.rounds },
        { label: 'MVP', x: 0.68, width: 0.36, value: (player) => player.mvps },
        { label: 'PTS', x: 1.27, width: 0.56, value: (player) => player.points }
      ]
  }
}

function render(rows: LeaderboardPlayer[]): void {
  clearDisplay()
  createRoot()
  const columns = columnsForMode()
  createHitbox(-0.1, 0.5, 3.95, 3.05, 'View leaderboard', () => {
    if (getClientSnapshot().playerStatus === 'SPECTATOR') setLeaderboardCamera(true)
  })
  createPanel(-1.85, 1.92, 0.34, 0.26, Color4.create(0.01, 0.1, 0.12, 0.88))
  createPanel(1.62, 1.92, 0.34, 0.26, Color4.create(0.01, 0.1, 0.12, 0.88))
  createText('<', -1.85, 1.93, 0.52, Color4.create(0.35, 1, 1, 1), 0.3, HEADER_TEXT_SCALE)
  createText('>', 1.62, 1.93, 0.52, Color4.create(0.35, 1, 1, 1), 0.3, HEADER_TEXT_SCALE)
  createText(currentMode(), -0.1, 1.93, 0.46, Color4.create(1, 0.9, 0.22, 1), 1.6, HEADER_TEXT_SCALE)
  createHitbox(-1.85, 1.92, 0.42, 0.34, 'Previous ranking', () => {
    if (getClientSnapshot().playerStatus === 'SPECTATOR') stepMode(-1)
  })
  createHitbox(1.62, 1.92, 0.42, 0.34, 'Next ranking', () => {
    if (getClientSnapshot().playerStatus === 'SPECTATOR') stepMode(1)
  })

  if (rows.length === 0) {
    createText('No ranking data yet', -0.25, 1.25, 1.05, Color4.create(0.95, 0.98, 1, 1), 3.4)
    return
  }

  createPanel(-0.1, 1.62, 3.75, 0.42, Color4.create(0.01, 0.05, 0.08, 0.74))
  createText('NAME', -1.34, 1.63, 0.82, Color4.create(0.35, 1, 1, 1), 1.1, HEADER_TEXT_SCALE, TEXT_ALIGN_MIDDLE_LEFT)
  for (const column of columns) {
    createText(column.label, column.x, 1.63, 0.74, Color4.create(0.35, 1, 1, 1), column.width, HEADER_TEXT_SCALE)
  }

  rows.slice(0, ROWS).forEach((player, index) => {
    const y = 1.25 - index * 0.52
    const rankColor = index === 0
      ? Color4.create(1, 0.9, 0.22, 1)
      : Color4.create(0.95, 0.98, 1, 1)
    createPanel(-0.1, y, 3.75, 0.44, index === 0
      ? Color4.create(0.26, 0.18, 0.02, 0.88)
      : Color4.create(0.01, 0.02, 0.06, index % 2 === 0 ? 0.78 : 0.62)
    )
    createAvatar(player.address, -1.55, y + 0.08)
    createText(clippedName(player.name), -1.34, y + 0.04, 0.77, rankColor, 1.1, NAME_TEXT_SCALE, TEXT_ALIGN_MIDDLE_LEFT)
    for (const column of columns) {
      const color = column.label === 'MVP' || column.label === 'PER'
        ? Color4.create(1, 0.9, 0.22, 1)
        : column.label === 'PTS'
          ? Color4.create(0.05, 1, 0.78, 1)
          : Color4.create(0.95, 0.98, 1, 1)
      createText(`${column.value(player)}`, column.x, y + 0.04, 0.9, color, column.width, NUMBER_TEXT_SCALE)
    }
  })
}

export function leaderboardDisplaySystem(dt: number): void {
  refreshAccumulator += Math.min(Math.max(dt, 0), 1)
  if (refreshAccumulator >= REFRESH_SECONDS) {
    refreshAccumulator = 0
    requestLeaderboards()
  }

  const snapshot = getClientSnapshot()
  if (cameraActive && snapshot.playerStatus !== 'SPECTATOR') setLeaderboardCamera(false)
  if (cameraActive && snapshot.playerStatus === 'SPECTATOR') {
    if (inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)) stepMode(-1)
    if (inputSystem.isTriggered(InputAction.IA_SECONDARY, PointerEventType.PET_DOWN)) stepMode(1)
  }

  const selectedRows = leaderboardRows(snapshot)
  const rows = selectedRows.length > 0
    ? selectedRows
    : snapshot.players.map((player) => ({
      name: player.name,
      points: player.sessionPoints,
      level: player.level,
      rounds: player.rounds,
      mvps: player.mvps,
      pieces: player.correctPieces,
      perfects: 0,
      excellence: player.rounds > 0 ? Math.round(player.sessionPoints / player.rounds) : 0,
      dominance: player.rounds > 0 ? Math.round((player.mvps / player.rounds) * 100) : 0
    }))
  const key = `${currentMode()}:${snapshot.leaderboards.generatedAt}:${rows.map(playerKey).join(';')}`
  if (key === displayKey) return
  displayKey = key
  render(rows)
}

export function isLeaderboardCameraActive(): boolean {
  return cameraActive
}


import { MainCamera, Transform, VirtualCamera, engine } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { getClientSnapshot } from '../game/gameState'
import {
  CINEMATIC_WATCHDOG_GRACE_SECONDS,
  COUNTDOWN_SECONDS,
  PERFORMANCE_DURATION_SECONDS,
  RESET_DELAY_SECONDS,
  RoundPhase,
  SCENE_CENTER
} from '../shared/constants'
import { setCarriedVisible, setCinematicCameraActive } from '../ui'

const WATCHDOG_SECONDS =
  COUNTDOWN_SECONDS +
  PERFORMANCE_DURATION_SECONDS +
  RESET_DELAY_SECONDS +
  CINEMATIC_WATCHDOG_GRACE_SECONDS

interface Shot {
  startPos: { x: number; y: number; z: number }
  endPos: { x: number; y: number; z: number }
  pitch: number
  yaw: number
}

const SHOTS: Shot[] = [
  { startPos: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 }, endPos: { x: SCENE_CENTER.x, y: 9, z: SCENE_CENTER.z + 5 }, pitch: 25, yaw: 180 },
  { startPos: { x: SCENE_CENTER.x, y: 12, z: SCENE_CENTER.z - 11 }, endPos: { x: SCENE_CENTER.x, y: 8, z: SCENE_CENTER.z - 4 }, pitch: 22, yaw: 0 },
  { startPos: { x: SCENE_CENTER.x + 11, y: 12, z: SCENE_CENTER.z }, endPos: { x: SCENE_CENTER.x + 5, y: 9, z: SCENE_CENTER.z }, pitch: 22, yaw: 270 },
  { startPos: { x: SCENE_CENTER.x - 11, y: 12, z: SCENE_CENTER.z }, endPos: { x: SCENE_CENTER.x - 5, y: 9, z: SCENE_CENTER.z }, pitch: 22, yaw: 90 },
  { startPos: { x: SCENE_CENTER.x, y: 20, z: SCENE_CENTER.z + 8 }, endPos: { x: SCENE_CENTER.x, y: 14, z: SCENE_CENTER.z + 3 }, pitch: 55, yaw: 180 },
  { startPos: { x: SCENE_CENTER.x + 8, y: 13, z: SCENE_CENTER.z + 8 }, endPos: { x: SCENE_CENTER.x + 4, y: 9, z: SCENE_CENTER.z + 4 }, pitch: 28, yaw: 225 }
]

const DOLLY_DURATION_SECONDS = 10

let cameraEntity: ReturnType<typeof engine.addEntity> | null = null
let cameraUnavailable = false
let lastPhase: RoundPhase = 'IDLE'
let cinematicActive = false
let elapsed = 0
let shotIndex = 0
let currentShot = SHOTS[0]
let cinematicStartRound = 0
let initialized = false

function getCameraEntity(): ReturnType<typeof engine.addEntity> | null {
  if (cameraEntity !== null || cameraUnavailable) return cameraEntity

  try {
    const entity = engine.addEntity()
    Transform.create(entity, {
      position: Vector3.create(SHOTS[0].startPos.x, SHOTS[0].startPos.y, SHOTS[0].startPos.z),
      rotation: Quaternion.fromEulerDegrees(SHOTS[0].pitch, SHOTS[0].yaw, 0)
    })
    VirtualCamera.create(entity, {
      defaultTransition: { transitionMode: VirtualCamera.Transition.Time(0) }
    })
    cameraEntity = entity
  } catch (error) {
    cameraUnavailable = true
    console.log(`[CINEMATIC] VirtualCamera unavailable: ${error}`)
  }

  return cameraEntity
}

function activateCinematic(roundNumber: number): void {
  setCarriedVisible(false)
  currentShot = SHOTS[shotIndex % SHOTS.length]
  shotIndex++
  elapsed = 0
  cinematicStartRound = roundNumber

  const camera = getCameraEntity()
  if (camera === null) {
    cinematicActive = false
    setCinematicCameraActive(false)
    return
  }

  try {
    const transform = Transform.getMutable(camera)
    transform.position = Vector3.create(
      currentShot.startPos.x,
      currentShot.startPos.y,
      currentShot.startPos.z
    )
    transform.rotation = Quaternion.fromEulerDegrees(currentShot.pitch, currentShot.yaw, 0)
    MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: camera })
    cinematicActive = true
    setCinematicCameraActive(true)
  } catch (error) {
    cameraUnavailable = true
    cinematicActive = false
    setCinematicCameraActive(false)
    console.log(`[CINEMATIC] Camera activation failed: ${error}`)
  }
}

function releaseCinematic(reason: string): void {
  if (!cinematicActive) return

  cinematicActive = false
  setCinematicCameraActive(false)
  try {
    MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: undefined })
  } catch (error) {
    console.log(`[CINEMATIC] Camera release failed: ${error}`)
  }
  console.log(`[CINEMATIC] release reason=${reason}`)
}

export function cinematicSystem(dt: number): void {
  if (!initialized) {
    initialized = true
    try {
      MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: undefined })
    } catch (_) {}
  }

  const snapshot = getClientSnapshot()
  const phase = snapshot.phase
  const cinematicPhase = phase === 'COUNTDOWN' || phase === 'PERFORM' || phase === 'RESET'
  const shouldWatchCinematic = snapshot.playerStatus === 'ACTIVE' || snapshot.playerStatus === 'QUEUED'

  if (snapshot.isStale) {
    releaseCinematic('stale_state')
    return
  }

  if (!shouldWatchCinematic && cinematicActive) {
    releaseCinematic('player_left_game')
    setCarriedVisible(false)
    return
  }

  if (phase !== lastPhase) {
    lastPhase = phase

    if (cinematicPhase) {
      setCarriedVisible(false)
      if (shouldWatchCinematic && !cinematicActive) activateCinematic(snapshot.roundNumber)
    } else if (phase === 'BUILD' || phase === 'IDLE') {
      releaseCinematic('build_phase')
      setCarriedVisible(phase === 'BUILD' && snapshot.playerStatus === 'ACTIVE')
    }
  }

  // Queued players may join mid-transition.
  if (cinematicPhase && shouldWatchCinematic && !cinematicActive && !cameraUnavailable) {
    activateCinematic(snapshot.roundNumber)
  }

  if (!cinematicActive) return

  elapsed += dt
  if (snapshot.roundNumber > cinematicStartRound || elapsed >= WATCHDOG_SECONDS) {
    releaseCinematic(snapshot.roundNumber > cinematicStartRound ? 'round_advanced' : 'watchdog_timeout')
    return
  }

  const progress = Math.min(elapsed / DOLLY_DURATION_SECONDS, 1)
  try {
    const camera = getCameraEntity()
    if (camera === null) return
    Transform.getMutable(camera).position = Vector3.create(
      currentShot.startPos.x + (currentShot.endPos.x - currentShot.startPos.x) * progress,
      currentShot.startPos.y + (currentShot.endPos.y - currentShot.startPos.y) * progress,
      currentShot.startPos.z + (currentShot.endPos.z - currentShot.startPos.z) * progress
    )
  } catch (_) {}
}

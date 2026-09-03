import {
  ColliderLayer,
  engine,
  Entity,
  GltfContainer,
  InputAction,
  Material,
  MaterialTransparencyMode,
  MeshCollider,
  MeshRenderer,
  pointerEventsSystem,
  Transform,
  UiCanvasInformation
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getClientSnapshot, requestAttach } from '../game/gameState'
import { room } from '../shared/alienMessages'
import {
  COUNTDOWN_SECONDS,
  GLB_SCALE,
  PART_GLB,
  PLACEMENT_COOLDOWN_MS,
  PERFORMANCE_DURATION_SECONDS,
  PartType,
  SCENE_CENTER
} from '../shared/constants'
import { getTemplate, SlotDefinition } from '../shared/templates'
import { canStartPlacementCooldown, onWrongPart, openArtifactShop, playPress, playSuccess, showFeedback, startPlacementCooldown } from '../ui'

const visualEntities = new Set<Entity>()
const recentClicks = new Map<string, number>()
const PERFECT_EXPLOSION_SECONDS = COUNTDOWN_SECONDS + PERFORMANCE_DURATION_SECONDS + 0.55
const SPARK_LIFETIME_SECONDS = 1.9

interface SolidVisual {
  entity: Entity
  collider: Entity
  basePosition: Vector3
  baseScale: Vector3
  baseColliderScale: Vector3
  baseRotation: Quaternion
  index: number
}

interface CelebrationPose {
  x: number
  y: number
  z: number
  scale: number
  rotationX: number
  rotationY: number
  rotationZ: number
}

interface SparkVisual {
  entity: Entity
  velocity: Vector3
  age: number
  scale: number
}

interface PlacementLaunch {
  entity: Entity
  start: Vector3
  target: Vector3
  scale: Vector3
  rotation: Quaternion
  age: number
  duration: number
  arcHeight: number
}

const solidVisuals: SolidVisual[] = []
const sparkVisuals: SparkVisual[] = []
const placementLaunches: PlacementLaunch[] = []
const animatedPlacementKeys = new Set<string>()
let celebrationRound = -1
let celebrationPhase = ''
let celebrationPhaseElapsed = 0
let celebrationExploded = false
let celebrationActive = false
let observedRoundNumber = 0
let observedTemplateId = ''
let observedOwnOccupiedMask = 0

const DBC_SCENE_MODELS = [
  'assets/scene/Models/DBC/as_enviroment_20260902.glb',
  'assets/scene/Models/DBC/base_nave01.glb',
  'assets/scene/Models/DBC/base_nave02.glb',
  'assets/scene/Models/DBC/console01.glb',
  'assets/scene/Models/DBC/console02.glb',
  'assets/scene/Models/DBC/laser_console_01.glb',
  'assets/scene/Models/DBC/laser_console02.glb',
  'assets/scene/Models/DBC/laser_dome01.glb',
  'assets/scene/Models/DBC/laser_dome02.glb',
  'assets/scene/Models/DBC/laser_dome03.glb',
  'assets/scene/Models/DBC/laser_dome04.glb',
  'assets/scene/Models/DBC/laser_dome05.glb',
  'assets/scene/Models/DBC/laser_dome06.glb',
  'assets/scene/Models/DBC/laser_dome07.glb',
  'assets/scene/Models/DBC/laser_dome08.glb',
  'assets/scene/Models/DBC/laser_dome09.glb',
  'assets/scene/Models/DBC/laser_dome10.glb',
  'assets/scene/Models/DBC/laser_dome11.glb',
  'assets/scene/Models/DBC/laser_dome12.glb',
  'assets/scene/Models/DBC/Particles.glb',
  'assets/scene/Models/DBC/Plarform_light_L.glb',
  'assets/scene/Models/DBC/Plarform_light_R.glb',
  'assets/scene/Models/DBC/plarform_light_l_02.glb',
  'assets/scene/Models/DBC/plarform_light_r_02.glb',
  'assets/scene/Models/DBC/Top_dome01.glb',
  'assets/scene/Models/DBC/Top_dome02.glb'
]
const INTERACTIVE_CONSOLE_MASK = ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER

let arenaEntities: Entity[] | undefined
let renderedStateKey = ''
let getSelectedPart: () => PartType = () => 'CUBE'

function mobileLiteMode(): boolean {
  const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  return canvasInfo !== null && (
    canvasInfo.width < 1500 ||
    canvasInfo.height < 850 ||
    canvasInfo.devicePixelRatio >= 1.75
  )
}
const GHOST_COLOR: Record<PartType, Color4> = {
  CUBE: Color4.create(0.1, 0.3, 1, 0.22),
  CYLINDER: Color4.create(1, 0.1, 0.1, 0.22),
  CONE: Color4.create(1, 0.85, 0, 0.22)
}

const GHOST_EMISSIVE: Record<PartType, Color4> = {
  CUBE: Color4.create(0.1, 0.3, 1, 1),
  CYLINDER: Color4.create(1, 0.1, 0.1, 1),
  CONE: Color4.create(1, 0.85, 0, 1)
}

function slotPosition(slot: SlotDefinition): Vector3 {
  return Vector3.create(slot.position.x, slot.position.y, slot.position.z)
}

function slotScale(slot: SlotDefinition): Vector3 {
  return Vector3.create(
    slot.scale.x * GLB_SCALE,
    slot.scale.y * GLB_SCALE,
    slot.scale.z * GLB_SCALE
  )
}

function partRotation(part: PartType): Quaternion {
  return part === 'CONE' ? Quaternion.fromEulerDegrees(180, 0, 0) : Quaternion.Identity()
}

function trackEntity(entity: Entity): Entity {
  visualEntities.add(entity)
  return entity
}

function removeVisualEntity(entity: Entity): void {
  if (!visualEntities.delete(entity)) return
  try {
    engine.removeEntity(entity)
  } catch (_) {}
}

function removePlacementLaunch(index: number): void {
  const launch = placementLaunches[index]
  if (!launch) return
  try {
    engine.removeEntity(launch.entity)
  } catch (_) {}
  placementLaunches.splice(index, 1)
}

function clearPlacementLaunches(): void {
  for (let index = placementLaunches.length - 1; index >= 0; index--) {
    removePlacementLaunch(index)
  }
}

function placementAnimationKey(roundNumber: number, templateId: string, slotId: string): string {
  return `${roundNumber}:${templateId}:${slotId}`
}

function clearVisualEntities(): void {
  for (const entity of visualEntities) {
    try {
      engine.removeEntity(entity)
    } catch (_) {}
  }
  visualEntities.clear()
  recentClicks.clear()
  solidVisuals.length = 0
  sparkVisuals.length = 0
}

function playerLaunchStart(target: Vector3): Vector3 {
  const fallback = Vector3.create(target.x, target.y + 2.2, target.z + 3.5)
  if (!Transform.has(engine.PlayerEntity)) return fallback

  const player = Transform.get(engine.PlayerEntity).position
  const dx = target.x - player.x
  const dz = target.z - player.z
  const distance = Math.max(0.001, Math.sqrt(dx * dx + dz * dz))
  const sideX = -dz / distance
  const sideZ = dx / distance
  return Vector3.create(
    player.x + (dx / distance) * 0.06 + sideX * 0.32,
    player.y + 1.35,
    player.z + (dz / distance) * 0.06 + sideZ * 0.32
  )
}

function spawnPlacementLaunch(slot: SlotDefinition): void {
  const target = slotPosition(slot)
  const start = playerLaunchStart(target)
  const entity = engine.addEntity()
  const scale = Vector3.scale(slotScale(slot), mobileLiteMode() ? 0.75 : 0.9)
  const dx = target.x - start.x
  const dz = target.z - start.z
  const distance = Math.sqrt(dx * dx + dz * dz)

  Transform.create(entity, {
    position: start,
    scale,
    rotation: partRotation(slot.requiredPart)
  })
  GltfContainer.create(entity, {
    src: PART_GLB[slot.requiredPart],
    visibleMeshesCollisionMask: 0,
    invisibleMeshesCollisionMask: 0
  })

  placementLaunches.push({
    entity,
    start,
    target,
    scale,
    rotation: partRotation(slot.requiredPart),
    age: 0,
    duration: mobileLiteMode() ? 0.58 : 0.75,
    arcHeight: Math.max(1.35, Math.min(4.2, distance * 0.22))
  })

  while (placementLaunches.length > 30) removePlacementLaunch(0)
}

function createGhost(slot: SlotDefinition): void {
  const entity = trackEntity(engine.addEntity())
  Transform.create(entity, {
    position: slotPosition(slot),
    scale: Vector3.scale(slotScale(slot), 2),
    rotation: partRotation(slot.requiredPart)
  })

  if (slot.requiredPart === 'CUBE') MeshRenderer.setBox(entity)
  else if (slot.requiredPart === 'CYLINDER') MeshRenderer.setCylinder(entity)
  else MeshRenderer.setCylinder(entity, 0, 0.5)

  Material.setPbrMaterial(entity, {
    albedoColor: GHOST_COLOR[slot.requiredPart],
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    emissiveColor: GHOST_EMISSIVE[slot.requiredPart],
    emissiveIntensity: 1.2
  })
}

function createHitbox(slot: SlotDefinition): void {
  const entity = trackEntity(engine.addEntity())
  Transform.create(entity, {
    position: slotPosition(slot),
    scale: Vector3.scale(slotScale(slot), 2),
    rotation: partRotation(slot.requiredPart)
  })
  MeshCollider.setBox(entity, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Click to place',
        maxDistance: 8
      }
    },
    () => onSlotClick(slot)
  )
}

function createSolid(slot: SlotDefinition, index: number): void {
  const solid = trackEntity(engine.addEntity())
  const basePosition = slotPosition(slot)
  const baseScale = slotScale(slot)
  const baseColliderScale = Vector3.scale(baseScale, 2)
  const baseRotation = partRotation(slot.requiredPart)
  Transform.create(solid, {
    position: basePosition,
    scale: baseScale,
    rotation: baseRotation
  })
  GltfContainer.create(solid, {
    src: PART_GLB[slot.requiredPart],
    visibleMeshesCollisionMask: 0,
    invisibleMeshesCollisionMask: 0
  })
  const collider = trackEntity(engine.addEntity())
  Transform.create(collider, {
    position: basePosition,
    scale: baseColliderScale,
    rotation: baseRotation
  })
  MeshCollider.setBox(collider, ColliderLayer.CL_PHYSICS)
  solidVisuals.push({
    entity: solid,
    collider,
    basePosition,
    baseScale,
    baseColliderScale,
    baseRotation,
    index
  })
}

function createOtherPlayerDim(slot: SlotDefinition): void {
  const basePosition = slotPosition(slot)
  const baseScale = slotScale(slot)
  const overlay = trackEntity(engine.addEntity())
  Transform.create(overlay, {
    position: Vector3.create(basePosition.x, basePosition.y + baseScale.y * 0.05, basePosition.z),
    scale: Vector3.create(baseScale.x * 2.1, baseScale.y * 2.1, baseScale.z * 2.1),
    rotation: partRotation(slot.requiredPart)
  })

  if (slot.requiredPart === 'CUBE') MeshRenderer.setBox(overlay)
  else if (slot.requiredPart === 'CYLINDER') MeshRenderer.setCylinder(overlay)
  else MeshRenderer.setCylinder(overlay, 0, 0.5)

  Material.setPbrMaterial(overlay, {
    albedoColor: Color4.create(0.015, 0.02, 0.04, 0.58),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    emissiveColor: Color4.create(0, 0.04, 0.08, 1),
    emissiveIntensity: 0.2,
    metallic: 0,
    roughness: 0.85
  })
}

function flashSlot(slot: SlotDefinition, color: Color4): void {
  const entity = trackEntity(engine.addEntity())
  Transform.create(entity, {
    position: slotPosition(slot),
    scale: Vector3.scale(slotScale(slot), 3),
    rotation: Quaternion.Identity()
  })
  MeshRenderer.setBox(entity)
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.create(color.r, color.g, color.b, 0.5),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    emissiveColor: color,
    emissiveIntensity: 3
  })
  setTimeout(() => removeVisualEntity(entity), 500)
}

function onSlotClick(slot: SlotDefinition): void {
  const snapshot = getClientSnapshot()
  if (!snapshot.resolved || snapshot.isStale) {
    showFeedback('Syncing...')
    return
  }
  if (snapshot.phase !== 'BUILD') return
  if (snapshot.playerStatus !== 'ACTIVE') {
    showFeedback('Join the next round to place blocks')
    return
  }

  const now = Date.now()
  const noCooldownActive = now < snapshot.noCooldownUntil
  const lastClick = recentClicks.get(slot.slotId) ?? 0
  if (!noCooldownActive && now - lastClick < PLACEMENT_COOLDOWN_MS.manual[slot.requiredPart]) return

  const selectedPart = getSelectedPart()
  if (selectedPart !== slot.requiredPart) {
    flashSlot(slot, Color4.create(1, 0.1, 0.1, 1))
    onWrongPart(slot.requiredPart)
    return
  }
  if (!noCooldownActive && !canStartPlacementCooldown(selectedPart, 'manual')) return

  recentClicks.set(slot.slotId, now)
  flashSlot(slot, Color4.create(1, 1, 0.5, 1))
  playSuccess()
  if (!noCooldownActive) startPlacementCooldown(selectedPart, 'manual')
  requestAttach(slot.slotId, selectedPart, 'manual')
}

function setupArena(): void {
  if (arenaEntities !== undefined) return
  arenaEntities = DBC_SCENE_MODELS.map((src) => {
    const isConsole = src.toLowerCase().includes('console')
    const entity = engine.addEntity()
    Transform.create(entity, {
      position: Vector3.create(SCENE_CENTER.x, SCENE_CENTER.y + 0.2, SCENE_CENTER.z),
      rotation: Quaternion.Identity(),
      scale: Vector3.One()
    })
    GltfContainer.create(entity, {
      src,
      visibleMeshesCollisionMask: isConsole ? INTERACTIVE_CONSOLE_MASK : ColliderLayer.CL_PHYSICS,
      invisibleMeshesCollisionMask: isConsole ? INTERACTIVE_CONSOLE_MASK : ColliderLayer.CL_PHYSICS
    })
    if (isConsole) {
      pointerEventsSystem.onPointerDown(
        {
          entity,
          opts: {
            button: InputAction.IA_POINTER,
            hoverText: 'Open artifact shop',
            maxDistance: 12
          }
        },
        () => {
          playPress()
          openArtifactShop()
        }
      )
    }
    return entity
  })
}

export function setupEntities(selectedPartProvider: () => PartType): void {
  getSelectedPart = selectedPartProvider
  setupArena()

  room.onMessage('attachResult', (data) => {
    if (data.ok) {
      const slot = getTemplate(getClientSnapshot().templateId)?.find((item) => item.slotId === data.slotId)
      if (slot) {
        const snapshot = getClientSnapshot()
        animatedPlacementKeys.add(placementAnimationKey(snapshot.roundNumber, snapshot.templateId, slot.slotId))
        spawnPlacementLaunch(slot)
        flashSlot(slot, Color4.create(0.2, 1, 0.85, 1))
      }
      return
    }
    recentClicks.delete(data.slotId)
    if (data.reason === 'wrong_part') {
      const slot = getTemplate(getClientSnapshot().templateId)?.find((item) => item.slotId === data.slotId)
      if (slot) flashSlot(slot, Color4.create(1, 0.1, 0.1, 1))
      onWrongPart(data.required as PartType)
      return
    }
    if (data.reason === 'not_active') {
      showFeedback('Joining next round')
      return
    }
    showFeedback(data.reason === 'slot_occupied' ? 'Slot already taken' : data.reason === 'cooldown' ? 'Cooling down' : 'Try again')
  })
}

export function reconcileScene(): void {
  const snapshot = getClientSnapshot()
  if (!snapshot.resolved || snapshot.isStale || snapshot.phase === 'IDLE') {
    if (renderedStateKey !== '') {
      clearVisualEntities()
      renderedStateKey = ''
    }
    return
  }

  const stateKey = [
    snapshot.roundNumber,
    snapshot.templateId,
    snapshot.phase,
    snapshot.occupiedMask,
    snapshot.ownOccupiedMask,
    snapshot.playerStatus
  ].join(':')
  if (stateKey === renderedStateKey) return

  const slots = getTemplate(snapshot.templateId)
  if (!slots) return

  const sameBuild = observedRoundNumber === snapshot.roundNumber && observedTemplateId === snapshot.templateId
  const previousOwnMask = sameBuild ? observedOwnOccupiedMask : 0
  const newlyOwnedMask = snapshot.occupiedMask & snapshot.ownOccupiedMask & ~previousOwnMask
  if (!sameBuild) animatedPlacementKeys.clear()

  clearVisualEntities()
  const showAvailableSlots = snapshot.phase === 'BUILD'
  const canInteract = showAvailableSlots && snapshot.playerStatus === 'ACTIVE'

  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index]
    const occupied = ((snapshot.occupiedMask >> index) & 1) === 1
    const owned = ((snapshot.ownOccupiedMask >> index) & 1) === 1
    const newlyOwned = ((newlyOwnedMask >> index) & 1) === 1
    if (occupied) {
      createSolid(slot, index)
      if (newlyOwned && snapshot.playerStatus === 'ACTIVE') {
        const key = placementAnimationKey(snapshot.roundNumber, snapshot.templateId, slot.slotId)
        if (!animatedPlacementKeys.has(key)) {
          animatedPlacementKeys.add(key)
          spawnPlacementLaunch(slot)
          flashSlot(slot, Color4.create(0.2, 1, 0.85, 1))
        }
      }
      if (snapshot.phase === 'BUILD' && snapshot.playerStatus === 'ACTIVE') {
        if (!owned) createOtherPlayerDim(slot)
      }
    } else if (showAvailableSlots) {
      createGhost(slot)
      if (canInteract) createHitbox(slot)
    }
  }

  renderedStateKey = stateKey
  observedRoundNumber = snapshot.roundNumber
  observedTemplateId = snapshot.templateId
  observedOwnOccupiedMask = snapshot.ownOccupiedMask
}

export function placementLaunchSystem(dt: number): void {
  const safeDt = Math.min(Math.max(dt, 0), 0.1)
  for (let index = placementLaunches.length - 1; index >= 0; index--) {
    const launch = placementLaunches[index]
    launch.age += safeDt
    const progress = Math.min(1, launch.age / launch.duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    const arc = Math.sin(progress * Math.PI) * launch.arcHeight

    if (!Transform.has(launch.entity)) {
      placementLaunches.splice(index, 1)
      continue
    }

    const transform = Transform.getMutable(launch.entity)
    transform.position = Vector3.create(
      launch.start.x + (launch.target.x - launch.start.x) * eased,
      launch.start.y + (launch.target.y - launch.start.y) * eased + arc,
      launch.start.z + (launch.target.z - launch.start.z) * eased
    )
    const pulse = 0.86 + Math.sin(progress * Math.PI) * 0.18
    transform.scale = Vector3.create(
      launch.scale.x * pulse,
      launch.scale.y * pulse,
      launch.scale.z * pulse
    )
    transform.rotation = Quaternion.multiply(
      launch.rotation,
      Quaternion.fromEulerDegrees(progress * 180, progress * 260, progress * 90)
    )

    if (progress >= 1) removePlacementLaunch(index)
  }
}

function restoreSolidVisuals(): void {
  for (const visual of solidVisuals) {
    if (Transform.has(visual.entity)) {
      const transform = Transform.getMutable(visual.entity)
      transform.position = visual.basePosition
      transform.scale = visual.baseScale
      transform.rotation = visual.baseRotation
    }
    if (Transform.has(visual.collider)) {
      const colliderTransform = Transform.getMutable(visual.collider)
      colliderTransform.position = visual.basePosition
      colliderTransform.scale = visual.baseColliderScale
      colliderTransform.rotation = visual.baseRotation
    }
  }
}

function setSolidPose(visual: SolidVisual, pose: CelebrationPose): void {
  const position = Vector3.create(
    visual.basePosition.x + pose.x,
    visual.basePosition.y + pose.y,
    visual.basePosition.z + pose.z
  )
  const rotation = Quaternion.multiply(
    visual.baseRotation,
    Quaternion.fromEulerDegrees(pose.rotationX, pose.rotationY, pose.rotationZ)
  )

  if (Transform.has(visual.entity)) {
    const transform = Transform.getMutable(visual.entity)
    transform.position = position
    transform.scale = Vector3.scale(visual.baseScale, pose.scale)
    transform.rotation = rotation
  }
  if (Transform.has(visual.collider)) {
    const colliderTransform = Transform.getMutable(visual.collider)
    colliderTransform.position = position
    colliderTransform.scale = Vector3.scale(visual.baseColliderScale, pose.scale)
    colliderTransform.rotation = rotation
  }
}

function celebrationPose(
  templateId: string,
  visual: SolidVisual,
  elapsed: number,
  progress: number
): CelebrationPose {
  const index = visual.index
  const phase = index * 0.67
  const wave = Math.sin(elapsed * 3 + phase)
  const close = 1 - Math.max(0, (progress - 0.78) / 0.22) * 0.45
  const pulse = 0.9 + (Math.sin(elapsed * 4 + phase) + 1) * 0.11
  let pose: CelebrationPose = {
    x: Math.sin(elapsed * 2.2 + phase) * 0.25,
    y: 0.45 + wave * 0.35,
    z: Math.cos(elapsed * 2 + phase) * 0.18,
    scale: pulse,
    rotationX: wave * 12,
    rotationY: elapsed * 55 + index * 12,
    rotationZ: Math.sin(elapsed * 2.4 + phase) * 14
  }

  switch (templateId) {
    case 'CASTLE': {
      const side = index % 2 === 0 ? -1 : 1
      pose = {
        x: side * Math.sin(elapsed * 2.5 + Math.floor(index / 2) * 0.55) * 0.48,
        y: 0.55 + wave * 0.42,
        z: Math.cos(elapsed * 2.2 + phase) * 0.2,
        scale: pulse,
        rotationX: wave * 10,
        rotationY: side * Math.sin(elapsed * 2) * 24,
        rotationZ: side * wave * 18
      }
      break
    }
    case 'PYRAMID': {
      const angle = elapsed * 1.7 + index * 1.047
      const radius = 0.28 + (Math.sin(elapsed * 2.8 + phase) + 1) * 0.13
      pose = {
        x: Math.cos(angle) * radius,
        y: 0.45 + Math.sin(elapsed * 3.2 + phase) * 0.38,
        z: Math.sin(angle) * radius,
        scale: pulse,
        rotationX: Math.cos(angle) * 15,
        rotationY: elapsed * 75 + index * 24,
        rotationZ: Math.sin(angle) * 15
      }
      break
    }
    case 'TOWER': {
      const angle = elapsed * 2.1 + index * 0.52
      pose = {
        x: Math.cos(angle) * 0.26,
        y: 0.5 + Math.sin(elapsed * 3.4 - phase) * 0.58,
        z: Math.sin(angle) * 0.26,
        scale: 0.88 + (Math.sin(elapsed * 4.4 - phase) + 1) * 0.12,
        rotationX: Math.sin(angle) * 10,
        rotationY: elapsed * (72 + index * 4),
        rotationZ: Math.cos(angle) * 10
      }
      break
    }
    case 'ARCH': {
      const side = Math.sign(visual.basePosition.x - SCENE_CENTER.x)
      pose = {
        x: side * Math.sin(elapsed * 2.25 + Math.abs(side)) * 0.4,
        y: 0.48 + Math.cos(elapsed * 3 + phase) * 0.42,
        z: Math.sin(elapsed * 2.7 + phase) * 0.16,
        scale: pulse,
        rotationX: wave * 9,
        rotationY: side * Math.sin(elapsed * 2.3) * 18,
        rotationZ: -side * Math.sin(elapsed * 2.3) * 28
      }
      break
    }
    case 'KEEP': {
      const radialX = visual.basePosition.x - SCENE_CENTER.x
      const breath = Math.sin(elapsed * 2.8 + phase) * 0.16
      pose = {
        x: radialX * breath,
        y: 0.5 + wave * 0.45,
        z: Math.cos(elapsed * 2.5 + phase) * 0.22,
        scale: 0.88 + (Math.sin(elapsed * 3.5 + phase) + 1) * 0.12,
        rotationX: wave * 8,
        rotationY: Math.sin(elapsed * 2.1 + phase) * 26,
        rotationZ: radialX * wave * 5
      }
      break
    }
    case 'FORTRESS': {
      const ripple = Math.sin(elapsed * 3.6 + index * 0.46)
      pose = {
        x: Math.cos(index * 0.72) * ripple * 0.34,
        y: 0.52 + ripple * 0.54,
        z: Math.sin(index * 0.72) * ripple * 0.3,
        scale: 0.9 + (ripple + 1) * 0.1,
        rotationX: ripple * 13,
        rotationY: Math.sin(elapsed * 2 + phase) * 32,
        rotationZ: Math.cos(elapsed * 2.4 + phase) * 13
      }
      break
    }
    case 'SPACESHIP': {
      const bank = Math.sin(elapsed * 1.9)
      pose = {
        x: bank * 0.58 + Math.sin(phase) * 0.12,
        y: 0.68 + Math.sin(elapsed * 2.7 + phase) * 0.28,
        z: Math.cos(elapsed * 1.9) * 0.34 + Math.cos(phase) * 0.1,
        scale: pulse,
        rotationX: Math.cos(elapsed * 1.9) * 18,
        rotationY: Math.sin(elapsed * 1.5) * 24,
        rotationZ: bank * 30
      }
      break
    }
    case 'ROVER': {
      const suspension = Math.abs(Math.sin(elapsed * 3.7 + phase))
      pose = {
        x: (index % 2 === 0 ? -1 : 1) * Math.sin(elapsed * 2.4 + phase) * 0.25,
        y: 0.28 + suspension * 0.62,
        z: Math.cos(elapsed * 2.6 + phase) * 0.19,
        scale: 0.92 + suspension * 0.16,
        rotationX: index < 4 ? elapsed * 190 : wave * 15,
        rotationY: Math.sin(elapsed * 2 + phase) * 16,
        rotationZ: index < 4 ? wave * 10 : wave * 22
      }
      break
    }
    case 'ROBOT': {
      const side = index % 2 === 0 ? -1 : 1
      pose = {
        x: side * Math.sin(elapsed * 2.8 + phase) * 0.34,
        y: 0.48 + Math.sin(elapsed * 3.3 + phase) * 0.5,
        z: Math.cos(elapsed * 2.5 + phase) * 0.17,
        scale: pulse,
        rotationX: Math.cos(elapsed * 2.6 + phase) * 18,
        rotationY: side * Math.sin(elapsed * 2.2) * 28,
        rotationZ: side * Math.sin(elapsed * 3.1 + phase) * 34
      }
      break
    }
  }

  pose.x *= close
  pose.z *= close
  return pose
}

function spawnPlacementExplosion(slot: SlotDefinition): void {
  const origin = slotPosition(slot)
  const color = GHOST_EMISSIVE[slot.requiredPart]
  const count = mobileLiteMode() ? 8 : 32

  for (let index = 0; index < count; index++) {
    const angle = index * 2.399963229728653
    const entity = trackEntity(engine.addEntity())
    const scale = 0.18 + (index % 4) * 0.045
    Transform.create(entity, {
      position: Vector3.create(origin.x, origin.y, origin.z),
      rotation: Quaternion.fromEulerDegrees(index * 19, index * 31, index * 13),
      scale: Vector3.create(scale * 0.55, scale * 2.8, scale * 0.55)
    })
    MeshRenderer.setBox(entity)
    Material.setPbrMaterial(entity, {
      albedoColor: color,
      emissiveColor: color,
      emissiveIntensity: 9,
      metallic: 0.1,
      roughness: 0.18
    })
    sparkVisuals.push({
      entity,
      velocity: Vector3.create(
        Math.cos(angle) * (2.1 + (index % 5) * 0.28),
        2.6 + (index % 6) * 0.32,
        Math.sin(angle) * (2.1 + (index % 5) * 0.28)
      ),
      age: 0,
      scale
    })
  }
}

function clearSparks(): void {
  for (const spark of sparkVisuals) removeVisualEntity(spark.entity)
  sparkVisuals.length = 0
}

function spawnPerfectExplosion(): void {
  if (solidVisuals.length === 0) return
  const colors = [
    Color4.create(0.15, 1, 0.9, 1),
    Color4.create(1, 0.82, 0.18, 1),
    Color4.create(1, 0.25, 0.72, 1),
    Color4.create(0.45, 0.65, 1, 1)
  ]
  const count = Math.min(mobileLiteMode() ? 12 : 36, solidVisuals.length * 2)

  for (let index = 0; index < count; index++) {
    const source = solidVisuals[index % solidVisuals.length]
    if (!Transform.has(source.entity)) continue
    const origin = Transform.get(source.entity).position
    const angle = index * 2.399963229728653
    const radialX = origin.x - SCENE_CENTER.x
    const radialZ = origin.z - SCENE_CENTER.z
    const radialLength = Math.max(0.2, Math.sqrt(radialX * radialX + radialZ * radialZ))
    const speed = 2.2 + (index % 5) * 0.42
    const entity = trackEntity(engine.addEntity())
    const scale = 0.14 + (index % 4) * 0.045

    Transform.create(entity, {
      position: Vector3.create(origin.x, origin.y, origin.z),
      rotation: Quaternion.fromEulerDegrees(index * 17, index * 29, index * 11),
      scale: Vector3.create(scale * 0.35, scale * 2.2, scale * 0.35)
    })
    MeshRenderer.setBox(entity)
    const color = colors[index % colors.length]
    Material.setPbrMaterial(entity, {
      albedoColor: color,
      emissiveColor: color,
      emissiveIntensity: 5,
      metallic: 0.15,
      roughness: 0.2
    })
    sparkVisuals.push({
      entity,
      velocity: Vector3.create(
        (radialX / radialLength) * speed + Math.cos(angle) * 0.9,
        2.8 + (index % 6) * 0.55,
        (radialZ / radialLength) * speed + Math.sin(angle) * 0.9
      ),
      age: 0,
      scale
    })
  }
}

function updateSparks(dt: number): void {
  for (let index = sparkVisuals.length - 1; index >= 0; index--) {
    const spark = sparkVisuals[index]
    spark.age += dt
    if (spark.age >= SPARK_LIFETIME_SECONDS || !Transform.has(spark.entity)) {
      removeVisualEntity(spark.entity)
      sparkVisuals.splice(index, 1)
      continue
    }

    const transform = Transform.getMutable(spark.entity)
    spark.velocity = Vector3.create(spark.velocity.x, spark.velocity.y - 3.8 * dt, spark.velocity.z)
    transform.position = Vector3.create(
      transform.position.x + spark.velocity.x * dt,
      transform.position.y + spark.velocity.y * dt,
      transform.position.z + spark.velocity.z * dt
    )
    const remaining = 1 - spark.age / SPARK_LIFETIME_SECONDS
    const scale = spark.scale * remaining
    transform.scale = Vector3.create(scale * 0.35, scale * 2.2, scale * 0.35)
    transform.rotation = Quaternion.fromEulerDegrees(
      spark.age * 260 + index * 13,
      spark.age * 340 + index * 19,
      spark.age * 210
    )
  }
}

function cinematicPhaseOffset(phase: string): number {
  if (phase === 'PERFORM') return COUNTDOWN_SECONDS
  if (phase === 'RESET') return COUNTDOWN_SECONDS + PERFORMANCE_DURATION_SECONDS
  return 0
}

export function perfectTemplateAnimationSystem(dt: number): void {
  const safeDt = Math.min(Math.max(dt, 0), 0.1)
  const snapshot = getClientSnapshot()
  const cinematicPhase = snapshot.phase === 'COUNTDOWN' || snapshot.phase === 'PERFORM' || snapshot.phase === 'RESET'
  const shouldAnimate = cinematicPhase && snapshot.performanceType === 'PERFECT' && snapshot.cinematicEligible

  if (!shouldAnimate) {
    if (celebrationActive) {
      restoreSolidVisuals()
      clearSparks()
      celebrationActive = false
    } else {
      updateSparks(safeDt)
    }
    return
  }

  if (celebrationRound !== snapshot.roundNumber) {
    celebrationRound = snapshot.roundNumber
    celebrationPhase = snapshot.phase
    celebrationPhaseElapsed = 0
    celebrationExploded = false
    clearSparks()
  } else if (celebrationPhase !== snapshot.phase) {
    celebrationPhase = snapshot.phase
    celebrationPhaseElapsed = 0
  }
  celebrationActive = true
  celebrationPhaseElapsed += safeDt

  const elapsed = cinematicPhaseOffset(snapshot.phase) + celebrationPhaseElapsed
  if (false && !celebrationExploded && elapsed >= PERFECT_EXPLOSION_SECONDS) {
    celebrationExploded = true
    spawnPerfectExplosion()
  }

  if (celebrationExploded) {
    for (const visual of solidVisuals) {
      if (Transform.has(visual.entity)) {
        Transform.getMutable(visual.entity).scale = Vector3.create(0.001, 0.001, 0.001)
      }
      if (Transform.has(visual.collider)) {
        Transform.getMutable(visual.collider).scale = Vector3.create(0.001, 0.001, 0.001)
      }
    }
    updateSparks(safeDt)
    return
  }

  const progress = Math.min(1, elapsed / PERFECT_EXPLOSION_SECONDS)
  for (const visual of solidVisuals) {
    setSolidPose(visual, celebrationPose(snapshot.templateId, visual, elapsed, progress))
  }
}

export function clearAllVisuals(): void {
  clearVisualEntities()
  clearPlacementLaunches()
  renderedStateKey = ''
}



import {
  Billboard,
  BillboardMode,
  engine,
  Entity,
  GltfContainer,
  TextShape,
  Transform,
  UiCanvasInformation
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getClientSnapshot, TrophySnapshot } from '../game/gameState'
import { GLB_SCALE, PART_GLB, PartType, SCENE_CENTER, TEMPLATE_BASE_Y } from '../shared/constants'
import { getTemplate, SlotDefinition } from '../shared/templates'

const MAX_VISIBLE_TROPHIES = 3
const MAX_VISIBLE_TROPHIES_MOBILE = 0
const ASCENT_SECONDS = 3.5
const TROPHY_SCALE = 1.57

const ORBIT_PATHS = [
  { centerX: SCENE_CENTER.x - 20, centerZ: SCENE_CENTER.z, radius: 4.5, height: 10, speed: 0.48 },
  { centerX: SCENE_CENTER.x, centerZ: SCENE_CENTER.z - 20, radius: 4.5, height: 10, speed: 0.44 },
  { centerX: SCENE_CENTER.x + 30, centerZ: SCENE_CENTER.z, radius: 4.5, height: 10, speed: 0.4 },
  { centerX: SCENE_CENTER.x - 11, centerZ: SCENE_CENTER.z + 27, radius: 4.5, height: 10, speed: 0.36 },
  { centerX: SCENE_CENTER.x + 22, centerZ: SCENE_CENTER.z + 27, radius: 4.5, height: 10, speed: 0.32 }
] as const

interface TrophyVisual {
  record: TrophySnapshot
  root: Entity
  label: Entity
  entities: Entity[]
  ascentSeconds: number
  phase: number
  orbitIndex: number
}

const trophies = new Map<number, TrophyVisual>()
let historyInitialized = false
let orbitTime = 0

function mobileLiteMode(): boolean {
  const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (!canvasInfo) return true
  return canvasInfo.width < 1500 ||
    canvasInfo.height < 850 ||
    canvasInfo.devicePixelRatio >= 1.75
}

function visibleTrophyLimit(): number {
  return mobileLiteMode() ? MAX_VISIBLE_TROPHIES_MOBILE : MAX_VISIBLE_TROPHIES
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

function removeTrophy(visual: TrophyVisual): void {
  for (let index = visual.entities.length - 1; index >= 0; index--) {
    try { engine.removeEntity(visual.entities[index]) } catch (_) {}
  }
}

function createTrophy(record: TrophySnapshot, animate: boolean, orbitIndex: number): TrophyVisual | null {
  const slots = getTemplate(record.templateId)
  if (!slots) return null

  const root = engine.addEntity()
  const label = engine.addEntity()
  const entities: Entity[] = [root]
  Transform.create(root, {
    position: Vector3.create(SCENE_CENTER.x, TEMPLATE_BASE_Y + 1, SCENE_CENTER.z),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(TROPHY_SCALE, TROPHY_SCALE, TROPHY_SCALE)
  })

  for (const slot of slots) {
    const part = engine.addEntity()
    entities.push(part)
    Transform.create(part, {
      parent: root,
      position: Vector3.create(
        slot.position.x - SCENE_CENTER.x,
        slot.position.y - TEMPLATE_BASE_Y,
        slot.position.z - SCENE_CENTER.z
      ),
      rotation: partRotation(slot.requiredPart),
      scale: slotScale(slot)
    })
    GltfContainer.create(part, {
      src: PART_GLB[slot.requiredPart],
      visibleMeshesCollisionMask: 0,
      invisibleMeshesCollisionMask: 0
    })
  }

  entities.push(label)
  Transform.create(label, {
    position: Vector3.create(SCENE_CENTER.x, TEMPLATE_BASE_Y + 5, SCENE_CENTER.z),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  TextShape.create(label, {
    text: `${record.templateId}\nCOMPLETED BY: ${record.builders || 'ALIEN SCRAPERS'}`,
    fontSize: 2.9,
    fontAutoSize: true,
    width: 10.5,
    height: 3,
    lineCount: 3,
    textWrapping: true,
    textColor: Color4.create(0.2, 1, 0.9, 1),
    outlineColor: Color3.create(0, 0, 0),
    outlineWidth: 0.18,
    shadowColor: Color3.create(0, 0, 0),
    shadowBlur: 0.2,
    shadowOffsetX: 0.08,
    shadowOffsetY: -0.08
  })
  Billboard.create(label, { billboardMode: BillboardMode.BM_ALL })

  return {
    record,
    root,
    label,
    entities,
    ascentSeconds: animate ? 0 : ASCENT_SECONDS,
    phase: record.id * 2.399963229728653,
    orbitIndex
  }
}

function reconcileTrophies(records: TrophySnapshot[]): void {
  const limit = visibleTrophyLimit()
  const visible = limit <= 0 ? [] : records.slice(-limit)
  const visibleIds = new Set(visible.map((record) => record.id))

  for (const [id, visual] of trophies) {
    if (visibleIds.has(id)) continue
    removeTrophy(visual)
    trophies.delete(id)
  }

  const usedOrbits = new Set(Array.from(trophies.values()).map((visual) => visual.orbitIndex))
  for (const record of visible) {
    if (trophies.has(record.id)) continue
    const orbitIndex = ORBIT_PATHS.findIndex((_path, index) => !usedOrbits.has(index))
    if (orbitIndex < 0) continue
    const visual = createTrophy(record, historyInitialized, orbitIndex)
    if (visual) {
      trophies.set(record.id, visual)
      usedOrbits.add(orbitIndex)
    }
  }
}

function easeOutCubic(value: number): number {
  const inverse = 1 - value
  return 1 - inverse * inverse * inverse
}

export function trophySystem(dt: number): void {
  const snapshot = getClientSnapshot()
  if (!snapshot.resolved) return

  reconcileTrophies(snapshot.trophies)
  historyInitialized = true
  orbitTime += Math.min(Math.max(dt, 0), 0.1)

  for (const visual of trophies.values()) {
    visual.ascentSeconds = Math.min(ASCENT_SECONDS, visual.ascentSeconds + dt)
    const progress = easeOutCubic(visual.ascentSeconds / ASCENT_SECONDS)
    const orbit = ORBIT_PATHS[visual.orbitIndex]
    const angle = visual.phase + orbitTime * orbit.speed
    const targetX = orbit.centerX + Math.cos(angle) * orbit.radius
    const targetZ = orbit.centerZ + Math.sin(angle) * orbit.radius
    const targetY = orbit.height + Math.sin(orbitTime * 0.8 + visual.phase) * 0.65
    const startY = TEMPLATE_BASE_Y + 1
    const x = SCENE_CENTER.x + (targetX - SCENE_CENTER.x) * progress
    const y = startY + (targetY - startY) * progress
    const z = SCENE_CENTER.z + (targetZ - SCENE_CENTER.z) * progress
    const scale = TROPHY_SCALE * (0.2 + progress * 0.8)

    const rootTransform = Transform.getMutable(visual.root)
    rootTransform.position = Vector3.create(x, y, z)
    rootTransform.scale = Vector3.create(scale, scale, scale)
    rootTransform.rotation = Quaternion.fromEulerDegrees(
      0,
      (orbitTime * 70 + visual.record.id * 31) % 360,
      0
    )

    Transform.getMutable(visual.label).position = Vector3.create(x, y + 7.2, z)
  }
}

export function clearTrophies(): void {
  for (const visual of trophies.values()) removeTrophy(visual)
  trophies.clear()
  historyInitialized = false
}


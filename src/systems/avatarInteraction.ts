import { AvatarModifierArea, engine, Entity, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { getClientSnapshot } from '../game/gameState'

const DISABLE_PASSPORTS_MODIFIER = 1
const SCENE_AREA_CENTER = Vector3.create(24, 25, 24)
const SCENE_AREA_SIZE = Vector3.create(80, 50, 80)

let modifierEntity: Entity | undefined
let passportsDisabled = false

export function setupAvatarInteraction(): void {
  if (modifierEntity !== undefined) return
  modifierEntity = engine.addEntity()
  Transform.create(modifierEntity, {
    position: SCENE_AREA_CENTER,
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
}

export function avatarInteractionSystem(): void {
  if (modifierEntity === undefined) return

  const shouldDisable = getClientSnapshot().playerStatus === 'ACTIVE'
  if (shouldDisable === passportsDisabled) return

  passportsDisabled = shouldDisable
  if (shouldDisable) {
    AvatarModifierArea.createOrReplace(modifierEntity, {
      area: SCENE_AREA_SIZE,
      excludeIds: [],
      modifiers: [DISABLE_PASSPORTS_MODIFIER]
    })
  } else if (AvatarModifierArea.has(modifierEntity)) {
    AvatarModifierArea.deleteFrom(modifierEntity)
  }
}

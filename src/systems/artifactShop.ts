import {
  ColliderLayer,
  engine,
  InputAction,
  MeshCollider,
  pointerEventsSystem,
  Transform
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { openArtifactShop, playPress } from '../ui'

const CONSOLE_HITBOX_POSITION = Vector3.create(-2.1, 1, 40)
const CONSOLE_HITBOX_SCALE = Vector3.create(5, 4, 5)

export function setupArtifactShop(): void {
  const hitbox = engine.addEntity()
  Transform.create(hitbox, {
    position: CONSOLE_HITBOX_POSITION,
    rotation: Quaternion.Identity(),
    scale: CONSOLE_HITBOX_SCALE
  })
  MeshCollider.setBox(hitbox, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown(
    {
      entity: hitbox,
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

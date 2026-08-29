import {
  ColliderLayer,
  engine,
  GltfContainer,
  InputAction,
  MeshCollider,
  pointerEventsSystem,
  Transform
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { SCENE_CENTER } from '../shared/constants'
import { openArtifactShop } from '../ui'

const CONSOLE_POSITION = Vector3.create(SCENE_CENTER.x, SCENE_CENTER.y + 0.2, SCENE_CENTER.z)
const CONSOLE_SCALE = Vector3.One()
const CONSOLE_HITBOX_POSITION = Vector3.create(-2.1, 1, 40)
const CONSOLE_HITBOX_SCALE = Vector3.create(5, 4, 5)

export function setupArtifactShop(): void {
  const shop = engine.addEntity()
  Transform.create(shop, {
    position: CONSOLE_POSITION,
    rotation: Quaternion.Identity(),
    scale: CONSOLE_SCALE
  })
  GltfContainer.create(shop, {
    src: 'assets/scene/Models/DBC/Console.glb',
    visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS,
      invisibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS
  })

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
    openArtifactShop
  )
}

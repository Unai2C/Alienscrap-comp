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
import { openArtifactShop } from '../ui'

const SHOP_POSITION = Vector3.create(24, 3, 11)

export function setupArtifactShop(): void {
  const shop = engine.addEntity()
  Transform.create(shop, {
    position: SHOP_POSITION,
    rotation: Quaternion.Identity(),
    scale: Vector3.create(0.8, 0.8, 0.8)
  })
  GltfContainer.create(shop, { src: 'assets/scene/PYRAMID_OPAQUE.glb' })
  MeshCollider.setBox(shop, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown(
    {
      entity: shop,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: 'Open artifact shop',
        maxDistance: 12
      }
    },
    openArtifactShop
  )
}

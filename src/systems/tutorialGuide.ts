import {
  ColliderLayer,
  engine,
  InputAction,
  Material,
  MeshCollider,
  MeshRenderer,
  pointerEventsSystem,
  Transform
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { openDailyTutorialGuide } from '../ui'

const GUIDE_POSITION = Vector3.create(37, 0.2, 4)

export function setupTutorialGuide(): void {
  const guide = engine.addEntity()
  Transform.create(guide, {
    position: GUIDE_POSITION,
    rotation: Quaternion.Identity(),
    scale: Vector3.create(0.8, 2.2, 0.8)
  })
  MeshRenderer.setCylinder(guide)
  MeshCollider.setBox(guide, ColliderLayer.CL_POINTER)
  Material.setPbrMaterial(guide, {
    albedoColor: { r: 0.1, g: 0.85, b: 0.9, a: 1 },
    emissiveColor: { r: 0.03, g: 0.55, b: 0.6 },
    emissiveIntensity: 0.8,
    roughness: 0.35
  })
  pointerEventsSystem.onPointerDown(
    {
      entity: guide,
      opts: { button: InputAction.IA_POINTER, hoverText: 'Talk to guide', maxDistance: 10 }
    },
    openDailyTutorialGuide
  )
}


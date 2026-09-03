import {
  ColliderLayer,
  engine,
  Entity,
  InputAction,
  Material,
  MeshCollider,
  MeshRenderer,
  pointerEventsSystem,
  TextShape,
  Transform
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import {
  openProfilePanel,
  openRankingPanel,
  openTutorialPanel,
  playPress
} from '../ui'

const FONT_MONOSPACE = 2
const TEXT_ALIGN_CENTER = 4
const PANEL_ROTATION = Quaternion.fromEulerDegrees(0, 51, 0)

interface InfoButton {
  label: string
  y: number
  action: () => void
}

const leftButtons: InfoButton[] = [
  { label: 'PROFILE', y: 0.75, action: openProfilePanel },
  { label: 'LEADERBOARDS', y: 0, action: openRankingPanel },
  { label: 'TUTORIAL', y: -0.75, action: openTutorialPanel }
]

function createText(parent: Entity, label: string, y: number): void {
  const text = engine.addEntity()
  Transform.create(text, {
    parent,
    position: Vector3.create(0, y, -0.2),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  TextShape.create(text, {
    text: label,
    font: FONT_MONOSPACE,
    fontSize: 2.4,
    fontAutoSize: false,
    textAlign: TEXT_ALIGN_CENTER,
    width: 5.2,
    height: 0.6,
    lineCount: 1,
    textWrapping: false,
    textColor: Color4.create(0.2, 1, 0.9, 1),
    outlineColor: Color3.create(0, 0, 0),
    outlineWidth: 0.18,
    shadowColor: Color3.create(0, 0, 0),
    shadowBlur: 0.2,
    shadowOffsetX: 0.05,
    shadowOffsetY: -0.05
  })
}

function createButton(parent: Entity, button: InfoButton): void {
  const entity = engine.addEntity()
  Transform.create(entity, {
    parent,
    position: Vector3.create(0, button.y, -0.1),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(4.8, 0.55, 0.045)
  })
  MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity, ColliderLayer.CL_POINTER)
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.create(0.015, 0.14, 0.17, 1),
    emissiveColor: Color4.create(0.015, 0.28, 0.32, 1),
    emissiveIntensity: 0.16,
    roughness: 0.9
  })
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: button.label,
        maxDistance: 9
      }
    },
    () => {
      playPress()
      button.action()
    }
  )
  createText(parent, button.label, button.y)
}

function createPanel(position: Vector3, buttons: InfoButton[]): void {
  const root = engine.addEntity()
  Transform.create(root, {
    position,
    rotation: PANEL_ROTATION,
    scale: Vector3.One()
  })
  const back = engine.addEntity()
  Transform.create(back, {
    parent: root,
    position: Vector3.create(0, 0, 0.035),
    rotation: Quaternion.Identity(),
    scale: Vector3.create(5.35, 2.65, 0.05)
  })
  MeshRenderer.setBox(back)
  Material.setPbrMaterial(back, {
    albedoColor: Color4.create(0.008, 0.018, 0.055, 1),
    emissiveColor: Color4.create(0.012, 0.12, 0.15, 1),
    emissiveIntensity: 0.12,
    roughness: 0.92
  })
  for (const button of buttons) createButton(root, button)
}

export function setupInfoPanels(): void {
  createPanel(Vector3.create(55, 3.5, 33), leftButtons)
}

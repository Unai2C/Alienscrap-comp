import {
  engine,
  Entity,
  Material,
  MaterialTransparencyMode,
  MeshRenderer,
  Transform
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'

const PARTICLE_COUNT = 288
const MIN_Y = 1.5
const MAX_Y = 28
const MIN_XZ = -12
const PARTICLE_AREA = 72

interface AmbientParticle {
  entity: Entity
  speed: number
  phase: number
  baseScale: number
}

const particles: AmbientParticle[] = []
let elapsed = 0

export function setupAmbientParticles(): void {
  if (particles.length > 0) return

  for (let index = 0; index < PARTICLE_COUNT; index++) {
    const entity = engine.addEntity()
    const baseScale = 0.045 + ((index * 7) % 9) * 0.025
    const x = MIN_XZ + ((index * 17) % PARTICLE_AREA)
    const z = MIN_XZ + ((index * 29) % PARTICLE_AREA)
    const y = MIN_Y + ((index * 11) % 26)
    Transform.create(entity, {
      position: Vector3.create(x, y, z),
      rotation: Quaternion.Identity(),
      scale: Vector3.create(baseScale, baseScale, baseScale)
    })
    MeshRenderer.setSphere(entity)
    const color = index % 3 === 0
      ? Color4.create(0.12, 0.9, 1, 0.95)
      : Color4.create(0.18, 0.62, 1, 0.85)
    Material.setPbrMaterial(entity, {
      albedoColor: color,
      emissiveColor: Color4.create(color.r, color.g, color.b, 1),
      emissiveIntensity: 8,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
      metallic: 0,
      roughness: 0.15
    })
    particles.push({
      entity,
      speed: 0.16 + (index % 6) * 0.045,
      phase: index * 0.91,
      baseScale
    })
  }
}

export function ambientParticleSystem(dt: number): void {
  const safeDt = Math.min(Math.max(dt, 0), 0.1)
  elapsed += safeDt

  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index]
    if (!Transform.has(particle.entity)) continue
    const transform = Transform.getMutable(particle.entity)
    let y = transform.position.y + particle.speed * safeDt
    let x = transform.position.x + Math.sin(elapsed * 0.42 + particle.phase) * 0.018
    let z = transform.position.z + Math.cos(elapsed * 0.36 + particle.phase) * 0.016
    if (y > MAX_Y) {
      y = MIN_Y
      x = MIN_XZ + ((index * 23 + Math.floor(elapsed)) % PARTICLE_AREA)
      z = MIN_XZ + ((index * 31 + Math.floor(elapsed * 0.7)) % PARTICLE_AREA)
    }
    transform.position = Vector3.create(x, y, z)
    const pulse = 0.72 + (Math.sin(elapsed * 1.2 + particle.phase) + 1) * 0.22
    const scale = particle.baseScale * pulse
    transform.scale = Vector3.create(scale, scale, scale)
  }
}

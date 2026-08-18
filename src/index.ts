import { engine } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'
import { setupAlienServer } from './server/alienServer'
import { gameStateSystem, initGameState } from './game/gameState'
import { setupEntities, reconcileScene } from './systems/interactionSetup'
import { cinematicSystem } from './systems/cinematic'
import { setupArtifactShop } from './systems/artifactShop'
import { leaderboardDisplaySystem } from './systems/leaderboardDisplay'
import { trophySystem } from './systems/trophies'
import { ambientParticleSystem, setupAmbientParticles } from './systems/ambientParticles'
import { setupTutorialGuide } from './systems/tutorialGuide'
import { avatarInteractionSystem, setupAvatarInteraction } from './systems/avatarInteraction'
import {
  setupUi,
  setupAudio,
  initShoulder,
  hudInputSystem,
  hudTickSystem,
  getSelectedPart
} from './ui'

export function main() {
  if (isServer()) {
    setupAlienServer()
    return
  }

  setupUi()
  initGameState()
  setupEntities(getSelectedPart)
  initShoulder()
  setupAudio()
  setupAvatarInteraction()
  setupArtifactShop()
  setupAmbientParticles()
  setupTutorialGuide()

  engine.addSystem(hudInputSystem, undefined, 'alien-hud-input-system')
  engine.addSystem(gameStateSystem, undefined, 'alien-game-state-system')
  engine.addSystem(avatarInteractionSystem, undefined, 'alien-avatar-interaction-system')
  engine.addSystem(reconcileScene, undefined, 'alien-scene-system')
  engine.addSystem(cinematicSystem, undefined, 'alien-cinematic-system')
  engine.addSystem(ambientParticleSystem, undefined, 'alien-ambient-particle-system')
  engine.addSystem(trophySystem, undefined, 'alien-trophy-system')
  engine.addSystem(leaderboardDisplaySystem, undefined, 'alien-leaderboard-display-system')
  engine.addSystem(hudTickSystem, undefined, 'alien-hud-tick-system')
}


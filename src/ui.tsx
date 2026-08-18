import {
  engine, Entity, Transform, GltfContainer, AudioSource, UiCanvasInformation, Material, MaterialTransparencyMode, MeshCollider, MeshRenderer,
  ColliderLayer, InputAction, inputSystem, MainCamera, PointerEventType, pointerEventsSystem, VirtualCamera
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { ReactEcsRenderer, UiEntity, Label, ReactEcs } from '@dcl/sdk/react-ecs'
import {
  PART_TYPES, PART_GLB, PART_LABEL, PART_SYMBOL, PartType,
  ARTIFACT_LABEL, ARTIFACT_PRICE_CRYSTALS, ARTIFACT_DURATION_MS, ArtifactType,
  SCENE_CENTER, PERFORMANCE_LABEL, PlacementMode, PLACEMENT_COOLDOWN_MS, RoundPhase, GLB_SCALE,
  COUNTDOWN_SECONDS, PERFORMANCE_DURATION_SECONDS, RESET_DELAY_SECONDS
} from './shared/constants'
import { getTemplate, SlotDefinition } from './shared/templates'
import { getLevelProgress, getScraperTitle } from './shared/progression'
import {
  closeLeaderboardCamera,
  openLeaderboardCamera,
  getLeaderboardModeLabel,
  isLeaderboardCameraActive,
  nextLeaderboardMode,
  previousLeaderboardMode
} from './systems/leaderboardDisplay'
import {
  getClientSnapshot,
  requestAttach,
  requestCompleteTutorial,
  requestJoinGame,
  requestLeaveGame,
  requestLeaderboards,
  requestBuyArtifact,
  requestEquipArtifact,
  requestUseArtifact
} from './game/gameState'

let selectedIndex = 0
// Persistent carried-piece entities.
let feedbackText = ''
let feedbackTimer = 0
let showOnboarding = false
let onboardingAlpha = 0
let onboardingDismissed = true
let floatTime = 0
let ambientEntity: Entity = 0 as Entity
const shoulderEntities: Entity[] = []
const SHOULDER_SCALE = 0.272
let carriedVisible = false
let cinematicCameraActive = false
let profilePanelOpen = false
let rankingPanelOpen = false
let inventoryPanelOpen = false
let activePlayersPanelOpen = false
let shopPanelOpen = false
type RankingTab = 'SESSION' | 'DAILY' | 'WEEKLY' | 'TOTAL'
const RANKING_TABS: RankingTab[] = ['SESSION', 'DAILY', 'WEEKLY', 'TOTAL']
let rankingTab: RankingTab = 'SESSION'
let lastCommunityMilestoneSeq = 0
let communityTierUpTimer = 0
let joinPromptVisible = true
let tutorialVisible = false
let tutorialStep = 0
let tutorialJoinAfter = false
let tutorialMandatory = false
let tutorialModeActive = false
let tutorialFirstRoundActive = false
let tutorialGuideActive = false
let tutorialGuideStep = 0
let tutorialGuideJoinAfter = false
let tutorialGuideQueued = false
let tutorialPieceKeyChanged = false
let tutorialPieceButtonChanged = false
let tutorialCameraEntity: Entity | null = null
let tutorialCameraUnavailable = false
let tutorialPracticePlacedMask = 0
const tutorialPracticeEntities: Entity[] = []
const TUTORIAL_ARTIFACT_TYPES: ArtifactType[] = ['NO_COOLDOWN', 'DOUBLE_PLACE', 'TRIPLE_PLACE', 'COMPLETE_TEMPLATE']
let tutorialArtifactInventoryCounts: Record<ArtifactType, number> = { NO_COOLDOWN: 10, DOUBLE_PLACE: 10, TRIPLE_PLACE: 10, COMPLETE_TEMPLATE: 10 }
let tutorialEquippedArtifacts: ArtifactType[] = []
let tutorialPracticeGuideStep = 0
let tutorialPracticeNoCooldownUntil = 0
let tutorialShownForParticipation = false
let lastPlacementCooldownAt = 0
let lastPlacementCooldownMs = 1
let lastPlacementCooldownPart: PartType = 'CUBE'
let escapeListenerReady = false
const TUTORIAL_ENABLED = true
const FEEDBACK_DURATION = 2.5

interface TutorialSlide {
  marker: string
  title: string
  description: string
}

const TUTORIAL_CORE_SLIDES: TutorialSlide[] = [
  {
    marker: 'START',
    title: 'ALIEN SCRAPYARD IN 5 HEADLINES',
    description: '1 Join from spectator. 2 Build the template before time ends. 3 E selects, F auto places, tap gives full points. 4 Earn scrap and crystals. 5 Buy artifacts and use slots 1 and 2.'
  },
  {
    marker: 'PLAY',
    title: 'YOUR ROLE CHANGES WITH THE ROUND',
    description: 'You enter as spectator. Join puts you in queue. When the next build starts, the server makes you active and only then your placements count.'
  },
  {
    marker: 'E/F',
    title: 'CHOOSE AND PLACE PIECES',
    description: 'Press E to cycle cube, cylinder and pyramid. Press F to place the selected piece automatically. Tap the real slot for more points.'
  },
  {
    marker: '+PTS',
    title: 'POINTS AND REWARDS',
    description: 'Cubes, cylinders and pyramids give different points. Correct pieces always give scrap, and completed rounds pay crystals.'
  },
  {
    marker: 'SHOP',
    title: 'INVENTORY AND ARTIFACTS',
    description: 'Open inventory to see crystals, scrap and equipped artifacts. The shop sells temporary artifacts that are consumed when used.'
  },
  {
    marker: '1/2',
    title: 'USE ARTIFACTS DURING BUILD',
    description: 'You can equip two artifacts. During active build, tap their slots or press 1 and 2 to activate them for a short time.'
  }
]

const TUTORIAL_INFO_SLIDES: TutorialSlide[] = [
  {
    marker: 'PERFECT',
    title: 'COMPLETE THE FULL TEMPLATE',
    description: 'Validate every block before time runs out to earn a Perfect Build and create an orbiting trophy with the builders names.'
  },
  {
    marker: 'MVP',
    title: 'MOST VALUABLE PLAYER',
    description: 'The player with the most points in a round earns MVP. MVP is only awarded when at least two players participate.'
  },
  {
    marker: 'LEVEL',
    title: 'LEVELS AND TITLES',
    description: 'Your total points raise your personal level. The profile panel shows how many points you need for the next level.'
  },
  {
    marker: 'RANK',
    title: 'COMPARE YOUR RESULTS',
    description: 'Session shows the current game. Daily, Weekly, Total and special rankings compare points, rounds, MVP and other stats.'
  },
  {
    marker: 'TIER',
    title: 'COMMUNITY PROGRESS',
    description: 'Every active player contributes points to the shared Scrapyard Tier. Each completed tier requires a larger collective score.'
  },
  {
    marker: 'TIPS',
    title: 'TUTORIAL MODE CAN STAY ON',
    description: 'During your first match, small tips stay visible while you play. You can turn them off, or enable them again from Profile.'
  }
]
let TUTORIAL_SLIDES: TutorialSlide[] = [...TUTORIAL_CORE_SLIDES, ...TUTORIAL_INFO_SLIDES]

type TutorialGuideAction = 'NEXT' | 'PROFILE' | 'RANKING' | 'INVENTORY' | 'ARTIFACT_1' | 'ARTIFACT_2' | 'ARTIFACT_REVIEW' | 'PIECE' | 'PIECE_BUTTONS' | 'COMPLETE'
type TutorialPieceSource = 'key' | 'button'

interface TutorialGuideStep {
  action: TutorialGuideAction
  message: string
  cameraPosition: { x: number; y: number; z: number }
  cameraRotation: { pitch: number; yaw: number; roll: number }
}

const TUTORIAL_GUIDE_STEPS: TutorialGuideStep[] = [
  {
    action: 'NEXT',
    message: 'Tutorial: Alien Scrapyard is a cooperative build game. Complete the template together before time runs out to earn points, scrap and crystals. First, let us check the main menus.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 }
  },
  {
    action: 'PROFILE',
    message: 'Tutorial: open PROFILE. It shows your level, title and long term progress. F closes menus when you are browsing UI.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 }
  },
  {
    action: 'RANKING',
    message: 'Tutorial: now open RANKING. Rankings compare points, rounds, MVP and other stats. Use E and F to move through leaderboard views.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 }
  },
  {
    action: 'INVENTORY',
    message: 'Tutorial: now open INVENTORY. This is where your crystals, scrap, objects and equipped artifacts live.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 }
  },
  {
    action: 'ARTIFACT_1',
    message: 'Tutorial: choose any object slot in your inventory to equip your first starter artifact. The order does not matter.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 }
  },
  {
    action: 'ARTIFACT_2',
    message: 'Tutorial: choose one more object slot to equip your second artifact. You can carry two active artifacts per round.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 }
  },
  {
    action: 'ARTIFACT_REVIEW',
    message: 'Good. Artifacts are special tools: during active build, press 1 or 2 to use the equipped ones. They are consumed when used and each one has its own cooldown.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 }
  },
  {
    action: 'PIECE',
    message: 'Tutorial: press E several times to cycle cube, cylinder and pyramid. E only changes the selected piece here, so try it freely, then press NEXT.',
    cameraPosition: { x: 24, y: 7.2, z: 12.8 },
    cameraRotation: { pitch: 12, yaw: 0, roll: 0 }
  },
  {
    action: 'PIECE_BUTTONS',
    message: 'Tutorial: now tap or click the piece buttons. On mobile this selector is like a direct E, and in play/practice tapping also places that piece automatically. Try it freely, then press NEXT.',
    cameraPosition: { x: 24, y: 7.2, z: 12.8 },
    cameraRotation: { pitch: 12, yaw: 0, roll: 0 }
  },
  {
    action: 'COMPLETE',
    message: 'Practice freely: E changes piece, F places the selected piece, and tapping a piece button also places that type. Press READY when you are ready to start playing.',
    cameraPosition: { x: 37, y: 4.7, z: 5.7 },
    cameraRotation: { pitch: 10, yaw: 0, roll: 0 }
  }
]
function currentTutorialGuideStep(): TutorialGuideStep | null {
  return tutorialGuideActive ? TUTORIAL_GUIDE_STEPS[Math.min(tutorialGuideStep, TUTORIAL_GUIDE_STEPS.length - 1)] : null
}

function currentTutorialAction(): TutorialGuideAction | null {
  return currentTutorialGuideStep()?.action ?? null
}

function allowTutorialAction(action: TutorialGuideAction): boolean {
  return !tutorialGuideActive || currentTutorialAction() === action
}
function tutorialPieceStepComplete(): boolean {
  return tutorialPieceKeyChanged && tutorialPieceButtonChanged
}

function markTutorialPieceAction(source: TutorialPieceSource): void {
  const step = currentTutorialGuideStep()
  if (!step) return
  if (step.action === 'PIECE' && source === 'key') tutorialPieceKeyChanged = true
  if (step.action === 'PIECE_BUTTONS' && source === 'button') tutorialPieceButtonChanged = true
}
const TUTORIAL_PRACTICE_ORIGIN = Vector3.create(59, 1.5, -2)
const TUTORIAL_PRACTICE_SLOTS: SlotDefinition[] = [
  { slotId: 'tp0', requiredPart: 'CUBE',     position: { x: TUTORIAL_PRACTICE_ORIGIN.x - 0.55, y: TUTORIAL_PRACTICE_ORIGIN.y + 1.0, z: TUTORIAL_PRACTICE_ORIGIN.z }, scale: { x: 1, y: 1, z: 1 }, label: 'Practice Base Left' },
  { slotId: 'tp1', requiredPart: 'CUBE',     position: { x: TUTORIAL_PRACTICE_ORIGIN.x + 0.55, y: TUTORIAL_PRACTICE_ORIGIN.y + 1.0, z: TUTORIAL_PRACTICE_ORIGIN.z }, scale: { x: 1, y: 1, z: 1 }, label: 'Practice Base Right' },
  { slotId: 'tp2', requiredPart: 'CYLINDER', position: { x: TUTORIAL_PRACTICE_ORIGIN.x - 0.55, y: TUTORIAL_PRACTICE_ORIGIN.y + 2.0, z: TUTORIAL_PRACTICE_ORIGIN.z }, scale: { x: 1, y: 1, z: 1 }, label: 'Practice Pillar Left' },
  { slotId: 'tp3', requiredPart: 'CYLINDER', position: { x: TUTORIAL_PRACTICE_ORIGIN.x + 0.55, y: TUTORIAL_PRACTICE_ORIGIN.y + 2.0, z: TUTORIAL_PRACTICE_ORIGIN.z }, scale: { x: 1, y: 1, z: 1 }, label: 'Practice Pillar Right' },
  { slotId: 'tp4', requiredPart: 'CUBE',     position: { x: TUTORIAL_PRACTICE_ORIGIN.x,        y: TUTORIAL_PRACTICE_ORIGIN.y + 3.0, z: TUTORIAL_PRACTICE_ORIGIN.z }, scale: { x: 1, y: 1, z: 1 }, label: 'Practice Cap' },
  { slotId: 'tp5', requiredPart: 'CONE',     position: { x: TUTORIAL_PRACTICE_ORIGIN.x,        y: TUTORIAL_PRACTICE_ORIGIN.y + 4.0, z: TUTORIAL_PRACTICE_ORIGIN.z }, scale: { x: 1, y: 1, z: 1 }, label: 'Practice Top' }
]
const tutorialPracticeRecentClicks = new Map<string, number>()

const TUTORIAL_GHOST_COLOR: Record<PartType, Color4> = {
  CUBE: Color4.create(0.1, 0.3, 1, 0.22),
  CYLINDER: Color4.create(1, 0.1, 0.1, 0.22),
  CONE: Color4.create(1, 0.85, 0, 0.22)
}

const TUTORIAL_GHOST_EMISSIVE: Record<PartType, Color4> = {
  CUBE: Color4.create(0.1, 0.3, 1, 1),
  CYLINDER: Color4.create(1, 0.1, 0.1, 1),
  CONE: Color4.create(1, 0.85, 0, 1)
}

function tutorialPracticeSlotPosition(slot: SlotDefinition): Vector3 {
  return Vector3.create(slot.position.x, slot.position.y, slot.position.z)
}

function tutorialPracticeSlotScale(slot: SlotDefinition): Vector3 {
  return Vector3.create(slot.scale.x * GLB_SCALE, slot.scale.y * GLB_SCALE, slot.scale.z * GLB_SCALE)
}

function tutorialPracticePartRotation(part: PartType): Quaternion {
  return part === 'CONE' ? Quaternion.fromEulerDegrees(180, 0, 0) : Quaternion.Identity()
}

function addTutorialPracticeEntity(): Entity {
  const entity = engine.addEntity()
  tutorialPracticeEntities.push(entity)
  return entity
}

function clearTutorialPracticeVisuals(resetMask = true): void {
  for (let index = tutorialPracticeEntities.length - 1; index >= 0; index--) {
    try { engine.removeEntity(tutorialPracticeEntities[index]) } catch (_) {}
  }
  tutorialPracticeEntities.length = 0
  tutorialPracticeRecentClicks.clear()
  if (resetMask) tutorialPracticePlacedMask = 0
}

function clearTutorialPractice(): void {
  clearTutorialPracticeVisuals(true)
}

function tutorialPracticeFlashSlot(slot: SlotDefinition, color: Color4): void {
  const entity = addTutorialPracticeEntity()
  Transform.create(entity, {
    position: tutorialPracticeSlotPosition(slot),
    scale: Vector3.scale(tutorialPracticeSlotScale(slot), 3),
    rotation: Quaternion.Identity()
  })
  MeshRenderer.setBox(entity)
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.create(color.r, color.g, color.b, 0.5),
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    emissiveColor: color,
    emissiveIntensity: 3
  })
  setTimeout(() => {
    const index = tutorialPracticeEntities.indexOf(entity)
    if (index >= 0) tutorialPracticeEntities.splice(index, 1)
    try { engine.removeEntity(entity) } catch (_) {}
  }, 500)
}

function createTutorialPracticeGhost(slot: SlotDefinition): void {
  const entity = addTutorialPracticeEntity()
  Transform.create(entity, {
    position: tutorialPracticeSlotPosition(slot),
    scale: Vector3.scale(tutorialPracticeSlotScale(slot), 2),
    rotation: tutorialPracticePartRotation(slot.requiredPart)
  })

  if (slot.requiredPart === 'CUBE') MeshRenderer.setBox(entity)
  else if (slot.requiredPart === 'CYLINDER') MeshRenderer.setCylinder(entity)
  else MeshRenderer.setCylinder(entity, 0, 0.5)

  Material.setPbrMaterial(entity, {
    albedoColor: TUTORIAL_GHOST_COLOR[slot.requiredPart],
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    emissiveColor: TUTORIAL_GHOST_EMISSIVE[slot.requiredPart],
    emissiveIntensity: 1.2
  })
}

function createTutorialPracticeHitbox(slot: SlotDefinition): void {
  const entity = addTutorialPracticeEntity()
  Transform.create(entity, {
    position: tutorialPracticeSlotPosition(slot),
    scale: Vector3.scale(tutorialPracticeSlotScale(slot), 2),
    rotation: tutorialPracticePartRotation(slot.requiredPart)
  })
  MeshCollider.setBox(entity, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: { button: InputAction.IA_POINTER, hoverText: 'Practice place', maxDistance: 8 }
    },
    () => tutorialPracticeTrySlot(slot)
  )
}

function createTutorialPracticeSolid(slot: SlotDefinition): void {
  const entity = addTutorialPracticeEntity()
  Transform.create(entity, {
    position: tutorialPracticeSlotPosition(slot),
    scale: tutorialPracticeSlotScale(slot),
    rotation: tutorialPracticePartRotation(slot.requiredPart)
  })
  GltfContainer.create(entity, {
    src: PART_GLB[slot.requiredPart],
    visibleMeshesCollisionMask: 0,
    invisibleMeshesCollisionMask: 0
  })
}

function renderTutorialPractice(): void {
  clearTutorialPracticeVisuals(false)
  for (let index = 0; index < TUTORIAL_PRACTICE_SLOTS.length; index++) {
    const slot = TUTORIAL_PRACTICE_SLOTS[index]
    const occupied = ((tutorialPracticePlacedMask >> index) & 1) === 1
    if (occupied) {
      createTutorialPracticeSolid(slot)
    } else {
      createTutorialPracticeGhost(slot)
      createTutorialPracticeHitbox(slot)
    }
  }
}

function setupTutorialPractice(): void {
  if (tutorialPracticeEntities.length > 0) return
  renderTutorialPractice()
}

function movePlayerToPractice(): void {
  void movePlayerTo({
    newRelativePosition: { x: 50, y: 1.5, z: -6 }
  }).catch((error) => console.log(`[TUTORIAL] practice move failed: ${error}`))
}

function resetTutorialPracticeIfFull(): void {
  const fullMask = (1 << TUTORIAL_PRACTICE_SLOTS.length) - 1
  if (tutorialPracticePlacedMask !== fullMask) return
  showFeedback('Practice template complete - restarting')
  setTimeout(() => {
    if (!tutorialGuideActive || currentTutorialAction() !== 'COMPLETE') return
    tutorialPracticePlacedMask = 0
    renderTutorialPractice()
  }, 650)
}

function advanceTutorialPracticeGuide(action: 'MANUAL' | 'F' | 'ARTIFACT_1' | 'ARTIFACT_2'): void {
  if (!tutorialGuideActive || currentTutorialAction() !== 'COMPLETE') return
  if (tutorialPracticeGuideStep === 0 && action === 'MANUAL') tutorialPracticeGuideStep = 1
  else if (tutorialPracticeGuideStep === 1 && action === 'F') tutorialPracticeGuideStep = 2
  else if (tutorialPracticeGuideStep === 2 && action === 'ARTIFACT_1') tutorialPracticeGuideStep = 3
  else if (tutorialPracticeGuideStep === 3 && action === 'ARTIFACT_2') tutorialPracticeGuideStep = 4
}

function tutorialPracticeCommitSlot(slotIndex: number, mode: PlacementMode): void {
  const slot = TUTORIAL_PRACTICE_SLOTS[slotIndex]
  if (!slot || ((tutorialPracticePlacedMask >> slotIndex) & 1) === 1) return
  tutorialPracticePlacedMask |= 1 << slotIndex
  tutorialPracticeFlashSlot(slot, Color4.create(1, 1, 0.5, 1))
  playSuccess()
  startPlacementCooldown(slot.requiredPart, mode)
  renderTutorialPractice()
  resetTutorialPracticeIfFull()
}

function tutorialPracticeTrySlot(slot: SlotDefinition): void {
  if (!tutorialGuideActive || currentTutorialAction() !== 'COMPLETE') return
  const slotIndex = TUTORIAL_PRACTICE_SLOTS.findIndex((item) => item.slotId === slot.slotId)
  if (slotIndex < 0) return
  if (((tutorialPracticePlacedMask >> slotIndex) & 1) === 1) return

  const now = Date.now()
  const lastClick = tutorialPracticeRecentClicks.get(slot.slotId) ?? 0
  if (now - lastClick < PLACEMENT_COOLDOWN_MS.manual[slot.requiredPart]) return

  const selectedPart = getSelectedPart()
  if (selectedPart !== slot.requiredPart) {
    tutorialPracticeFlashSlot(slot, Color4.create(1, 0.1, 0.1, 1))
    onWrongPart(slot.requiredPart)
    return
  }

  tutorialPracticeRecentClicks.set(slot.slotId, now)
  tutorialPracticeCommitSlot(slotIndex, 'manual')
  advanceTutorialPracticeGuide('MANUAL')
}

function tutorialPracticePlacePart(part: PartType, mode: PlacementMode): boolean {
  const slotIndex = TUTORIAL_PRACTICE_SLOTS.findIndex((item, index) => {
    const occupied = ((tutorialPracticePlacedMask >> index) & 1) === 1
    return !occupied && item.requiredPart === part
  })
  if (slotIndex < 0) return false
  tutorialPracticeCommitSlot(slotIndex, mode)
  return true
}

function tutorialPracticePlaceSelectedPart(): void {
  if (!tutorialGuideActive || currentTutorialAction() !== 'COMPLETE') return
  setupTutorialPractice()
  const selectedPart = getSelectedPart()
  const now = Date.now()
  const noCooldownActive = now < tutorialPracticeNoCooldownUntil
  if (!noCooldownActive && now - lastPlacementCooldownAt < lastPlacementCooldownMs) return

  if (!tutorialPracticePlacePart(selectedPart, 'auto')) {
    showFeedback(`No practice ${PART_LABEL[selectedPart]} slots left`)
    playWrong()
    return
  }
  advanceTutorialPracticeGuide('F')
}

function useTutorialPracticeArtifact(slotIndex: number): void {
  if (!tutorialGuideActive || currentTutorialAction() !== 'COMPLETE') return
  const artifact = tutorialEquippedArtifacts[slotIndex]
  if (!artifact) {
    showFeedback('Equip an artifact first')
    return
  }

  if (artifact === 'NO_COOLDOWN') {
    tutorialPracticeNoCooldownUntil = Date.now() + ARTIFACT_DURATION_MS
    showFeedback('No cooldown active')
  } else if (artifact === 'DOUBLE_PLACE') {
    const selectedPart = getSelectedPart()
    tutorialPracticePlacePart(selectedPart, 'auto')
    tutorialPracticePlacePart(selectedPart, 'auto')
    showFeedback('Double place used')
  } else if (artifact === 'TRIPLE_PLACE') {
    tutorialPracticePlacePart('CUBE', 'auto')
    tutorialPracticePlacePart('CYLINDER', 'auto')
    tutorialPracticePlacePart('CONE', 'auto')
    showFeedback('Triple place used')
  } else if (artifact === 'COMPLETE_TEMPLATE') {
    for (let index = 0; index < TUTORIAL_PRACTICE_SLOTS.length; index++) {
      tutorialPracticeCommitSlot(index, 'auto')
    }
    showFeedback('Template completed')
  }

  advanceTutorialPracticeGuide(slotIndex === 0 ? 'ARTIFACT_1' : 'ARTIFACT_2')
}
function tutorialCamera(): Entity | null {
  if (tutorialCameraEntity !== null || tutorialCameraUnavailable) return tutorialCameraEntity
  try {
    tutorialCameraEntity = engine.addEntity()
    Transform.create(tutorialCameraEntity, {
      position: Vector3.create(24, 3.2, 7.2),
      rotation: Quaternion.fromEulerDegrees(8, 0, 0)
    })
    VirtualCamera.create(tutorialCameraEntity, {
      defaultTransition: { transitionMode: VirtualCamera.Transition.Time(0.45) }
    })
  } catch (error) {
    tutorialCameraUnavailable = true
    console.log(`[TUTORIAL] camera unavailable: ${error}`)
  }
  return tutorialCameraEntity
}

function updateTutorialCamera(): void {
  const step = currentTutorialGuideStep()
  if (step?.action === 'PIECE' || step?.action === 'PIECE_BUTTONS' || step?.action === 'COMPLETE') {
    profilePanelOpen = false
    rankingPanelOpen = false
    inventoryPanelOpen = false
    activePlayersPanelOpen = false
    shopPanelOpen = false
  }
  closeLeaderboardCamera()
  setCarriedVisible(step?.action === 'PIECE' || step?.action === 'PIECE_BUTTONS' || step?.action === 'COMPLETE')
  if (step?.action === 'PIECE' || step?.action === 'PIECE_BUTTONS') movePlayerToStart()
  if (step?.action === 'COMPLETE') {
    tutorialPracticeGuideStep = 0
    tutorialPracticeNoCooldownUntil = 0
    clearTutorialPractice()
    if (tutorialEquippedArtifacts.length < 2) tutorialEquippedArtifacts = ['TRIPLE_PLACE', 'COMPLETE_TEMPLATE']
    movePlayerToPractice()
    setupTutorialPractice()
    releaseTutorialCamera()
    return
  }

  const camera = tutorialCamera()
  if (!step || camera === null) return
  try {
    const transform = Transform.getMutable(camera)
    transform.position = Vector3.create(step.cameraPosition.x, step.cameraPosition.y, step.cameraPosition.z)
    transform.rotation = Quaternion.fromEulerDegrees(step.cameraRotation.pitch, step.cameraRotation.yaw, step.cameraRotation.roll)
    MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: camera })
  } catch (error) {
    tutorialCameraUnavailable = true
    console.log(`[TUTORIAL] camera activation failed: ${error}`)
  }
}
function releaseTutorialCamera(): void {
  try { MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: undefined }) } catch (_) {}
}

function startTutorialGuide(joinAfter: boolean): void {
  if (!TUTORIAL_ENABLED) return
  tutorialVisible = false
  tutorialMandatory = false
  joinPromptVisible = false
  tutorialGuideActive = true
  tutorialGuideStep = 0
  tutorialGuideJoinAfter = joinAfter
  tutorialGuideQueued = false
  tutorialPieceKeyChanged = false
  tutorialPieceButtonChanged = false
  tutorialPracticeGuideStep = 0
  tutorialPracticeNoCooldownUntil = 0
  tutorialEquippedArtifacts = []
  tutorialArtifactInventoryCounts = { NO_COOLDOWN: 10, DOUBLE_PLACE: 10, TRIPLE_PLACE: 10, COMPLETE_TEMPLATE: 10 }
  profilePanelOpen = false
  rankingPanelOpen = false
  inventoryPanelOpen = false
  activePlayersPanelOpen = false
  shopPanelOpen = false
  updateTutorialCamera()
}

function finishTutorialGuide(joinGameNow = false): void {
  const shouldJoin = joinGameNow || tutorialGuideJoinAfter
  tutorialGuideActive = false
  tutorialGuideStep = 0
  tutorialGuideJoinAfter = false
  tutorialGuideQueued = false
  tutorialPieceKeyChanged = false
  tutorialPieceButtonChanged = false
  releaseTutorialCamera()
  tutorialPracticeGuideStep = 0
  tutorialPracticeNoCooldownUntil = 0
  tutorialEquippedArtifacts = []
  setCarriedVisible(false)
  clearTutorialPractice()
  closeGameUi()
  if (shouldJoin) movePlayerToStart()
  requestCompleteTutorial(shouldJoin)
}

function advanceTutorialGuide(): void {
  if (!TUTORIAL_ENABLED || !tutorialGuideActive) return
  tutorialGuideStep = Math.min(tutorialGuideStep + 1, TUTORIAL_GUIDE_STEPS.length - 1)
  tutorialPieceKeyChanged = false
  tutorialPieceButtonChanged = false
  updateTutorialCamera()
}

function completeTutorialGuideAction(action: TutorialGuideAction): void {
  if (!TUTORIAL_ENABLED || !tutorialGuideActive) return
  const step = currentTutorialGuideStep()
  if (!step || step.action !== action) return
  if (action === 'COMPLETE') finishTutorialGuide(true)
  else advanceTutorialGuide()
}

function stepRankingTab(direction: -1 | 1): void {
  const currentIndex = RANKING_TABS.indexOf(rankingTab)
  rankingTab = RANKING_TABS[(currentIndex + direction + RANKING_TABS.length) % RANKING_TABS.length]
  if (rankingTab !== 'SESSION') requestLeaderboards()
}

function openTutorial(_joinAfter: boolean, _mandatory = false): void {
  if (!TUTORIAL_ENABLED) {
    showFeedback('Tutorial temporarily disabled')
    return
  }
}

function finishTutorial(): void {
  tutorialVisible = false
}

function advanceTutorial(): void {
  if (tutorialStep < TUTORIAL_SLIDES.length - 1) {
    tutorialStep += 1
    return
  }
  finishTutorial()
}
function closeGameUi(): void {
  if (tutorialGuideActive) return
  profilePanelOpen = false
  rankingPanelOpen = false
  inventoryPanelOpen = false
  activePlayersPanelOpen = false
  shopPanelOpen = false
  joinPromptVisible = false
  if (!tutorialMandatory) tutorialVisible = false
}

function setupEscapeClose(): void {
  if (escapeListenerReady) return
  escapeListenerReady = true
  const runtime = globalThis as typeof globalThis & {
    addEventListener?: (type: string, listener: (event: { key?: string; code?: string }) => void) => void
  }
  runtime.addEventListener?.('keydown', (event) => {
    if (event.key === 'Escape' || event.code === 'Escape') closeGameUi()
  })
}

function movePlayerToStart(): void {
  void movePlayerTo({
    newRelativePosition: { x: 24, y: 5, z: 18 },
    cameraTarget: { x: SCENE_CENTER.x, y: 2.2, z: SCENE_CENTER.z }
  }).catch((error) => console.log(`[TUTORIAL] start move failed: ${error}`))
}

function needsDailyTutorial(): boolean {
  const snapshot = getClientSnapshot()
  return snapshot.profileLoaded && !snapshot.tutorialCompleted
}

export function openDailyTutorialGuide(): void {
  const snapshot = getClientSnapshot()
  if (!snapshot.profileLoaded) return
  startTutorialGuide(true)
}

export function openArtifactShop(): void {
  const snapshot = getClientSnapshot()
  if (snapshot.phase === 'BUILD' && snapshot.playerStatus === 'ACTIVE') {
    showFeedback('Shop locked during active build')
    return
  }
  if (tutorialGuideActive) return
  shopPanelOpen = true
  inventoryPanelOpen = false
  profilePanelOpen = false
  rankingPanelOpen = false
  activePlayersPanelOpen = false
}

export function getSelectedPart(): PartType {
  return PART_TYPES[selectedIndex]
}

export function showFeedback(text: string): void {
  feedbackText = text
  feedbackTimer = FEEDBACK_DURATION
}

export function onWrongPart(required: PartType): void {
  showFeedback(`Wrong piece - need ${PART_LABEL[required]}`)
  playWrong()
}

export function dismissOnboarding(): void {
  if (!onboardingDismissed) onboardingDismissed = true
}

function selectPart(index: number, autoPlace = false, source: TutorialPieceSource = 'button'): void {
  if (index < 0 || index >= PART_TYPES.length) return
  if (tutorialGuideActive) {
    const action = currentTutorialAction()
    if (action === 'PIECE' && source !== 'key') return
    if (action === 'PIECE_BUTTONS' && source !== 'button') return
    if (action !== 'PIECE' && action !== 'PIECE_BUTTONS' && action !== 'COMPLETE') return
  }
  selectedIndex = index
  markTutorialPieceAction(source)
  applyShoulderVisibility()
  playPress()
  if (tutorialGuideActive && currentTutorialAction() === 'COMPLETE' && source === 'button') {
    tutorialPracticePlaceSelectedPart()
  }
  dismissOnboarding()
  if (autoPlace && !tutorialGuideActive) autoPlaceSelectedPart()
}

function autoPlaceSelectedPart(): void {
  const snapshot = getClientSnapshot()
  if (!snapshot.resolved || snapshot.isStale) {
    showFeedback('Syncing...')
    return
  }
  if (snapshot.phase !== 'BUILD' || snapshot.playerStatus !== 'ACTIVE') return

  const selectedPart = getSelectedPart()
  const now = Date.now()
  const noCooldownActive = now < snapshot.noCooldownUntil
  if (!noCooldownActive && now - lastPlacementCooldownAt < lastPlacementCooldownMs) return

  const slots = getTemplate(snapshot.templateId)
  const slot = slots?.find((item, index) => {
    const occupied = ((snapshot.occupiedMask >> index) & 1) === 1
    return !occupied && item.requiredPart === selectedPart
  })

  if (!noCooldownActive) startPlacementCooldown(selectedPart, 'auto')
  if (!slot) {
    showFeedback(`No ${PART_LABEL[selectedPart]} slots left`)
    playWrong()
    return
  }

  playSuccess()
  requestAttach(slot.slotId, selectedPart, 'auto')
}

export function startPlacementCooldown(part: PartType, mode: PlacementMode): void {
  lastPlacementCooldownPart = part
  lastPlacementCooldownMs = PLACEMENT_COOLDOWN_MS[mode][part]
  lastPlacementCooldownAt = Date.now()
}

export function setCinematicCameraActive(active: boolean): void {
  cinematicCameraActive = active
}

function cinematicSecondsLeft(phase: RoundPhase, secondsLeftInPhase: number): number {
  if (phase === 'COUNTDOWN') return secondsLeftInPhase + PERFORMANCE_DURATION_SECONDS + RESET_DELAY_SECONDS
  if (phase === 'PERFORM') return secondsLeftInPhase + RESET_DELAY_SECONDS
  if (phase === 'RESET') return secondsLeftInPhase
  return 0
}

const SFX_VOICES = 3
const successVoices: Entity[] = []
const pressVoices: Entity[] = []
const wrongVoices: Entity[] = []
let successCursor = 0
let pressCursor = 0
let wrongCursor = 0

function createVoiceEntity(): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent: engine.PlayerEntity, position: Vector3.Zero() })
  return e
}

function playVoice(voices: Entity[], cursor: number, url: string, volume: number): number {
  if (voices.length === 0) return cursor
  try {
    AudioSource.createOrReplace(voices[cursor], { audioClipUrl: url, playing: true, loop: false, volume })
  } catch (_) {}
  return (cursor + 1) % voices.length
}

export function playSuccess(): void {
  successCursor = playVoice(successVoices, successCursor, 'assets/sounds/success.mp3', 0.75)
}

export function playWrong(): void {
  wrongCursor = playVoice(wrongVoices, wrongCursor, 'assets/sounds/wrong.mp3', 0.75)
}

function playPress(): void {
  pressCursor = playVoice(pressVoices, pressCursor, 'assets/sounds/pressE.mp3', 1.0)
}

function initAudio(): void {
  if (ambientEntity !== (0 as Entity)) return
  for (let i = 0; i < SFX_VOICES; i++) {
    successVoices.push(createVoiceEntity())
    pressVoices.push(createVoiceEntity())
    wrongVoices.push(createVoiceEntity())
  }
  ambientEntity = 0 as Entity
}

export function initShoulder(): void {
  if (shoulderEntities.length > 0) return

  for (let i = 0; i < PART_TYPES.length; i++) {
    const entity = engine.addEntity()
    const show = carriedVisible && i === selectedIndex
    Transform.create(entity, {
      position: Vector3.create(0.5, 1.5, -0.5),
      scale: show
        ? Vector3.create(SHOULDER_SCALE, SHOULDER_SCALE, SHOULDER_SCALE)
        : Vector3.Zero(),
      rotation: Quaternion.Identity(),
      parent: engine.PlayerEntity
    })
    GltfContainer.create(entity, {
      src: PART_GLB[PART_TYPES[i]],
      visibleMeshesCollisionMask: 0,
      invisibleMeshesCollisionMask: 0
    })
    shoulderEntities.push(entity)
  }
}

function applyShoulderVisibility(): void {
  for (let i = 0; i < shoulderEntities.length; i++) {
    const show = carriedVisible && i === selectedIndex
    try {
      Transform.getMutable(shoulderEntities[i]).scale = show
        ? Vector3.create(SHOULDER_SCALE, SHOULDER_SCALE, SHOULDER_SCALE)
        : Vector3.Zero()
    } catch (_) {}
  }
}

export function setCarriedVisible(visible: boolean): void {
  carriedVisible = visible
  applyShoulderVisibility()
}

function joinGame(): void {
  const snapshot = getClientSnapshot()
  if (!snapshot.profileLoaded) return
  if (needsDailyTutorial()) {
    showFeedback('Talk to the guide first')
    return
  }
  tutorialShownForParticipation = true
  joinPromptVisible = false
  requestJoinGame()
}

function leaveGame(): void {
  joinPromptVisible = false
  profilePanelOpen = false
  rankingPanelOpen = false
  inventoryPanelOpen = false
  activePlayersPanelOpen = false
  requestLeaveGame()
}

export function hudInputSystem(_dt: number): void {
  const snapshot = getClientSnapshot()

  const primaryPressed = inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)
  const secondaryPressed = inputSystem.isTriggered(InputAction.IA_SECONDARY, PointerEventType.PET_DOWN)
  const menuOpen = profilePanelOpen || rankingPanelOpen || inventoryPanelOpen || activePlayersPanelOpen || shopPanelOpen || tutorialVisible ||
    (snapshot.playerStatus === 'SPECTATOR' && joinPromptVisible)

  if (snapshot.playerStatus === 'SPECTATOR' && needsDailyTutorial() && secondaryPressed) {
    requestCompleteTutorial(false)
    joinPromptVisible = true
    return
  }

  if (tutorialGuideActive) {
    const step = currentTutorialGuideStep()
    if (step?.action === 'COMPLETE') {
      if (primaryPressed) selectPart((selectedIndex + 1) % PART_TYPES.length, false, 'key')
      if (secondaryPressed) tutorialPracticePlaceSelectedPart()
      return
    }
    if (primaryPressed && step?.action === 'NEXT') completeTutorialGuideAction('NEXT')
    else if (primaryPressed && step?.action === 'ARTIFACT_REVIEW') completeTutorialGuideAction('ARTIFACT_REVIEW')
    else if (primaryPressed && step?.action === 'PIECE') selectPart((selectedIndex + 1) % PART_TYPES.length, false, 'key')
    return
  }

  if (isLeaderboardCameraActive()) return

  if (secondaryPressed && menuOpen) {
    closeGameUi()
    return
  }

  if (tutorialVisible) {
    if (primaryPressed) advanceTutorial()
    return
  }

  if (snapshot.playerStatus === 'SPECTATOR') {
    if (primaryPressed && joinPromptVisible && !tutorialVisible) joinGame()
    return
  }

  if (snapshot.phase !== 'BUILD' || snapshot.playerStatus !== 'ACTIVE') return
  if (inputSystem.isTriggered(InputAction.IA_ACTION_3, PointerEventType.PET_DOWN)) requestUseArtifact(0)
  if (inputSystem.isTriggered(InputAction.IA_ACTION_4, PointerEventType.PET_DOWN)) requestUseArtifact(1)
  if (primaryPressed) selectPart((selectedIndex + 1) % PART_TYPES.length)
  if (secondaryPressed) autoPlaceSelectedPart()
}
// Per-frame ticks
let lastHudPhase: RoundPhase = 'IDLE'
let lastHudPlayerStatus = 'SPECTATOR'
let blueFlashAlpha = 0
let blueFlashFired = false

export function hudTickSystem(dt: number): void {
  // Clear build hints on phase changes.
  const snap = getClientSnapshot()
  const phase = snap.phase
  const prevPhase = lastHudPhase
  if (phase !== lastHudPhase) {
    lastHudPhase = phase
    feedbackText = ''
    feedbackTimer = 0
    if (phase === 'BUILD_COMPLETE') {
      profilePanelOpen = false
      rankingPanelOpen = false
      inventoryPanelOpen = false
      activePlayersPanelOpen = false
    }
  }
  if (snap.playerStatus !== lastHudPlayerStatus) {
    lastHudPlayerStatus = snap.playerStatus
    if (snap.playerStatus === 'SPECTATOR') {
      tutorialShownForParticipation = false
    } else if (snap.playerStatus === 'QUEUED' && !tutorialShownForParticipation) {
      tutorialShownForParticipation = true
    }
    if (!cinematicCameraActive) {
      setCarriedVisible(phase === 'BUILD' && snap.playerStatus === 'ACTIVE')
    }
  }

  if (feedbackTimer > 0) {
    feedbackTimer = Math.max(0, feedbackTimer - dt)
    if (feedbackTimer <= 0) feedbackText = ''
  }
  if (snap.communityMilestoneSeq !== lastCommunityMilestoneSeq) {
    if (snap.communityMilestoneSeq > lastCommunityMilestoneSeq) communityTierUpTimer = 3
    lastCommunityMilestoneSeq = snap.communityMilestoneSeq
  }
  if (communityTierUpTimer > 0) communityTierUpTimer = Math.max(0, communityTierUpTimer - dt)
  if (onboardingDismissed && onboardingAlpha > 0) {
    onboardingAlpha = Math.max(0, onboardingAlpha - dt * 1.8)
    if (onboardingAlpha <= 0) showOnboarding = false
  }

  // Round effects only apply to active players.
  if (snap.playerStatus === 'ACTIVE') {
    if (phase === 'COUNTDOWN' && prevPhase !== 'COUNTDOWN') {
      blueFlashFired = false
    }
    if (!blueFlashFired && phase === 'RESET' && snap.secondsLeft <= 1) {
      blueFlashFired = true
      blueFlashAlpha = 1.0
    }
    if (phase === 'BUILD' && prevPhase !== 'BUILD') {
      blueFlashAlpha = 1.0
    }
  } else {
    blueFlashAlpha = 0
    blueFlashFired = false
  }
  if (blueFlashAlpha > 0) {
    blueFlashAlpha = Math.max(0, blueFlashAlpha - dt * 16)
  }

  floatTime += dt
  const shoulderY = 1.5 + Math.sin(floatTime * 2.5) * 0.06
  for (const entity of shoulderEntities) {
    try {
      Transform.getMutable(entity).position = Vector3.create(0.5, shoulderY, -0.5)
    } catch (_) {}
  }
}

// UI
const PART_UI_COLOR: Record<PartType, { r: number; g: number; b: number; a: number }> = {
  CUBE:     { r: 0.2, g: 0.5, b: 1,    a: 1 },
  CYLINDER: { r: 1,   g: 0.2, b: 0.2,  a: 1 },
  CONE:     { r: 1,   g: 0.85, b: 0,   a: 1 }
}

const INVENTORY_OBJECT_SLOTS = Array.from({ length: 9 }, (_, index) => ({ id: `object-slot-${index}`, index }))

const EQUIPPED_ARTIFACT_SLOTS = [
  { id: 'artifact-slot-1', label: '1', index: 0 },
  { id: 'artifact-slot-2', label: '2', index: 1 }
]

const ARTIFACT_SHOP_ITEMS: ArtifactType[] = TUTORIAL_ARTIFACT_TYPES

function artifactShortLabel(artifact: ArtifactType | undefined): string {
  if (!artifact) return 'EMPTY'
  if (artifact === 'NO_COOLDOWN') return 'NO CD'
  if (artifact === 'DOUBLE_PLACE') return 'DOUBLE'
  if (artifact === 'TRIPLE_PLACE') return 'TRIPLE'
  return 'FULL'
}

function artifactDescription(artifact: ArtifactType): string {
  if (artifact === 'NO_COOLDOWN') return '5s without placement cooldown'
  if (artifact === 'DOUBLE_PLACE') return '5s places a second matching block'
  if (artifact === 'TRIPLE_PLACE') return 'Places 3 pieces: cube, cylinder and pyramid'
  return 'Completes the current template instantly'
}

function countArtifacts(list: ArtifactType[], type: ArtifactType): number {
  return list.filter((item) => item === type).length
}

function firstArtifactIndex(list: ArtifactType[], type: ArtifactType): number {
  return list.findIndex((item) => item === type)
}

function tutorialArtifactCount(type: ArtifactType): number {
  return tutorialArtifactInventoryCounts[type] ?? 0
}

function visibleInventoryArtifact(index: number, inventory: ArtifactType[]): ArtifactType | undefined {
  return TUTORIAL_ARTIFACT_TYPES[index]
}

function visibleEquippedArtifacts(snap: ReturnType<typeof getClientSnapshot>, tutorialCompleteVisible: boolean): ArtifactType[] {
  return tutorialCompleteVisible ? tutorialEquippedArtifacts : snap.equippedArtifacts
}

function bitCount(mask: number): number {
  let count = 0
  let value = mask
  while (value > 0) {
    count += value & 1
    value >>= 1
  }
  return count
}

function tutorialPracticeMessage(): string {
  if (tutorialPracticeGuideStep === 0) return 'Practice: first tap/click a matching floating slot for full points. Manual placement gives the best score.'
  if (tutorialPracticeGuideStep === 1) return 'Practice: now press F. F auto-places the selected piece, easier on mobile but worth fewer points.'
  if (tutorialPracticeGuideStep === 2) return 'Practice: use artifact slot 1. Tap it on screen or press 1 to activate the equipped artifact.'
  if (tutorialPracticeGuideStep === 3) return 'Practice: use artifact slot 2. Artifacts are consumed when used, so choose the right moment in real rounds.'
  return 'Practice complete. Keep testing E, F, piece buttons and artifacts, or press READY to enter the game queue.'
}

function phaseLabel(phase: RoundPhase, snap: ReturnType<typeof getClientSnapshot>): string {
  switch (phase) {
    case 'BUILD':          return `BUILD THE ${snap.templateId} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ${snap.secondsLeft}s`
    case 'BUILD_COMPLETE': return snap.performanceType === 'PERFECT' ? PERFORMANCE_LABEL.PERFECT : PERFORMANCE_LABEL.FAIL
    case 'COUNTDOWN':      return `GET READY... ${snap.secondsLeft}`
    case 'PERFORM':        return snap.performanceType === 'PERFECT' ? PERFORMANCE_LABEL.PERFECT : PERFORMANCE_LABEL.FAIL
    case 'RESET':          return 'NEXT ROUND...'
    default:               return 'WAITING...'
  }
}

export function setupUi(): void {
  setupEscapeClose()
  applyHudRenderer()
}

export function setupAudio(): void {
  try { initAudio() } catch (_) {}
}

function applyHudRenderer(): void {
  ReactEcsRenderer.setUiRenderer(() => {
    const snap = getClientSnapshot()
    const phase = snap.phase
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    const compactUi = canvasInfo !== null && (
      canvasInfo.width < 1500 ||
      canvasInfo.height < 850 ||
      canvasInfo.devicePixelRatio >= 1.75
    )
    const font = (size: number): number => compactUi ? Math.round(size * 1.65) : size
    const blockPanelFont = (size: number): number => compactUi ? Math.round(size * 1.485) : size
    const isPlaying = snap.playerStatus === 'ACTIVE'
    const isQueued = snap.playerStatus === 'QUEUED'
    const isCinematicViewer = isPlaying || isQueued
    const inBuild = phase === 'BUILD' && isPlaying && !snap.isStale
    const inCinematic = cinematicCameraActive && !snap.isStale
    const inLeaderboardView = isLeaderboardCameraActive()
    const syncing = !snap.resolved || snap.isStale

    const partsRequired = Math.max(1, snap.partsRequired)
    const pct = Math.round(((tutorialGuideActive && currentTutorialAction() === 'COMPLETE' ? bitCount(tutorialPracticePlacedMask) : snap.partsAttached) / (tutorialGuideActive && currentTutorialAction() === 'COMPLETE' ? TUTORIAL_PRACTICE_SLOTS.length : partsRequired)) * 100)
    const isUrgent = inBuild && snap.secondsLeft <= 10
    const label = syncing
      ? 'Syncing with server...'
      : phaseLabel(phase, snap)
    const isSpectator = snap.playerStatus === 'SPECTATOR'
    const showInformationPanels = isPlaying
      ? !inCinematic && phase !== 'BUILD_COMPLETE'
      : !inCinematic
    const dailyTutorialNeeded = isSpectator && needsDailyTutorial()
    const participationLabel = isSpectator ? 'JOIN GAME' : isQueued ? 'LEAVE QUEUE' : 'LEAVE GAME'
    const roster = snap.players
    const rosterHeaderHeight = compactUi ? 68 : 52
    const rosterRowHeight = compactUi ? 48 : 30
    const rosterHeight = rosterHeaderHeight + Math.max(1, roster.length) * rosterRowHeight
    const cinematicBarWidth = compactUi ? 1400 : 1200
    const levelProgress = getLevelProgress(snap.totalXp)
    const profileProgressionLabel = `LEVEL: ${levelProgress.level}   |   CRYSTALS: ${snap.crystals}`
    const excellence = snap.roundsPlayed > 0 ? Math.round(snap.totalXp / snap.roundsPlayed) : 0
    const dominance = snap.roundsPlayed > 0 ? Math.round((snap.mvpAwards / snap.roundsPlayed) * 100) : 0
    const crystalsLabel = `CRYSTALS: ${snap.crystals}`
    const scraperTitle = getScraperTitle(snap.level)
    const persistentRows = rankingTab === 'DAILY'
      ? snap.leaderboards.daily
      : rankingTab === 'WEEKLY'
        ? snap.leaderboards.weekly
        : snap.leaderboards.total
    const rankingRows = rankingTab === 'SESSION'
      ? roster.map((player) => ({
        name: player.name,
        points: player.sessionPoints,
        level: player.level,
        rounds: player.rounds,
        mvps: player.mvps
      }))
      : persistentRows
    const rankingNameWidth = compactUi ? 260 : 210
    const rankingLevelWidth = compactUi ? 100 : 80
    const rankingRoundsWidth = compactUi ? 130 : 110
    const rankingMvpWidth = compactUi ? 146 : 110
    const rankingPointsWidth = compactUi ? 180 : 140
    const communityRequired = Math.max(1, snap.communityRequiredPoints)
    const communityPct = Math.min(100, Math.round((snap.communityPoints / communityRequired) * 100))
    const communityLabel = communityTierUpTimer > 0
      ? `COMMUNITY PROGRESS   |   SCRAPYARD TIER: ${snap.communityTier} REACHED!`
      : `COMMUNITY PROGRESS   |   SCRAPYARD TIER: ${snap.communityTier}   |   PTS: ${snap.communityPoints} / ${communityRequired}`
    const tutorialSlide = TUTORIAL_SLIDES[tutorialStep]
    const selectedPart = PART_TYPES[selectedIndex]
    const guideStep = currentTutorialGuideStep()
    const tutorialCompleteVisible = tutorialGuideActive && guideStep?.action === 'COMPLETE'
    const tutorialReadyAvailable = !tutorialCompleteVisible || tutorialPracticeGuideStep >= 4
    const displayedEquippedArtifacts = visibleEquippedArtifacts(snap, tutorialCompleteVisible)
    const displayedPartsAttached = tutorialCompleteVisible ? bitCount(tutorialPracticePlacedMask) : snap.partsAttached
    const displayedPartsRequired = tutorialCompleteVisible ? TUTORIAL_PRACTICE_SLOTS.length : snap.partsRequired
    const tutorialTipVisible = (tutorialGuideActive || tutorialModeActive || dailyTutorialNeeded) && !tutorialCompleteVisible && !tutorialVisible && !inCinematic
    const guideAdvanceAvailable = guideStep !== null && (guideStep.action === 'NEXT' || guideStep.action === 'ARTIFACT_REVIEW' || (guideStep.action === 'PIECE' && tutorialPieceKeyChanged) || (guideStep.action === 'PIECE_BUTTONS' && tutorialPieceButtonChanged))
    const tutorialTip = tutorialGuideActive && guideStep !== null
      ? guideStep.message
      : dailyTutorialNeeded
      ? 'Tutorial: talk to the guide avatar to learn the game and unlock JOIN GAME. Press F to skip.'
      : isSpectator
      ? 'Tutorial: you are spectating. Press JOIN GAME when you want to enter the next round.'
      : isQueued
        ? 'Tutorial: you are queued. You will become active when the next build starts.'
        : inBuild
          ? 'Tutorial: selected ' + PART_LABEL[selectedPart] + '. E changes piece, F auto places, tap slots for full points.'
          : phase === 'BUILD_COMPLETE'
            ? 'Tutorial: round finished. Check your points, scrap and crystals in Profile or Inventory.'
            : 'Tutorial: follow the round phase and get ready for the next build.'
    const cooldownElapsedMs = Date.now() - lastPlacementCooldownAt
    const autoCooldownPct = Math.min(100, Math.round((cooldownElapsedMs / lastPlacementCooldownMs) * 100))
    const autoCooldownReady = autoCooldownPct >= 100
    const autoCooldownColor = PART_UI_COLOR[lastPlacementCooldownPart]
    const sidePanelWidth = compactUi ? 560 : 380
    const sidePanelRight = compactUi ? 18 : 48
    const expandedPanelRight = compactUi ? 700 : 48
    const rosterWidth = compactUi ? 430 : 300
    const artifactPanelOpen = inventoryPanelOpen || shopPanelOpen
    const inventoryArtifactCount = (artifact: ArtifactType): number => tutorialGuideActive ? tutorialArtifactCount(artifact) : countArtifacts(snap.artifactInventory, artifact)

    return (
      <UiEntity uiTransform={{ width: '100%', height: '100%', positionType: 'absolute', position: { top: 0, left: 0 } }}>

        {/* Top bar */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 12, left: compactUi ? 300 : 480 },
            width: compactUi ? 1320 : 960,
            height: compactUi ? 64 : 38,
            alignItems: 'center',
            justifyContent: 'center',
            display: syncing || isPlaying ? 'flex' : 'none'
          }}
          uiBackground={{
            color: syncing
              ? { r: 0.25, g: 0.15, b: 0.05, a: 0.92 }
              : { r: 0.05, g: 0.05, b: 0.18, a: 0.92 }
          }}
        >
          <Label
            value={label}
            fontSize={font(isUrgent ? 18 : 15)}
            color={{
              r: 1,
              g: isUrgent ? 0.3 : (syncing ? 0.8 : 1),
              b: isUrgent ? 0.3 : (syncing ? 0.4 : 1),
              a: 1
            }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Player summary */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 158 : 58, right: sidePanelRight },
            width: sidePanelWidth,
            height: compactUi ? 144 : 90,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && snap.profileLoaded && showInformationPanels ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.02, g: 0.12, b: 0.16, a: 0.94 } }}
        >
          <Label
            value={snap.playerName}
            fontSize={font(24)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 48 : 30 }}
            textAlign='middle-center'
          />
          <Label
            value={scraperTitle}
            fontSize={font(18)}
            color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 42 : 26 }}
            textAlign='middle-center'
          />
          <Label
            value={profileProgressionLabel}
            fontSize={font(18)}
            color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 42 : 26 }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Panel controls */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 302 : 148, right: sidePanelRight },
            width: sidePanelWidth,
            height: compactUi ? 64 : 46,
            flexDirection: 'row',
            display: !syncing && snap.profileLoaded && showInformationPanels ? 'flex' : 'none'
          }}
        >
          <UiEntity
            uiTransform={{ width: '33.33%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: profilePanelOpen
              ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
              : { r: 0.025, g: 0.2, b: 0.25, a: 0.96 }
            }}
            onMouseDown={() => {
              if (!allowTutorialAction('PROFILE')) return
              profilePanelOpen = !profilePanelOpen
              if (profilePanelOpen) completeTutorialGuideAction('PROFILE')
              rankingPanelOpen = false
              inventoryPanelOpen = false
              activePlayersPanelOpen = false
            }}
          >
            <Label value='PROFILE' fontSize={font(14)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: '33.33%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: rankingPanelOpen
              ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
              : { r: 0.025, g: 0.2, b: 0.25, a: 0.96 }
            }}
            onMouseDown={() => {
              if (!allowTutorialAction('RANKING')) return
              rankingPanelOpen = !rankingPanelOpen
              profilePanelOpen = false
              inventoryPanelOpen = false
              activePlayersPanelOpen = false
              if (rankingPanelOpen) {
                requestLeaderboards()
                completeTutorialGuideAction('RANKING')
              }
            }}
          >
            <Label value='RANKING' fontSize={font(14)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: '33.34%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: inventoryPanelOpen
              ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
              : { r: 0.025, g: 0.2, b: 0.25, a: 0.96 }
            }}
            onMouseDown={() => {
              if (!allowTutorialAction('INVENTORY')) return
              inventoryPanelOpen = !inventoryPanelOpen
              if (inventoryPanelOpen) completeTutorialGuideAction('INVENTORY')
              profilePanelOpen = false
              rankingPanelOpen = false
              shopPanelOpen = false
            }}
          >
            <Label value='INVENTORY' fontSize={font(13)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
        </UiEntity>

        {/* Active players */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 382 : 210, right: sidePanelRight },
            width: rosterWidth,
            height: rosterHeight,
            flexDirection: 'column',
            display: !syncing && showInformationPanels && !compactUi ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.02, g: 0.03, b: 0.09, a: 0.9 } }}
        >
          <Label
            value={`ACTIVE PLAYERS: ${roster.length}`}
            fontSize={font(14)}
            color={{ r: 0.35, g: 0.9, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 62 : 44 }}
            textAlign='middle-center'
          />
          {roster.length === 0 ? (
            <Label
              value='No active players'
              fontSize={font(12)}
              color={{ r: 0.65, g: 0.65, b: 0.75, a: 1 }}
              uiTransform={{ width: '100%', height: rosterRowHeight }}
              textAlign='middle-center'
            />
          ) : roster.map((player, index) => (
            <UiEntity
              key={`${player.name}-${index}`}
              uiTransform={{ width: '100%', height: rosterRowHeight, flexDirection: 'row', alignItems: 'center' }}
              uiBackground={{ color: index === 0
                ? { r: 0.16, g: 0.13, b: 0.03, a: 0.82 }
                : { r: 0.04, g: 0.05, b: 0.12, a: index % 2 === 0 ? 0.65 : 0.35 }
              }}
            >
              <Label
                value={`${index + 1}. ${player.name}`}
                fontSize={font(14)}
                color={index === 0
                  ? { r: 1, g: 0.85, b: 0.25, a: 1 }
                  : { r: 0.9, g: 0.92, b: 1, a: 1 }}
                uiTransform={{ width: compactUi ? 284 : 198, height: rosterRowHeight }}
                textAlign='middle-left'
              />
              <Label
                value={`PTS: ${player.sessionPoints}`}
                fontSize={font(12)}
                color={{ r: 0.2, g: 1, b: 0.85, a: 1 }}
                uiTransform={{ width: compactUi ? 138 : 96, height: rosterRowHeight }}
                textAlign='middle-right'
              />
            </UiEntity>
          ))}
        </UiEntity>

        {/* Mobile active players button */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 382 : 210, right: sidePanelRight },
            width: sidePanelWidth,
            height: compactUi ? 64 : 46,
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && showInformationPanels && compactUi ? 'flex' : 'none'
          }}
          uiBackground={{ color: activePlayersPanelOpen
            ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
            : { r: 0.02, g: 0.03, b: 0.09, a: 0.9 }
          }}
          onMouseDown={() => {
            if (tutorialGuideActive) return
            activePlayersPanelOpen = !activePlayersPanelOpen
            profilePanelOpen = false
            rankingPanelOpen = false
            inventoryPanelOpen = false
          }}
        >
          <Label
            value={`ACTIVE PLAYERS: ${roster.length}`}
            fontSize={font(15)}
            color={{ r: 0.35, g: 0.9, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>
        {/* Profile / ranking panel */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? (activePlayersPanelOpen ? 300 : 382) : 210, right: expandedPanelRight },
            width: compactUi ? 816 : 680,
            height: activePlayersPanelOpen ? (compactUi ? 520 : 420) : artifactPanelOpen ? (compactUi ? 640 : 500) : profilePanelOpen ? (compactUi ? 500 : 390) : (compactUi ? 700 : 720),
            flexDirection: 'column',
            display: (profilePanelOpen || rankingPanelOpen || inventoryPanelOpen || activePlayersPanelOpen || shopPanelOpen) && !syncing && snap.profileLoaded && showInformationPanels ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.015, g: 0.025, b: 0.075, a: 0.98 } }}
        >
          <UiEntity
            uiTransform={{ width: '100%', height: compactUi ? 120 : 92, flexDirection: 'row', alignItems: 'center' }}
            uiBackground={{ color: { r: 0.02, g: 0.16, b: 0.18, a: 1 } }}
          >
            <UiEntity uiTransform={{ width: compactUi ? 696 : 580, height: '100%', flexDirection: 'column', justifyContent: 'center' }}>
              <Label
                value={rankingPanelOpen ? 'RANKINGS' : shopPanelOpen ? 'ARTIFACT SHOP' : inventoryPanelOpen ? 'INVENTORY' : activePlayersPanelOpen ? 'ACTIVE PLAYERS' : snap.playerName}
                fontSize={font(33)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: compactUi ? 62 : 48 }}
                textAlign='middle-left'
              />
              <Label
                value={rankingPanelOpen ? 'SESSION   |   DAILY   |   WEEKLY   |   TOTAL' : shopPanelOpen ? `CRYSTALS: ${snap.crystals}   |   PRICE: ${ARTIFACT_PRICE_CRYSTALS}` : inventoryPanelOpen ? `CRYSTALS: ${snap.crystals}   |   SCRAP PARTS` : activePlayersPanelOpen ? `PLAYERS IN ROUND: ${roster.length}` : `${scraperTitle}   |   LEVEL: ${snap.level}`}
                fontSize={font(20)}
                color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
                uiTransform={{ width: '100%', height: compactUi ? 45 : 32 }}
                textAlign='middle-left'
              />
            </UiEntity>
            <UiEntity
              uiTransform={{ width: compactUi ? 120 : 80, height: compactUi ? 100 : 72, alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.35, g: 0.08, b: 0.12, a: 1 } }}
              onMouseDown={closeGameUi}
            >
              <Label value='X' fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 330 : 230, flexDirection: 'column', display: activePlayersPanelOpen ? 'flex' : 'none' }}>
            {roster.length === 0 ? (
              <Label
                value='No active players'
                fontSize={font(20)}
                color={{ r: 0.65, g: 0.72, b: 0.85, a: 1 }}
                uiTransform={{ width: '100%', height: compactUi ? 82 : 56 }}
                textAlign='middle-center'
              />
            ) : roster.slice(0, 7).map((player, index) => (
              <UiEntity
                key={`active-panel-${player.name}-${index}`}
                uiTransform={{ width: '100%', height: compactUi ? 58 : 42, flexDirection: 'row', alignItems: 'center' }}
                uiBackground={{ color: index === 0
                  ? { r: 0.18, g: 0.14, b: 0.025, a: 0.9 }
                  : { r: 0.035, g: 0.045, b: 0.11, a: index % 2 === 0 ? 0.72 : 0.42 }
                }}
              >
                <Label
                  value={`${index + 1}. ${player.name}`}
                  fontSize={font(20)}
                  color={index === 0 ? { r: 1, g: 0.85, b: 0.25, a: 1 } : { r: 0.92, g: 0.94, b: 1, a: 1 }}
                  uiTransform={{ width: '70%', height: '100%' }}
                  textAlign='middle-left'
                />
                <Label
                  value={`PTS: ${player.sessionPoints}`}
                  fontSize={font(15)}
                  color={{ r: 0.2, g: 1, b: 0.85, a: 1 }}
                  uiTransform={{ width: '30%', height: '100%' }}
                  textAlign='middle-right'
                />
              </UiEntity>
            ))}
          </UiEntity>
          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 66 : 48, flexDirection: 'row', alignItems: 'center', display: profilePanelOpen ? 'flex' : 'none' }}>
            <Label value={`TOTAL PTS: ${snap.totalXp}`} fontSize={font(20)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '30%', height: '100%' }} textAlign='middle-center' />
            <Label value={`LEVEL: ${levelProgress.level}`} fontSize={font(20)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '20%', height: '100%' }} textAlign='middle-center' />
            <Label
              value={levelProgress.isMaxLevel ? 'MAX LEVEL' : `PTS TO NEXT LEVEL: ${levelProgress.pointsToNext}`}
              fontSize={font(20)}
              color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
              uiTransform={{ width: '50%', height: '100%' }}
              textAlign='middle-center'
            />
          </UiEntity>

          <UiEntity uiTransform={{
            width: '100%',
            height: compactUi ? 150 : 108,
            flexDirection: 'column',
            display: profilePanelOpen ? 'flex' : 'none'
          }}>
            <UiEntity uiTransform={{ width: '100%', height: '33%', flexDirection: 'row' }}>
              <Label value={`SESSION PTS: ${snap.sessionPoints}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '33%', height: '100%' }} textAlign='middle-center' />
              <Label value={`CORRECT PIECES: ${snap.correctPieces}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '34%', height: '100%' }} textAlign='middle-center' />
              <Label value={`ROUNDS: ${snap.roundsPlayed}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '33%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
            <UiEntity uiTransform={{ width: '100%', height: '33%', flexDirection: 'row' }}>
              <Label value={`TIMES MVP: ${snap.mvpAwards}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '33%', height: '100%' }} textAlign='middle-center' />
              <Label value={`PERFECT BUILDS: ${snap.perfectBuilds}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '34%', height: '100%' }} textAlign='middle-center' />
              <Label value={`#1 BONUSES: ${snap.sessionLeaderAwards}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '33%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
            <UiEntity uiTransform={{ width: '100%', height: '34%', flexDirection: 'row' }}>
              <Label value={`EXCELLENCE: ${excellence} PTS / ROUND`} fontSize={font(20)} color={{ r: 0.25, g: 1, b: 0.86, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-center' />
              <Label value={`DOMINANCE: ${dominance}% MVP / ROUND`} fontSize={font(20)} color={{ r: 0.25, g: 1, b: 0.86, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 420 : 310, flexDirection: 'column', display: inventoryPanelOpen ? 'flex' : 'none' }}>
            <UiEntity uiTransform={{ width: '100%', height: compactUi ? 54 : 40, flexDirection: 'row' }}>
              <Label value={`CRYSTALS: ${snap.crystals}`} fontSize={font(24)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '38%', height: '100%' }} textAlign='middle-center' />
              <Label value={`CUBES: ${snap.cubeScrap}`} fontSize={font(17)} color={{ r: 0.22, g: 0.52, b: 1, a: 1 }} uiTransform={{ width: '20%', height: '100%' }} textAlign='middle-center' />
              <Label value={`CYL: ${snap.cylinderScrap}`} fontSize={font(17)} color={{ r: 1, g: 0.25, b: 0.25, a: 1 }} uiTransform={{ width: '20%', height: '100%' }} textAlign='middle-center' />
              <Label value={`PYR: ${snap.coneScrap}`} fontSize={font(17)} color={{ r: 1, g: 0.84, b: 0.15, a: 1 }} uiTransform={{ width: '22%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>

            <Label value='OBJECTS' fontSize={font(16)} color={{ r: 0.35, g: 0.95, b: 1, a: 1 }} uiTransform={{ width: '100%', height: compactUi ? 34 : 24 }} textAlign='middle-center' />
            <UiEntity uiTransform={{ width: '100%', height: compactUi ? 176 : 132, flexDirection: 'column' }}>
              {[0, 1, 2].map((row) => (
                <UiEntity key={`inventory-row-${row}`} uiTransform={{ width: '100%', height: '33%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  {INVENTORY_OBJECT_SLOTS.slice(row * 3, row * 3 + 3).map((slot) => {
                    const candidate = visibleInventoryArtifact(slot.index, snap.artifactInventory)
                    const count = candidate ? inventoryArtifactCount(candidate) : 0
                    const artifact = candidate && count > 0 ? candidate : undefined
                    return (
                      <UiEntity
                        key={`inventory-object-${slot.id}`}
                        uiTransform={{ width: compactUi ? 150 : 102, height: compactUi ? 50 : 38, margin: { left: 5, right: 5, top: 3, bottom: 3 }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                        uiBackground={{ color: artifact ? { r: 0.04, g: 0.24, b: 0.28, a: 0.96 } : { r: 0.025, g: 0.045, b: 0.08, a: 0.72 } }}
                        onMouseDown={() => {
                          if (!artifact) return
                          if (tutorialGuideActive) {
                            const action = currentTutorialAction()
                            if (action !== 'ARTIFACT_1' && action !== 'ARTIFACT_2') return
                            if (tutorialEquippedArtifacts.length >= 2) return
                            tutorialArtifactInventoryCounts[artifact] = Math.max(0, tutorialArtifactCount(artifact) - 1)
                            tutorialEquippedArtifacts.push(artifact)
                            completeTutorialGuideAction(action)
                            return
                          }
                          const inventoryIndex = firstArtifactIndex(snap.artifactInventory, artifact)
                          if (inventoryIndex >= 0) requestEquipArtifact(inventoryIndex)
                        }}
                      >
                        <Label value={artifact ? `${artifactShortLabel(artifact)} x${count}` : 'EMPTY'} fontSize={font(11)} color={{ r: 0.75, g: 0.95, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
                      </UiEntity>
                    )
                  })}
                </UiEntity>
              ))}
            </UiEntity>

            <UiEntity uiTransform={{ width: '100%', height: compactUi ? 112 : 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Label value='EQUIPPED' fontSize={font(16)} color={{ r: 0.35, g: 0.95, b: 1, a: 1 }} uiTransform={{ width: '28%', height: '100%' }} textAlign='middle-center' />
              {EQUIPPED_ARTIFACT_SLOTS.map((slot) => (
                <UiEntity
                  key={`inventory-equipped-${slot.id}`}
                  uiTransform={{ width: compactUi ? 150 : 102, height: compactUi ? 82 : 58, margin: { left: 8, right: 8 }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                  uiBackground={{ color: displayedEquippedArtifacts[slot.index] ? { r: 0.04, g: 0.24, b: 0.28, a: 0.96 } : { r: 0.025, g: 0.06, b: 0.1, a: 0.95 } }}
                >
                  <Label value={slot.label} fontSize={font(17)} color={{ r: 0.2, g: 1, b: 0.9, a: 1 }} uiTransform={{ width: '100%', height: '42%' }} textAlign='middle-center' />
                  <Label value={artifactShortLabel(displayedEquippedArtifacts[slot.index])} fontSize={font(11)} color={{ r: 0.65, g: 0.75, b: 0.85, a: 1 }} uiTransform={{ width: '100%', height: '58%' }} textAlign='middle-center' />
                </UiEntity>
              ))}
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 360 : 280, flexDirection: 'column', display: shopPanelOpen ? 'flex' : 'none' }}>
            <Label
              value={inBuild ? 'SHOP LOCKED DURING ACTIVE BUILD' : 'BUY ARTIFACTS TO YOUR INVENTORY'}
              fontSize={font(20)}
              color={inBuild ? { r: 1, g: 0.55, b: 0.25, a: 1 } : { r: 0.35, g: 0.95, b: 1, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 70 : 50 }}
              textAlign='middle-center'
            />
            {ARTIFACT_SHOP_ITEMS.map((artifact) => (
              <UiEntity
                key={'shop-' + artifact}
                uiTransform={{ width: '100%', height: compactUi ? 120 : 90, flexDirection: 'row', alignItems: 'center' }}
                uiBackground={{ color: { r: 0.025, g: 0.045, b: 0.11, a: 0.86 } }}
              >
                <Label
                  value={ARTIFACT_LABEL[artifact]}
                  fontSize={font(22)}
                  color={{ r: 1, g: 1, b: 1, a: 1 }}
                  uiTransform={{ width: '40%', height: '100%' }}
                  textAlign='middle-center'
                />
                <Label
                  value={artifactDescription(artifact)}
                  fontSize={font(15)}
                  color={{ r: 0.72, g: 0.85, b: 0.92, a: 1 }}
                  uiTransform={{ width: '36%', height: '100%' }}
                  textAlign='middle-center'
                />
                <UiEntity
                  uiTransform={{ width: '24%', height: compactUi ? 72 : 54, alignItems: 'center', justifyContent: 'center' }}
                  uiBackground={{ color: snap.crystals >= ARTIFACT_PRICE_CRYSTALS && snap.artifactInventory.length < 9 && !inBuild
                    ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
                    : { r: 0.18, g: 0.18, b: 0.22, a: 0.86 }
                  }}
                  onMouseDown={() => {
                    if (tutorialGuideActive) return
                    if (inBuild) return
                    requestBuyArtifact(artifact)
                  }}
                >
                  <Label value={`BUY ${ARTIFACT_PRICE_CRYSTALS}`} fontSize={font(16)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
                </UiEntity>
              </UiEntity>
            ))}
          </UiEntity>
          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 58 : 44, alignItems: 'center', justifyContent: 'center', display: profilePanelOpen ? 'flex' : 'none' }}>
            <UiEntity
              uiTransform={{ width: '36%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.08, g: 0.26, b: 0.34, a: 1 } }}
              onMouseDown={() => {
                if (tutorialGuideActive) return
                tutorialModeActive = true
                tutorialFirstRoundActive = false
                openTutorial(false)
              }}
            >
              <Label
                value={tutorialModeActive ? 'TIPS ON' : 'TUTORIAL'}
                fontSize={font(15)}
                color={{ r: 0.45, g: 0.95, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 58 : 44, flexDirection: 'row', alignItems: 'center', display: rankingPanelOpen ? 'flex' : 'none' }}>
            <UiEntity
              uiTransform={{ width: '15%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.04, g: 0.32, b: 0.31, a: 1 } }}
              onMouseDown={() => { stepRankingTab(-1) }}
            >
              <Label
                value={'<'}
                fontSize={font(25)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
            </UiEntity>
            <Label value='LEADERBOARDS' fontSize={font(23)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '70%', height: '100%' }} textAlign='middle-center' />
            <UiEntity
              uiTransform={{ width: '15%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.04, g: 0.32, b: 0.31, a: 1 } }}
              onMouseDown={() => { stepRankingTab(1) }}
            >
              <Label
                value={'>'}
                fontSize={font(25)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 74 : 54, flexDirection: 'row', display: rankingPanelOpen ? 'flex' : 'none' }}>
            {RANKING_TABS.map((tab) => (
              <UiEntity
                key={tab}
                uiTransform={{ width: '25%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                uiBackground={{ color: rankingTab === tab
                  ? { r: 0.05, g: 0.5, b: 0.44, a: 1 }
                  : { r: 0.04, g: 0.06, b: 0.14, a: 1 }
                }}
                onMouseDown={() => {
                  rankingTab = tab
                  if (tab !== 'SESSION' && snap.leaderboards.generatedAt === 0) requestLeaderboards()
                }}
              >
                <Label value={tab} fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
              </UiEntity>
            ))}
          </UiEntity>

          <UiEntity
            uiTransform={{ width: '100%', height: compactUi ? 60 : 42, flexDirection: 'row', alignItems: 'center', display: rankingPanelOpen ? 'flex' : 'none' }}
            uiBackground={{ color: { r: 0.025, g: 0.11, b: 0.16, a: 1 } }}
          >
            <Label value='NAME' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingNameWidth, height: '100%' }} textAlign='middle-left' />
            <Label value='LEVEL' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingLevelWidth, height: '100%' }} textAlign='middle-center' />
            <Label value='ROUNDS' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingRoundsWidth, height: '100%' }} textAlign='middle-center' />
            <Label value='TIMES MVP' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingMvpWidth, height: '100%' }} textAlign='middle-center' />
            <Label value='POINTS' fontSize={font(17)} color={{ r: 0.55, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: rankingPointsWidth, height: '100%' }} textAlign='middle-right' />
          </UiEntity>

          {snap.leaderboardsLoading && rankingTab !== 'SESSION' ? (
            <Label
              value='Loading rankings...'
              fontSize={font(20)}
              color={{ r: 0.65, g: 0.72, b: 0.85, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 80 : 60, display: rankingPanelOpen ? 'flex' : 'none' }}
              textAlign='middle-center'
            />
          ) : rankingRows.length === 0 ? (
            <Label
              value='No scores yet'
              fontSize={font(20)}
              color={{ r: 0.65, g: 0.72, b: 0.85, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 80 : 60, display: rankingPanelOpen ? 'flex' : 'none' }}
              textAlign='middle-center'
            />
          ) : rankingRows.slice(0, compactUi ? 7 : 10).map((player, index) => (
            <UiEntity
              key={`${rankingTab}-${player.name}-${index}`}
              uiTransform={{ width: '100%', height: compactUi ? 54 : 44, flexDirection: 'row', alignItems: 'center', display: rankingPanelOpen ? 'flex' : 'none' }}
              uiBackground={{ color: index === 0
                ? { r: 0.18, g: 0.14, b: 0.025, a: 0.9 }
                : { r: 0.035, g: 0.045, b: 0.11, a: index % 2 === 0 ? 0.72 : 0.42 }
              }}
            >
              <Label
                value={`${index + 1}. ${player.name}`}
                fontSize={font(20)}
                color={index === 0 ? { r: 1, g: 0.85, b: 0.25, a: 1 } : { r: 0.92, g: 0.94, b: 1, a: 1 }}
                uiTransform={{ width: rankingNameWidth, height: '100%' }}
                textAlign='middle-left'
              />
              <Label
                value={`${player.level}`}
                fontSize={font(17)}
                color={{ r: 0.78, g: 0.84, b: 0.95, a: 1 }}
                uiTransform={{ width: rankingLevelWidth, height: '100%' }}
                textAlign='middle-center'
              />
              <Label
                value={`${player.rounds}`}
                fontSize={font(17)}
                color={{ r: 0.78, g: 0.84, b: 0.95, a: 1 }}
                uiTransform={{ width: rankingRoundsWidth, height: '100%' }}
                textAlign='middle-center'
              />
              <Label
                value={`${player.mvps}`}
                fontSize={font(17)}
                color={{ r: 1, g: 0.78, b: 0.25, a: 1 }}
                uiTransform={{ width: rankingMvpWidth, height: '100%' }}
                textAlign='middle-center'
              />
              <Label
                value={`${player.points}`}
                fontSize={font(17)}
                color={{ r: 0.2, g: 1, b: 0.85, a: 1 }}
                uiTransform={{ width: rankingPointsWidth, height: '100%' }}
                textAlign='middle-right'
              />
            </UiEntity>
          ))}
        </UiEntity>

        {/* Join prompt */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 300 : 330, left: compactUi ? 280 : 660 },
            width: compactUi ? 960 : 600,
            height: compactUi ? 360 : 210,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'none'
          }}
          uiBackground={{ color: { r: 0.02, g: 0.03, b: 0.12, a: 0.96 } }}
        >
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: compactUi ? 18 : 12, right: compactUi ? 18 : 12 },
              width: compactUi ? 78 : 48,
              height: compactUi ? 78 : 48,
              alignItems: 'center',
              justifyContent: 'center'
            }}
            uiBackground={{ color: { r: 0.34, g: 0.07, b: 0.12, a: 1 } }}
            onMouseDown={closeGameUi}
          >
            <Label value='X' fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
          <Label
            value='ALIENSCRAPYARD'
            fontSize={font(38)}
            color={{ r: 0.1, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 112 : 70 }}
            textAlign='middle-center'
          />
          <Label
            value='Join the competitive build when you are ready.'
            fontSize={font(16)}
            color={{ r: 0.85, g: 0.88, b: 1, a: 1 }}
            uiTransform={{ width: compactUi ? 880 : 540, height: compactUi ? 100 : 54 }}
            textAlign='middle-center'
          />
          <UiEntity
            uiTransform={{
              width: compactUi ? 430 : 260,
              height: compactUi ? 90 : 54,
              alignItems: 'center',
              justifyContent: 'center',
              display: 'flex'
            }}
            uiBackground={{ color: { r: 0.05, g: 0.55, b: 0.46, a: 1 } }}
            onMouseDown={joinGame}
          >
            <Label
              value='JOIN GAME'
              fontSize={font(20)}
              color={{ r: 1, g: 1, b: 1, a: 1 }}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
            />
          </UiEntity>
        </UiEntity>

        {/* Build HUD */}

        {/* Progress bar */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 96 : 60, left: compactUi ? 400 : 576 },
            width: compactUi ? 920 : 768,
            height: compactUi ? 24 : 14,
            display: (inBuild || tutorialCompleteVisible) ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.1, g: 0.1, b: 0.1, a: 0.7 } }}
        >
          <UiEntity
            uiTransform={{ width: `${pct}%`, height: compactUi ? 24 : 14 }}
            uiBackground={{ color: { r: 0.15, g: 0.75, b: 0.3, a: 1 } }}
          />
        </UiEntity>

        {/* Progress label */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 124 : 78, left: compactUi ? 400 : 576 },
            width: compactUi ? 920 : 768,
            height: compactUi ? 36 : 20,
            alignItems: 'center',
            justifyContent: 'center',
            display: (inBuild || tutorialCompleteVisible) ? 'flex' : 'none'
          }}
        >
          <Label
            value={`PIECES: ${displayedPartsAttached} / ${displayedPartsRequired}`}
            fontSize={font(12)}
            color={{ r: 0.85, g: 0.85, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Guided tutorial message */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: tutorialCompleteVisible
              ? { bottom: compactUi ? 18 : 18, left: compactUi ? 420 : 610 }
              : { bottom: compactUi ? 262 : 178, left: compactUi ? 300 : 560 },
            width: tutorialCompleteVisible ? (compactUi ? 1080 : 700) : (compactUi ? 1320 : 800),
            height: tutorialCompleteVisible ? (compactUi ? 92 : 64) : (compactUi ? 170 : 108),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            display: (tutorialTipVisible || tutorialCompleteVisible) ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.01, g: 0.035, b: 0.075, a: 0.96 } }}
        >
          <Label
            value={tutorialCompleteVisible ? tutorialPracticeMessage() : tutorialTip}
            fontSize={font(tutorialCompleteVisible ? 20 : 19)}
            color={tutorialCompleteVisible ? { r: 0.2, g: 1, b: 0.85, a: 1 } : { r: 0.9, g: 0.96, b: 1, a: 1 }}
            uiTransform={{ width: guideAdvanceAvailable || tutorialCompleteVisible ? '74%' : '94%', height: '100%' }}
            textAlign='middle-center'
          />
          <UiEntity
            uiTransform={{
              width: tutorialCompleteVisible ? (compactUi ? 190 : 116) : (compactUi ? 230 : 132),
              height: tutorialCompleteVisible ? (compactUi ? 64 : 44) : (compactUi ? 86 : 58),
              alignItems: 'center',
              justifyContent: 'center',
              display: guideAdvanceAvailable || (tutorialCompleteVisible && tutorialReadyAvailable) ? 'flex' : 'none'
            }}
            uiBackground={{ color: tutorialCompleteVisible ? { r: 0.05, g: 0.55, b: 0.46, a: 1 } : { r: 0.04, g: 0.32, b: 0.34, a: 1 } }}
            onMouseDown={() => {
              if (tutorialCompleteVisible) finishTutorialGuide(true)
              else if (guideStep) completeTutorialGuideAction(guideStep.action)
            }}
          >
            <Label
              value={tutorialCompleteVisible ? 'READY' : 'NEXT'}
              fontSize={font(20)}
              color={{ r: 1, g: 1, b: 1, a: 1 }}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
            />
          </UiEntity>
        </UiEntity>
        {/* Piece picker */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 120 : 86, left: compactUi ? 518 : 740 },
            width: compactUi ? 684 : 440,
            height: compactUi ? 124 : 78,
            flexDirection: 'column',
            alignItems: 'center',
            display: (inBuild || tutorialGuideActive) ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.05, g: 0.05, b: 0.2, a: 0.88 } }}
        >
            <Label
              value={tutorialGuideActive ? 'SELECT BLOCK' : 'CURRENT BLOCK'}
              fontSize={blockPanelFont(10)}
              color={{ r: 0.5, g: 0.5, b: 0.9, a: 0.9 }}
              uiTransform={{ width: '100%', height: compactUi ? 18 : 10 }}
              textAlign='middle-center'
            />
            <UiEntity
              uiTransform={{ width: '100%', height: compactUi ? 76 : 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              {PART_TYPES.map(pt => {
                const isSelected = pt === PART_TYPES[selectedIndex]
                const col = PART_UI_COLOR[pt]
                const tint = isSelected
                  ? col
                  : { r: col.r * 0.5, g: col.g * 0.5, b: col.b * 0.5, a: 0.6 }
                return (
                  <UiEntity
                    key={pt}
                    uiTransform={{
                      width: compactUi ? 218 : 140,
                      height: compactUi ? 72 : 44,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    uiBackground={{ color: isSelected
                      ? { r: 0.12, g: 0.12, b: 0.45, a: 1 }
                      : { r: 0.02, g: 0.02, b: 0.1, a: 0.8 }
                    }}
                    onMouseDown={() => selectPart(PART_TYPES.indexOf(pt), inBuild, 'button')}
                  >
                    <Label
                      value={PART_SYMBOL[pt]}
                      fontSize={blockPanelFont(pt === 'CYLINDER' ? 34 : 30)}
                      color={tint}
                      uiTransform={{ width: '100%', height: '100%' }}
                      textAlign='middle-center'
                    />
                  </UiEntity>
                )
              })}
            </UiEntity>
            <UiEntity
              uiTransform={{ width: '100%', height: compactUi ? 22 : 14, alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.015, g: 0.018, b: 0.05, a: 0.92 } }}
            >
              <Label
                value={tutorialGuideActive ? (guideStep?.action === 'COMPLETE' ? '<color=#00ffff>E</color> CHANGE  |  <color=#00ffff>F</color> PLACE  |  TAP = SELECT+PLACE' : guideStep?.action === 'PIECE_BUTTONS' ? 'TAP BUTTONS TO SELECT A PIECE' : '<color=#00ffff>E</color> CHANGE PIECE') : '<color=#00ffff>E/F</color> AUTO PLACE  |  TAP = FULL POINTS'}
                fontSize={blockPanelFont(12)}
                color={{ r: 0.92, g: 0.96, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
            </UiEntity>
            <UiEntity
              uiTransform={{ width: compactUi ? 540 : 340, height: compactUi ? 12 : 8 }}
              uiBackground={{ color: { r: 0.02, g: 0.04, b: 0.08, a: 0.92 } }}
            >
              <UiEntity
                uiTransform={{ width: `${autoCooldownPct}%`, height: '100%' }}
                uiBackground={{ color: autoCooldownReady
                  ? { r: 0.15, g: 1, b: 0.55, a: 1 }
                  : { r: autoCooldownColor.r, g: autoCooldownColor.g, b: autoCooldownColor.b, a: 1 }
                }}
              />
            </UiEntity>
        </UiEntity>

        {/* Equipped artifacts */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 120 : 86, left: compactUi ? 1222 : 1196 },
            width: compactUi ? 280 : 180,
            height: compactUi ? 124 : 78,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            display: (inBuild || tutorialCompleteVisible) ? 'flex' : 'none'
          }}
        >
          {EQUIPPED_ARTIFACT_SLOTS.map((slot) => (
            <UiEntity
              key={`hud-${slot.id}`}
              uiTransform={{
                width: compactUi ? 132 : 84,
                height: compactUi ? 112 : 72,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              uiBackground={{ color: displayedEquippedArtifacts[slot.index] ? { r: 0.04, g: 0.24, b: 0.28, a: 0.94 } : { r: 0.025, g: 0.06, b: 0.1, a: 0.9 } }}
              onMouseDown={() => { tutorialCompleteVisible ? useTutorialPracticeArtifact(slot.index) : requestUseArtifact(slot.index) }}
            >
              <Label value={slot.label} fontSize={font(16)} color={{ r: 0.2, g: 1, b: 0.9, a: 1 }} uiTransform={{ width: '100%', height: '42%' }} textAlign='middle-center' />
              <Label value={artifactShortLabel(displayedEquippedArtifacts[slot.index])} fontSize={font(10)} color={{ r: 0.65, g: 0.75, b: 0.85, a: 1 }} uiTransform={{ width: '100%', height: '58%' }} textAlign='middle-center' />
            </UiEntity>
          ))}
        </UiEntity>

        {/* Community progress */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 20 : 18, left: compactUi ? 260 : 460 },
            width: compactUi ? 1400 : 1000,
            height: compactUi ? 88 : 58,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && !inCinematic && !tutorialGuideActive && !profilePanelOpen && !rankingPanelOpen && !inventoryPanelOpen && !activePlayersPanelOpen && !shopPanelOpen ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.015, g: 0.055, b: 0.09, a: 0.94 } }}
        >
          <Label
            value={communityLabel}
            fontSize={font(19)}
            color={communityTierUpTimer > 0
              ? { r: 1, g: 0.84, b: 0.25, a: 1 }
              : { r: 0.25, g: 0.95, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 48 : 32 }}
            textAlign='middle-center'
          />
          <UiEntity
            uiTransform={{ width: compactUi ? 1320 : 940, height: compactUi ? 24 : 16 }}
            uiBackground={{ color: { r: 0.04, g: 0.08, b: 0.14, a: 1 } }}
          >
            <UiEntity
              uiTransform={{ width: `${communityPct}%`, height: '100%' }}
              uiBackground={{ color: communityTierUpTimer > 0
                ? { r: 1, g: 0.72, b: 0.16, a: 1 }
                : { r: 0.05, g: 0.78, b: 0.66, a: 1 }
              }}
            />
          </UiEntity>
        </UiEntity>

        {/* Feedback */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 238 : 166, left: compactUi ? 280 : 480 },
            width: compactUi ? 1360 : 960,
            height: compactUi ? 70 : 38,
            alignItems: 'center',
            justifyContent: 'center',
            display: feedbackText !== '' && !syncing ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.05, g: 0.05, b: 0.2, a: 0.88 } }}
        >
          <Label
            value={feedbackText}
            fontSize={font(14)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Onboarding */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 390 : 280, left: compactUi ? 280 : 480 },
            width: compactUi ? 960 : 960,
            flexDirection: 'column',
            alignItems: 'center',
            display: showOnboarding && inBuild && !inCinematic && !syncing ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.03, g: 0.03, b: 0.15, a: 0.95 * onboardingAlpha } }}
        >
            <Label
              value='ALIENSCRAPYARD'
              fontSize={font(42)}
              color={{ r: 0, g: 1, b: 1, a: onboardingAlpha }}
              uiTransform={{ width: '100%', height: compactUi ? 100 : 60 }}
              textAlign='middle-center'
            />
            <Label
              value='Place the matching pieces before the timer runs out.'
              fontSize={font(20)}
              color={{ r: 0.9, g: 0.9, b: 1, a: onboardingAlpha }}
              uiTransform={{ width: '100%', height: compactUi ? 58 : 32 }}
              textAlign='middle-center'
            />
            <Label
              value='<color=#00ffff>E</color> changes piece. Click a slot to place it.'
              fontSize={font(16)}
              color={{ r: 0.9, g: 0.9, b: 1, a: onboardingAlpha }}
              uiTransform={{ width: '100%', height: compactUi ? 52 : 28 }}
              textAlign='middle-center'
            />
            <Label value=' ' fontSize={6} color={{ r: 0, g: 0, b: 0, a: 0 }} uiTransform={{ width: '100%', height: 10 }} textAlign='middle-center' />
        </UiEntity>

        {/* Round result */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 220 : 300, left: compactUi ? 180 : 420 },
            width: compactUi ? 1560 : 1080,
            height: compactUi ? 560 : 360,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: isPlaying && phase === 'BUILD_COMPLETE' && snap.resolved && !snap.isStale ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.72 } }}
        >
          <Label
            value={snap.performanceType === 'PERFECT' ? 'PERFECT BUILD!' : 'INCOMPLETE'}
            fontSize={font(64)}
            color={snap.performanceType === 'PERFECT'
              ? { r: 0, g: 1, b: 1, a: 1 }
              : { r: 1, g: 0.25, b: 0.15, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 165 : 105 }}
            textAlign='middle-center'
          />
          <Label
            value={`PIECES PLACED: ${snap.partsAttached} / ${snap.partsRequired}`}
            fontSize={font(20)}
            color={{ r: 0.8, g: 0.8, b: 0.9, a: 0.85 }}
            uiTransform={{ width: '100%', height: compactUi ? 68 : 42 }}
            textAlign='middle-center'
          />
          <Label
            value={snap.mvpName
              ? `ROUND MVP: ${snap.mvpName}   |   PTS: ${snap.mvpPoints}`
              : snap.players.length < 2 ? 'MVP: REQUIRES 2+ PLAYERS' : 'MVP: NONE'}
            fontSize={font(24)}
            color={{ r: 1, g: 0.82, b: 0.2, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 82 : 52 }}
            textAlign='middle-center'
          />
          <Label
            value={snap.playerStatus === 'ACTIVE'
              ? levelProgress.isMaxLevel
                ? `YOU EARNED: ${snap.roundPoints} PTS   |   LEVEL: ${levelProgress.level} MAX`
                : `YOU EARNED: ${snap.roundPoints} PTS   |   LEVEL: ${levelProgress.level}   |   PTS TO NEXT LEVEL: ${levelProgress.pointsToNext}`
              : 'JOIN GAME TO SCORE IN THE NEXT ROUND'}
            fontSize={font(20)}
            color={{ r: 0.2, g: 1, b: 0.85, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 82 : 52 }}
            textAlign='middle-center'
          />
          <Label
            value='NEXT ROUND STARTS AUTOMATICALLY'
            fontSize={font(15)}
            color={{ r: 0.65, g: 0.7, b: 0.85, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 62 : 38 }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Cinematic overlay */}
        <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', display: inCinematic && isCinematicViewer ? 'flex' : 'none' }}>

          {/* Letterbox bars */}
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: 140 }}
            uiBackground={{ color: { r: 0, g: 0, b: 0, a: 1 } }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { bottom: 0, left: 0 }, width: '100%', height: 140 }}
            uiBackground={{ color: { r: 0, g: 0, b: 0, a: 1 } }}
          />

          {/* Edge glow */}
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 136, left: 0 }, width: '100%', height: 4 }}
            uiBackground={{ color: { r: 0.3, g: 0.6, b: 1, a: 0.5 + Math.sin(floatTime * 2.2) * 0.3 } }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { bottom: 136, left: 0 }, width: '100%', height: 4 }}
            uiBackground={{ color: { r: 0.3, g: 0.6, b: 1, a: 0.5 + Math.sin(floatTime * 2.2 + 1.5) * 0.3 } }}
          />

          {/* Accent bars */}
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 140, left: 0 }, width: 4, height: 800 }}
            uiBackground={{ color: { r: 0.3, g: 0.6, b: 1, a: Math.max(0.1, 0.4 + Math.sin(floatTime * 2.5) * 0.4) } }}
          />
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 140, right: 0 }, width: 4, height: 800 }}
            uiBackground={{ color: { r: 0.3, g: 0.6, b: 1, a: Math.max(0.1, 0.4 + Math.sin(floatTime * 2.5 + Math.PI) * 0.4) } }}
          />

          {/* Scan line */}
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: Math.round(140 + ((Math.sin(floatTime * 0.75) + 1) / 2) * 790), left: 0 },
              width: '100%', height: 3
            }}
            uiBackground={{ color: { r: 0.5, g: 0.8, b: 1, a: 0.45 } }}
          />

          {/* Countdown label */}
          <UiEntity
            uiTransform={{ positionType: 'absolute', position: { top: 162, left: 0 }, width: '100%', height: 58, alignItems: 'center', justifyContent: 'center' }}
          >
            <Label
              value='NEXT BUILD IN'
              fontSize={font(26)}
              color={{ r: 0.75, g: 0.85, b: 1, a: Math.max(0.4, 0.7 + Math.sin(floatTime * 3.5) * 0.3) }}
              uiTransform={{ width: '100%', height: 58 }}
              textAlign='middle-center'
            />
          </UiEntity>

          {/* Countdown number */}
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: compactUi ? 220 : 210, left: 0 },
              width: '100%',
              height: compactUi ? 300 : 200,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Label
              value={`${Math.max(0, cinematicSecondsLeft(phase, snap.secondsLeft))}`}
              fontSize={font(160)}
              color={{
                r: Math.min(1, 0.75 + Math.sin(floatTime * 2.0) * 0.25),
                g: Math.max(0, 0.75 + Math.sin(floatTime * 2.0 + 1.2) * 0.25),
                b: Math.max(0, 0.1  + Math.sin(floatTime * 2.0 + 2.4) * 0.15),
                a: 1
              }}
              uiTransform={{ width: '100%', height: compactUi ? 300 : 200 }}
              textAlign='middle-center'
            />
          </UiEntity>

          {/* Cinematic progress */}
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: compactUi ? 550 : 428, left: compactUi ? 260 : 360 },
              width: cinematicBarWidth,
              height: compactUi ? 8 : 5
            }}
            uiBackground={{ color: { r: 0.08, g: 0.08, b: 0.25, a: 0.7 } }}
          >
            <UiEntity
              uiTransform={{
                width: Math.round(
                  (Math.max(0, cinematicSecondsLeft(phase, snap.secondsLeft)) /
                  (COUNTDOWN_SECONDS + PERFORMANCE_DURATION_SECONDS + RESET_DELAY_SECONDS)) * cinematicBarWidth
                ),
                height: compactUi ? 8 : 5
              }}
              uiBackground={{ color: { r: 0.3, g: 0.65, b: 1, a: 0.85 } }}
            />
          </UiEntity>

        </UiEntity>

        {/* Cyan flash */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: '100%', height: '100%',
            display: blueFlashAlpha > 0 && isPlaying ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0, g: 1, b: 1, a: blueFlashAlpha } }}
        />

        {/* Leaderboard camera controls */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 112 : 80, left: compactUi ? 460 : 640 },
            width: compactUi ? 1000 : 640,
            height: compactUi ? 82 : 58,
            flexDirection: 'row',
            alignItems: 'center',
            display: inLeaderboardView && isSpectator ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.01, g: 0.04, b: 0.08, a: 0.92 } }}
        >
          <UiEntity
            uiTransform={{ width: compactUi ? 150 : 96, height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: { r: 0.03, g: 0.28, b: 0.28, a: 1 } }}
            onMouseDown={previousLeaderboardMode}
          >
            <Label value='<' fontSize={font(28)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
          <Label
            value={getLeaderboardModeLabel()}
            fontSize={font(22)}
            color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: compactUi ? 550 : 360, height: '100%' }}
            textAlign='middle-center'
          />
          <UiEntity
            uiTransform={{ width: compactUi ? 150 : 96, height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: { r: 0.03, g: 0.28, b: 0.28, a: 1 } }}
            onMouseDown={nextLeaderboardMode}
          >
            <Label value='>' fontSize={font(28)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: compactUi ? 150 : 88, height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: { r: 0.34, g: 0.07, b: 0.12, a: 1 } }}
            onMouseDown={closeLeaderboardCamera}
          >
            <Label value='X' fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
        </UiEntity>

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 206 : 150, left: compactUi ? 460 : 640 },
            width: compactUi ? 1000 : 640,
            height: compactUi ? 48 : 34,
            alignItems: 'center',
            justifyContent: 'center',
            display: inLeaderboardView && isSpectator ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.01, g: 0.04, b: 0.08, a: 0.86 } }}
        >
          <Label
            value='E PREVIOUS RANKING   |   F NEXT RANKING'
            fontSize={font(16)}
            color={{ r: 0.72, g: 0.95, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>


        {/* Participation control */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 132 : 92, left: compactUi ? 260 : 460 },
            width: compactUi ? 160 : 260,
            height: compactUi ? 64 : 58,
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && !tutorialVisible && !tutorialGuideActive && !inLeaderboardView && !(isSpectator && needsDailyTutorial()) ? 'flex' : 'none'
          }}
          uiBackground={{ color: isSpectator
            ? { r: 0.04, g: 0.5, b: 0.42, a: 0.98 }
            : { r: 0.42, g: 0.07, b: 0.12, a: 0.98 }
          }}
          onMouseDown={() => { isSpectator ? joinGame() : leaveGame() }}
        >
          <Label
            value={participationLabel}
            fontSize={font(15)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>



      </UiEntity>
    )
  }, { virtualWidth: 1920, virtualHeight: 1080 })
}



























import {
  engine, Entity, Transform, GltfContainer, AudioSource, UiCanvasInformation, Material, MaterialTransparencyMode, MeshCollider, MeshRenderer,
  ColliderLayer, InputAction, inputSystem, MainCamera, PointerEventType, pointerEventsSystem, VirtualCamera
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { ReactEcsRenderer, UiEntity, Label, ReactEcs } from '@dcl/sdk/react-ecs'
import {
  PART_TYPES, PART_GLB, PART_LABEL, PartType,
  ARTIFACT_LABEL, ARTIFACT_PRICE_CRYSTALS, ARTIFACT_DURATION_MS, ArtifactType,
  SCENE_CENTER, PERFORMANCE_LABEL, PlacementMode, PLACEMENT_COOLDOWN_MS, RoundPhase, GLB_SCALE,
  COUNTDOWN_SECONDS, PERFORMANCE_DURATION_SECONDS, RESET_DELAY_SECONDS,
  POINTS_MANUAL_PIECE, POINTS_AUTO_PIECE, communityTierReward
} from './shared/constants'
import { getTemplate, SlotDefinition } from './shared/templates'
import { getLevelProgress, getScraperTitle, LEVEL_THRESHOLDS } from './shared/progression'
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
  requestUnequipArtifact,
  requestUseArtifact
} from './game/gameState'

let selectedIndex = 0
// Persistent carried-piece entities.
let feedbackText = ''
let feedbackTimer = 0
let clickFlashKey = ''
let clickFlashUntil = 0
let clickFlashTint = { r: 0.38, g: 1, b: 0.62, a: 0.4 }
let showOnboarding = false
let onboardingAlpha = 0
let onboardingDismissed = true
let floatTime = 0
let ambientEntity: Entity = 0 as Entity
let currentMusicClip = ''
let nonGameMusicElapsed = 0
let musicMuted = false
const shoulderEntities: Entity[] = []
const SHOULDER_SCALE = 0.272
let carriedVisible = false
let cinematicCameraActive = false
let profilePanelOpen = false
let rankingPanelOpen = false
let inventoryPanelOpen = false
let activePlayersPanelOpen = false
let shopPanelOpen = false
let communityPanelOpen = false
let artifactDetail: ArtifactType | null = null
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
let tutorialGuideSkipAllowed = false
let tutorialGuideQueued = false
let tutorialAutoStarted = false
let tutorialPieceKeyChanged = false
let tutorialPieceButtonChanged = false
let tutorialFKeyPressed = false
let tutorialPieceKeyPresses = 0
let tutorialPieceButtonPresses = 0
let tutorialFKeyPresses = 0
let tutorialCameraEntity: Entity | null = null
let tutorialCameraUnavailable = false
let tutorialPracticePlacedMask = 0
const tutorialPracticeEntities: Entity[] = []
const tutorialPracticeLaunches: TutorialPracticeLaunch[] = []
const TUTORIAL_ARTIFACT_TYPES: ArtifactType[] = ['NO_COOLDOWN', 'DOUBLE_PLACE', 'TRIPLE_PLACE', 'COMPLETE_TEMPLATE']
let tutorialArtifactInventoryCounts: Record<ArtifactType, number> = { NO_COOLDOWN: 10, DOUBLE_PLACE: 10, TRIPLE_PLACE: 10, COMPLETE_TEMPLATE: 10 }
let tutorialEquippedArtifacts: Array<ArtifactType | undefined> = []
let tutorialEquippedArtifactCounts: number[] = []
let tutorialPracticeGuideStep = 0
let tutorialPracticeNoCooldownUntil = 0
let tutorialPracticeDoublePlaceUntil = 0
let tutorialShownForParticipation = false
let lastPlacementCooldownAt = 0
let lastPlacementCooldownMs = 1
let lastPlacementCooldownPart: PartType = 'CUBE'
let escapeListenerReady = false
const TUTORIAL_ENABLED = true
const FEEDBACK_DURATION = 2.5
const CLICK_FLASH_MS = 260

interface TutorialSlide {
  marker: string
  title: string
  description: string
}

interface TutorialPracticeLaunch {
  entity: Entity
  start: Vector3
  target: Vector3
  scale: Vector3
  rotation: Quaternion
  age: number
  duration: number
  arcHeight: number
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
    title: 'CHOOSE AND PLACE BLOCKS',
    description: 'Press E to cycle cube, cylinder and pyramid. Press F to place the selected block automatically. Tap the real slot for more points.'
  },
  {
    marker: '+PTS',
    title: 'POINTS AND REWARDS',
    description: 'Cubes, cylinders and pyramids give different points. Correct blocks always give scrap, and completed rounds pay crystals.'
  },
  {
    marker: 'SHOP',
    title: 'INVENTORY AND ARTIFACTS',
    description: 'Open inventory to see crystals, artifacts and equipped slots. The shop sells temporary artifacts that are consumed when used.'
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
    marker: 'SHOP',
    title: 'ARTIFACT SHOP',
    description: 'Spend crystals in the shop to buy temporary artifacts. Equip them before a round and use them to gain a competitive edge.'
  },
  {
    marker: 'TIPS',
    title: 'TUTORIAL MODE CAN STAY ON',
    description: 'During your first match, small tips stay visible while you play. You can turn them off, or enable them again from Profile.'
  }
]
let TUTORIAL_SLIDES: TutorialSlide[] = [...TUTORIAL_CORE_SLIDES, ...TUTORIAL_INFO_SLIDES]

type TutorialGuideAction = 'NEXT' | 'PROFILE' | 'RANKING' | 'INVENTORY' | 'ARTIFACT_1' | 'ARTIFACT_2' | 'ARTIFACT_REVIEW' | 'PIECE' | 'F' | 'PIECE_BUTTONS' | 'COMPLETE'
type TutorialPieceSource = 'key' | 'button'

interface TutorialGuideStep {
  action: TutorialGuideAction
  message: string
  cameraPosition: { x: number; y: number; z: number }
  cameraRotation: { pitch: number; yaw: number; roll: number }
  desktopImage?: string
  mobileImage?: string
}

const TUTORIAL_GUIDE_STEPS: TutorialGuideStep[] = [
  {
    action: 'NEXT',
    message: 'Tutorial: Alien Scrapyard is a competitive build game. Place the right blocks before time runs out, beat the other players, and earn points, scrap and crystals.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 11 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 },
    desktopImage: 'fase1.png',
    mobileImage: 'fase1.png'
  },
  {
    action: 'NEXT',
    message: 'E changes the selected block. Use it to switch between cube, cylinder and pyramid before placing.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 14 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 },
    desktopImage: 'FaseE.png',
    mobileImage: 'FaseE_mov.png'
  },
  {
    action: 'NEXT',
    message: 'F auto-places the selected block. It is faster and easier, but gives fewer points and has a longer cooldown.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 14 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 },
    desktopImage: 'FaseF.png',
    mobileImage: 'FaseF_mov.png'
  },
  {
    action: 'NEXT',
    message: 'Tap or click a matching floating slot to place manually. Manual placement gives the highest score.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 14 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 },
    desktopImage: 'faseclick.png',
    mobileImage: 'faseclick.png'
  },
  {
    action: 'NEXT',
    message: 'Artifacts are equipped from your inventory and used with 1 and 2 during active build. They are consumed when used.',
    cameraPosition: { x: SCENE_CENTER.x, y: 13, z: SCENE_CENTER.z + 14 },
    cameraRotation: { pitch: 25, yaw: 180, roll: 0 },
    desktopImage: 'tutorial_artefactos.png',
    mobileImage: 'tutorial_artefactos.png'
  },
  {
    action: 'NEXT',
    message: 'The artifact shop lets you spend crystals on temporary tools. Buy artifacts there, equip them from your inventory, and use them to improve your score in real rounds.',
    cameraPosition: { x: 18, y: 13, z: 18 },
    cameraRotation: { pitch: 22, yaw: -41, roll: 0 }
  },
  {
    action: 'COMPLETE',
    message: 'Practice freely: E changes block, F auto-places, tap/click places manually for extra points, and artifacts give temporary advantages. Press READY when you are ready to compete.',
    cameraPosition: { x: 37, y: 4.7, z: 5.7 },
    cameraRotation: { pitch: 10, yaw: 0, roll: 0 }
  }
]

const PRACTICE_HINTS = [
  `Manual points: Cube ${POINTS_MANUAL_PIECE.CUBE}, Cylinder ${POINTS_MANUAL_PIECE.CYLINDER}, Pyramid ${POINTS_MANUAL_PIECE.CONE}.`,
  'Auto-place gives fewer points, but helps you play faster on mobile.',
  'Artifacts are equipped from inventory and used with 1 and 2 during active build.',
  'The artifact shop sells temporary tools. Use them to gain an advantage during a round.',
  'Tap or click matching floating slots for the best score. F is easier but gives fewer points.'
]
function currentTutorialGuideStep(): TutorialGuideStep | null {
  return tutorialGuideActive ? TUTORIAL_GUIDE_STEPS[Math.min(tutorialGuideStep, TUTORIAL_GUIDE_STEPS.length - 1)] : null
}

function currentTutorialAction(): TutorialGuideAction | null {
  return currentTutorialGuideStep()?.action ?? null
}

function allowTutorialAction(action: TutorialGuideAction): boolean {
  if (!tutorialGuideActive) return true
  if (currentTutorialAction() === action) return true

  const menuActions: TutorialGuideAction[] = ['PROFILE', 'RANKING', 'INVENTORY']
  if (!menuActions.includes(action)) return false

  const currentAction = currentTutorialAction()
  const menuFlowActions: TutorialGuideAction[] = ['PROFILE', 'RANKING', 'INVENTORY', 'ARTIFACT_1', 'ARTIFACT_2', 'ARTIFACT_REVIEW']
  if (!currentAction || !menuFlowActions.includes(currentAction)) return false

  const requestedStep = TUTORIAL_GUIDE_STEPS.findIndex((step) => step.action === action)
  return requestedStep >= 0 && requestedStep < tutorialGuideStep
}
function tutorialPieceStepComplete(): boolean {
  return tutorialPieceKeyChanged && tutorialPieceButtonChanged
}

function markTutorialPieceAction(source: TutorialPieceSource): void {
  const step = currentTutorialGuideStep()
  if (!step) return
  if (step.action === 'PIECE' && source === 'key') {
    tutorialPieceKeyPresses += 1
    tutorialPieceKeyChanged = tutorialPieceKeyPresses >= 2
  }
  if (step.action === 'PIECE_BUTTONS' && source === 'button') {
    tutorialPieceButtonPresses += 1
    tutorialPieceButtonChanged = tutorialPieceButtonPresses >= 1
  }
}
const TUTORIAL_PRACTICE_ORIGIN = Vector3.create(3.4, 0, 9.1)
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

function removeTutorialPracticeLaunch(index: number): void {
  const launch = tutorialPracticeLaunches[index]
  if (!launch) return
  try { engine.removeEntity(launch.entity) } catch (_) {}
  tutorialPracticeLaunches.splice(index, 1)
}

function clearTutorialPracticeLaunches(): void {
  for (let index = tutorialPracticeLaunches.length - 1; index >= 0; index--) {
    removeTutorialPracticeLaunch(index)
  }
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
  clearTutorialPracticeLaunches()
  tutorialPracticeNoCooldownUntil = 0
  tutorialPracticeDoublePlaceUntil = 0
}

function tutorialPracticeLaunchStart(target: Vector3): Vector3 {
  const fallback = Vector3.create(target.x, target.y + 2.2, target.z + 3.5)
  if (!Transform.has(engine.PlayerEntity)) return fallback

  const player = Transform.get(engine.PlayerEntity).position
  const dx = target.x - player.x
  const dz = target.z - player.z
  const distance = Math.max(0.001, Math.sqrt(dx * dx + dz * dz))
  const sideX = -dz / distance
  const sideZ = dx / distance
  return Vector3.create(
    player.x + (dx / distance) * 0.06 + sideX * 0.32,
    player.y + 1.35,
    player.z + (dz / distance) * 0.06 + sideZ * 0.32
  )
}

function spawnTutorialPracticeLaunch(slot: SlotDefinition): void {
  const target = tutorialPracticeSlotPosition(slot)
  const start = tutorialPracticeLaunchStart(target)
  const entity = engine.addEntity()
  const scale = Vector3.scale(tutorialPracticeSlotScale(slot), 0.9)
  const dx = target.x - start.x
  const dz = target.z - start.z
  const distance = Math.sqrt(dx * dx + dz * dz)

  Transform.create(entity, {
    position: start,
    scale,
    rotation: tutorialPracticePartRotation(slot.requiredPart)
  })
  GltfContainer.create(entity, {
    src: PART_GLB[slot.requiredPart],
    visibleMeshesCollisionMask: 0,
    invisibleMeshesCollisionMask: 0
  })

  tutorialPracticeLaunches.push({
    entity,
    start,
    target,
    scale,
    rotation: tutorialPracticePartRotation(slot.requiredPart),
    age: 0,
    duration: 0.75,
    arcHeight: Math.max(1.35, Math.min(4.2, distance * 0.22))
  })

  while (tutorialPracticeLaunches.length > 8) removeTutorialPracticeLaunch(0)
}

function updateTutorialPracticeLaunches(dt: number): void {
  const safeDt = Math.min(Math.max(dt, 0), 0.1)
  for (let index = tutorialPracticeLaunches.length - 1; index >= 0; index--) {
    const launch = tutorialPracticeLaunches[index]
    launch.age += safeDt
    const progress = Math.min(1, launch.age / launch.duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    const arc = Math.sin(progress * Math.PI) * launch.arcHeight

    if (!Transform.has(launch.entity)) {
      tutorialPracticeLaunches.splice(index, 1)
      continue
    }

    const transform = Transform.getMutable(launch.entity)
    transform.position = Vector3.create(
      launch.start.x + (launch.target.x - launch.start.x) * eased,
      launch.start.y + (launch.target.y - launch.start.y) * eased + arc,
      launch.start.z + (launch.target.z - launch.start.z) * eased
    )
    const pulse = 0.86 + Math.sin(progress * Math.PI) * 0.18
    transform.scale = Vector3.create(
      launch.scale.x * pulse,
      launch.scale.y * pulse,
      launch.scale.z * pulse
    )
    transform.rotation = Quaternion.multiply(
      launch.rotation,
      Quaternion.fromEulerDegrees(progress * 180, progress * 260, progress * 90)
    )

    if (progress >= 1) removeTutorialPracticeLaunch(index)
  }
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
    newRelativePosition: { x: 3.4, y: 0, z: 2.6 },
    cameraTarget: { x: TUTORIAL_PRACTICE_ORIGIN.x, y: TUTORIAL_PRACTICE_ORIGIN.y + 2.4, z: TUTORIAL_PRACTICE_ORIGIN.z },
    avatarTarget: { x: TUTORIAL_PRACTICE_ORIGIN.x, y: TUTORIAL_PRACTICE_ORIGIN.y + 1.4, z: TUTORIAL_PRACTICE_ORIGIN.z }
  }).catch((error) => console.log(`[TUTORIAL] practice move failed: ${error}`))
}

function resetTutorialPracticeIfFull(): void {
  const fullMask = (1 << TUTORIAL_PRACTICE_SLOTS.length) - 1
  if (tutorialPracticePlacedMask !== fullMask) return
  showFeedback('Practice template complete - restarting')
  setTimeout(() => {
    if (!tutorialPracticeAvailable()) return
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

function tutorialPracticeAvailable(): boolean {
  const action = currentTutorialAction()
  return tutorialGuideActive && action !== null && action !== 'NEXT'
}

function tutorialPracticeCommitSlot(slotIndex: number, mode: PlacementMode, applyCooldown = true, allowDouble = true): void {
  const slot = TUTORIAL_PRACTICE_SLOTS[slotIndex]
  if (!slot || ((tutorialPracticePlacedMask >> slotIndex) & 1) === 1) return
  tutorialPracticePlacedMask |= 1 << slotIndex
  spawnTutorialPracticeLaunch(slot)
  tutorialPracticeFlashSlot(slot, Color4.create(1, 1, 0.5, 1))
  playSuccess()
  if (applyCooldown) startPlacementCooldown(slot.requiredPart, mode)

  if (allowDouble && Date.now() < tutorialPracticeDoublePlaceUntil) {
    const extraIndex = tutorialPracticeOpenSlotIndex(slot.requiredPart)
    if (extraIndex >= 0) tutorialPracticeCommitSlot(extraIndex, mode, false, false)
  }

  renderTutorialPractice()
  resetTutorialPracticeIfFull()
}

function tutorialPracticeTrySlot(slot: SlotDefinition): void {
  if (!tutorialPracticeAvailable()) return
  const slotIndex = TUTORIAL_PRACTICE_SLOTS.findIndex((item) => item.slotId === slot.slotId)
  if (slotIndex < 0) return
  if (((tutorialPracticePlacedMask >> slotIndex) & 1) === 1) return

  const now = Date.now()
  const noCooldownActive = now < tutorialPracticeNoCooldownUntil
  const lastClick = tutorialPracticeRecentClicks.get(slot.slotId) ?? 0
  if (!noCooldownActive && now - lastClick < PLACEMENT_COOLDOWN_MS.manual[slot.requiredPart]) return

  const selectedPart = getSelectedPart()
  if (selectedPart !== slot.requiredPart) {
    tutorialPracticeFlashSlot(slot, Color4.create(1, 0.1, 0.1, 1))
    onWrongPart(slot.requiredPart)
    return
  }
  if (!noCooldownActive && !canStartPlacementCooldown(selectedPart, 'manual')) return

  tutorialPracticeRecentClicks.set(slot.slotId, now)
  tutorialPracticeCommitSlot(slotIndex, 'manual')
  advanceTutorialPracticeGuide('MANUAL')
}

function tutorialPracticePlacePart(part: PartType, mode: PlacementMode): boolean {
  const slotIndex = tutorialPracticeOpenSlotIndex(part)
  if (slotIndex < 0) return false
  tutorialPracticeCommitSlot(slotIndex, mode)
  return true
}

function tutorialPracticeOpenSlotIndex(part: PartType): number {
  return TUTORIAL_PRACTICE_SLOTS.findIndex((item, index) => {
    const occupied = ((tutorialPracticePlacedMask >> index) & 1) === 1
    return !occupied && item.requiredPart === part
  })
}

function tutorialPracticePlaceSelectedPart(): void {
  if (!tutorialPracticeAvailable()) return
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

function reloadTutorialArtifact(slotIndex: number, preferredType: ArtifactType): void {
  let replacement = preferredType
  if (tutorialArtifactCount(replacement) <= 0) {
    const fallback = TUTORIAL_ARTIFACT_TYPES.find((artifact) => tutorialArtifactCount(artifact) > 0)
    if (!fallback) {
      tutorialEquippedArtifacts.splice(slotIndex, 1)
      tutorialEquippedArtifactCounts[slotIndex] = 0
      return
    }
    replacement = fallback
  }

  const stackCount = tutorialArtifactCount(replacement)
  tutorialArtifactInventoryCounts[replacement] = 0
  tutorialEquippedArtifacts[slotIndex] = replacement
  tutorialEquippedArtifactCounts[slotIndex] = stackCount
}

function unequipTutorialArtifact(slotIndex: number): void {
  const artifact = tutorialEquippedArtifacts[slotIndex]
  const equippedCount = Math.max(0, tutorialEquippedArtifactCounts[slotIndex] ?? 0)
  if (!artifact || equippedCount <= 0) return

  tutorialArtifactInventoryCounts[artifact] = tutorialArtifactCount(artifact) + equippedCount
  tutorialEquippedArtifacts[slotIndex] = undefined
  tutorialEquippedArtifactCounts[slotIndex] = 0
}

function useTutorialPracticeArtifact(slotIndex: number): void {
  if (!tutorialGuideActive || currentTutorialAction() !== 'COMPLETE') return
  const artifact = tutorialEquippedArtifacts[slotIndex]
  const equippedCount = tutorialEquippedArtifactCounts[slotIndex] ?? 0
  if (!artifact || equippedCount <= 0) {
    showFeedback('Equip an artifact first')
    return
  }
  tutorialEquippedArtifactCounts[slotIndex] = equippedCount - 1
  if (tutorialEquippedArtifactCounts[slotIndex] <= 0) {
    tutorialEquippedArtifacts[slotIndex] = undefined
    tutorialEquippedArtifactCounts[slotIndex] = 0
  }

  if (artifact === 'NO_COOLDOWN') {
    tutorialPracticeNoCooldownUntil = Date.now() + ARTIFACT_DURATION_MS
    showFeedback('No cooldown active')
  } else if (artifact === 'DOUBLE_PLACE') {
    tutorialPracticeDoublePlaceUntil = Date.now() + ARTIFACT_DURATION_MS
    showFeedback('Double place active')
  } else if (artifact === 'TRIPLE_PLACE') {
    const placed = [
      tutorialPracticeOpenSlotIndex('CUBE'),
      tutorialPracticeOpenSlotIndex('CYLINDER'),
      tutorialPracticeOpenSlotIndex('CONE')
    ]
    for (const index of placed) {
      if (index >= 0) tutorialPracticeCommitSlot(index, 'auto', false, false)
    }
    startPlacementCooldown('CUBE', 'auto')
    showFeedback('Triple place used')
  } else if (artifact === 'COMPLETE_TEMPLATE') {
    for (let index = 0; index < TUTORIAL_PRACTICE_SLOTS.length; index++) {
      tutorialPracticeCommitSlot(index, 'auto', false, false)
    }
    startPlacementCooldown('CUBE', 'auto')
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
  if (step?.action === 'PIECE' || step?.action === 'F' || step?.action === 'PIECE_BUTTONS' || step?.action === 'COMPLETE') {
    profilePanelOpen = false
    rankingPanelOpen = false
    inventoryPanelOpen = false
    activePlayersPanelOpen = false
    shopPanelOpen = false
    communityPanelOpen = false
  }
  closeLeaderboardCamera()
  setCarriedVisible(step !== null && step.action !== 'NEXT')
  if (step && step.action !== 'NEXT') {
    if (step.action === 'COMPLETE') {
      tutorialPracticeGuideStep = 0
      tutorialPracticeNoCooldownUntil = 0
      tutorialPracticeDoublePlaceUntil = 0
      clearTutorialPractice()
      if (tutorialEquippedArtifacts.length < 2 || (tutorialEquippedArtifactCounts[0] ?? 0) <= 0 || (tutorialEquippedArtifactCounts[1] ?? 0) <= 0) {
        tutorialEquippedArtifacts = ['TRIPLE_PLACE', 'COMPLETE_TEMPLATE']
        tutorialEquippedArtifactCounts = [10, 10]
        tutorialArtifactInventoryCounts.TRIPLE_PLACE = 0
        tutorialArtifactInventoryCounts.COMPLETE_TEMPLATE = 0
      }
    }
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

function startTutorialGuide(joinAfter: boolean, skipAllowed = joinAfter): void {
  if (!TUTORIAL_ENABLED) return
  const snapshot = getClientSnapshot()
  if (snapshot.playerStatus === 'ACTIVE' || snapshot.playerStatus === 'QUEUED') requestLeaveGame()
  tutorialVisible = false
  tutorialModeActive = false
  tutorialMandatory = false
  joinPromptVisible = false
  tutorialGuideActive = true
  tutorialGuideStep = 0
  tutorialGuideJoinAfter = joinAfter
  tutorialGuideSkipAllowed = skipAllowed
  tutorialGuideQueued = false
  tutorialPieceKeyChanged = false
  tutorialPieceButtonChanged = false
  tutorialFKeyPressed = false
  tutorialPieceKeyPresses = 0
  tutorialPieceButtonPresses = 0
  tutorialFKeyPresses = 0
  tutorialPracticeGuideStep = 0
  tutorialPracticeNoCooldownUntil = 0
  tutorialPracticeDoublePlaceUntil = 0
  tutorialEquippedArtifacts = []
  tutorialEquippedArtifactCounts = [0, 0]
  tutorialArtifactInventoryCounts = { NO_COOLDOWN: 10, DOUBLE_PLACE: 10, TRIPLE_PLACE: 10, COMPLETE_TEMPLATE: 10 }
  profilePanelOpen = false
  rankingPanelOpen = false
  inventoryPanelOpen = false
  activePlayersPanelOpen = false
  shopPanelOpen = false
  communityPanelOpen = false
  updateTutorialCamera()
}

function finishTutorialGuide(joinGameNow = false): void {
  const shouldJoin = joinGameNow || tutorialGuideJoinAfter
  tutorialGuideActive = false
  tutorialModeActive = false
  tutorialVisible = false
  tutorialGuideStep = 0
  tutorialGuideJoinAfter = false
  tutorialGuideSkipAllowed = false
  tutorialGuideQueued = false
  tutorialPieceKeyChanged = false
  tutorialPieceButtonChanged = false
  tutorialFKeyPressed = false
  tutorialPieceKeyPresses = 0
  tutorialPieceButtonPresses = 0
  tutorialFKeyPresses = 0
  releaseTutorialCamera()
  tutorialPracticeGuideStep = 0
  tutorialPracticeNoCooldownUntil = 0
  tutorialPracticeDoublePlaceUntil = 0
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
  tutorialFKeyPressed = false
  tutorialPieceKeyPresses = 0
  tutorialPieceButtonPresses = 0
  tutorialFKeyPresses = 0
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
  if (tutorialGuideActive) {
    profilePanelOpen = false
    rankingPanelOpen = false
    inventoryPanelOpen = false
    activePlayersPanelOpen = false
    shopPanelOpen = false
    communityPanelOpen = false
    artifactDetail = null
    tutorialVisible = false
    return
  }
  profilePanelOpen = false
  rankingPanelOpen = false
  inventoryPanelOpen = false
  activePlayersPanelOpen = false
  shopPanelOpen = false
  communityPanelOpen = false
  artifactDetail = null
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
  startTutorialGuide(true, true)
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
  communityPanelOpen = false
  artifactDetail = null
}

export function openInventoryPanel(): void {
  inventoryPanelOpen = true
  shopPanelOpen = false
  profilePanelOpen = false
  rankingPanelOpen = false
  activePlayersPanelOpen = false
  communityPanelOpen = false
}

export function openProfilePanel(): void {
  profilePanelOpen = true
  rankingPanelOpen = false
  inventoryPanelOpen = false
  activePlayersPanelOpen = false
  shopPanelOpen = false
  communityPanelOpen = false
  artifactDetail = null
}

export function openRankingPanel(): void {
  rankingPanelOpen = true
  profilePanelOpen = false
  inventoryPanelOpen = false
  activePlayersPanelOpen = false
  shopPanelOpen = false
  communityPanelOpen = false
  artifactDetail = null
  requestLeaderboards()
}

export function openCommunityPanel(): void {
  communityPanelOpen = true
  profilePanelOpen = false
  rankingPanelOpen = false
  inventoryPanelOpen = false
  activePlayersPanelOpen = false
  shopPanelOpen = false
  artifactDetail = null
}

export function openTutorialPanel(): void {
  startTutorialGuide(false, true)
}

export function getSelectedPart(): PartType {
  return PART_TYPES[selectedIndex]
}

export function showFeedback(text: string): void {
  feedbackText = text
  feedbackTimer = FEEDBACK_DURATION
}

export function onWrongPart(required: PartType): void {
  showFeedback(`Wrong block - need ${PART_LABEL[required]}`)
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
    if (action === 'F' && source !== 'key') return
    if (action === 'PIECE_BUTTONS' && source !== 'button' && source !== 'key') return
    if (action !== 'PIECE' && action !== 'F' && action !== 'PIECE_BUTTONS' && action !== 'COMPLETE') return
  }
  selectedIndex = index
  markTutorialPieceAction(source)
  applyShoulderVisibility()
  playPress()
  if (tutorialGuideActive && (currentTutorialAction() === 'COMPLETE' || currentTutorialAction() === 'PIECE_BUTTONS') && source === 'button') {
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

export function canStartPlacementCooldown(part: PartType, mode: PlacementMode): boolean {
  const snapshot = getClientSnapshot()
  if (Date.now() < snapshot.noCooldownUntil) return true
  const requiredCooldown = Math.max(lastPlacementCooldownMs, PLACEMENT_COOLDOWN_MS[mode][part])
  return Date.now() - lastPlacementCooldownAt >= requiredCooldown
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
const GAME_MUSIC_CLIP = 'assets/sounds/ambient.mp3'
const NON_GAME_MUSIC_CLIPS = [
  'assets/sounds/Alien scrapyard (2).mp3',
  'assets/sounds/Alien scrapyard (3).mp3'
]
const MUSIC_VOLUME = 0.35
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

export function playPress(): void {
  pressCursor = playVoice(pressVoices, pressCursor, 'assets/sounds/pressE.mp3', 1.0)
}

function initAudio(): void {
  if (ambientEntity !== (0 as Entity)) return
  for (let i = 0; i < SFX_VOICES; i++) {
    successVoices.push(createVoiceEntity())
    pressVoices.push(createVoiceEntity())
    wrongVoices.push(createVoiceEntity())
  }
  ambientEntity = engine.addEntity()
  Transform.create(ambientEntity, {
    position: Vector3.create(SCENE_CENTER.x, SCENE_CENTER.y + 2, SCENE_CENTER.z),
    rotation: Quaternion.Identity(),
    scale: Vector3.One()
  })
  updateMusic(false, 0)
}

function updateMusic(isPlaying: boolean, dt: number): void {
  if (ambientEntity === (0 as Entity)) return
  if (musicMuted) {
    if (currentMusicClip === '__muted__') return
    currentMusicClip = '__muted__'
    try {
      AudioSource.createOrReplace(ambientEntity, {
        audioClipUrl: GAME_MUSIC_CLIP,
        playing: false,
        loop: true,
        volume: 0,
        global: true
      })
    } catch (_) {}
    return
  }

  if (isPlaying) {
    nonGameMusicElapsed = 0
  } else {
    nonGameMusicElapsed += Math.max(0, dt)
  }

  const clip = isPlaying
    ? GAME_MUSIC_CLIP
    : NON_GAME_MUSIC_CLIPS[Math.floor(nonGameMusicElapsed / 120) % NON_GAME_MUSIC_CLIPS.length]

  if (clip === currentMusicClip) return
  currentMusicClip = clip
  try {
    AudioSource.createOrReplace(ambientEntity, {
      audioClipUrl: clip,
      playing: true,
      loop: true,
      volume: MUSIC_VOLUME,
      global: true
    })
  } catch (_) {
    currentMusicClip = ''
  }
}

function toggleMusic(): void {
  musicMuted = !musicMuted
  currentMusicClip = ''
  showFeedback(musicMuted ? 'Music off' : 'Music on')
  updateMusic(getClientSnapshot().playerStatus === 'ACTIVE', 0)
}

export function initShoulder(): void {
  if (shoulderEntities.length > 0) return

  for (let i = 0; i < PART_TYPES.length; i++) {
    const entity = engine.addEntity()
    const show = carriedVisible && i === selectedIndex
    Transform.create(entity, {
      position: Vector3.create(-0.5, 1.5, -0.85),
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
  if (needsDailyTutorial() || !tutorialShownForParticipation) {
    startTutorialGuide(true, true)
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
  communityPanelOpen = false
  requestLeaveGame()
}

export function hudInputSystem(_dt: number): void {
  const snapshot = getClientSnapshot()

  const primaryPressed = inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)
  const secondaryPressed = inputSystem.isTriggered(InputAction.IA_SECONDARY, PointerEventType.PET_DOWN)
  const menuOpen = profilePanelOpen || rankingPanelOpen || inventoryPanelOpen || activePlayersPanelOpen || shopPanelOpen || communityPanelOpen || tutorialVisible ||
    (snapshot.playerStatus === 'SPECTATOR' && joinPromptVisible)


  if (tutorialGuideActive) {
    const step = currentTutorialGuideStep()
    if (secondaryPressed && menuOpen) {
      closeGameUi()
      return
    }
    if (step?.action === 'COMPLETE') {
      if (inputSystem.isTriggered(InputAction.IA_ACTION_3, PointerEventType.PET_DOWN)) useTutorialPracticeArtifact(0)
      if (inputSystem.isTriggered(InputAction.IA_ACTION_4, PointerEventType.PET_DOWN)) useTutorialPracticeArtifact(1)
      if (primaryPressed) selectPart((selectedIndex + 1) % PART_TYPES.length, false, 'key')
      if (secondaryPressed) tutorialPracticePlaceSelectedPart()
      return
    }
    if (primaryPressed && step?.action === 'NEXT') completeTutorialGuideAction('NEXT')
    else if (primaryPressed && step?.action === 'ARTIFACT_REVIEW') completeTutorialGuideAction('ARTIFACT_REVIEW')
    else if (primaryPressed && (step?.action === 'PIECE' || step?.action === 'F' || step?.action === 'PIECE_BUTTONS')) selectPart((selectedIndex + 1) % PART_TYPES.length, false, 'key')
    else if (secondaryPressed && step?.action === 'F') {
      tutorialFKeyPresses += 1
      tutorialPracticePlaceSelectedPart()
      tutorialFKeyPressed = tutorialFKeyPresses >= 2
      showFeedback('F auto-places the selected block during active build')
    }
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
  try { updateMusic(snap.playerStatus === 'ACTIVE', dt) } catch (_) {}
  if (snap.profileLoaded && needsDailyTutorial() && !tutorialAutoStarted && !tutorialGuideActive) {
    tutorialAutoStarted = true
    startTutorialGuide(false, false)
  }
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
      communityPanelOpen = false
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
  updateTutorialPracticeLaunches(dt)

  floatTime += dt
  const shoulderY = 1.5 + Math.sin(floatTime * 2.5) * 0.06
  for (const entity of shoulderEntities) {
    try {
      Transform.getMutable(entity).position = Vector3.create(-0.5, shoulderY, -0.85)
    } catch (_) {}
  }
}

// UI
const PART_UI_COLOR: Record<PartType, { r: number; g: number; b: number; a: number }> = {
  CUBE:     { r: 0.2, g: 0.5, b: 1,    a: 1 },
  CYLINDER: { r: 1,   g: 0.2, b: 0.2,  a: 1 },
  CONE:     { r: 1,   g: 0.85, b: 0,   a: 1 }
}

const UI_IMAGE_ROOT = 'assets/images/ui/'
const IMAUI_IMAGE_ROOT = 'assets/images/imaui/'
const INVENTORY_IMAGE_ROOT = 'assets/images/inventario/'
const avatarSnapshots = new Map<string, { body?: string; face?: string; loading?: boolean }>()

function uiImage(name: string) {
  return {
    textureMode: 'stretch' as const,
    texture: { src: UI_IMAGE_ROOT + name, filterMode: 'tri-linear' as const }
  }
}

function uiVariant(baseName: string, compactUi: boolean) {
  return uiImage(`${baseName}_${compactUi ? 'mobile' : 'desktop'}.png`)
}

function loadAvatarSnapshot(address: string): void {
  const key = address.toLowerCase()
  const cached = avatarSnapshots.get(key)
  if (cached?.loading || cached?.body || cached?.face) return
  avatarSnapshots.set(key, { loading: true })
  void fetch(`https://peer.decentraland.org/lambdas/profiles/${key}`)
    .then((response) => response.json())
    .then((data) => {
      const avatar = Array.isArray(data?.avatars) ? data.avatars[0]?.avatar : undefined
      const snapshots = avatar?.snapshots ?? {}
      avatarSnapshots.set(key, {
        body: typeof snapshots.body === 'string' ? snapshots.body : undefined,
        face: typeof snapshots.face256 === 'string' ? snapshots.face256 : typeof snapshots.face === 'string' ? snapshots.face : undefined
      })
    })
    .catch(() => avatarSnapshots.set(key, {}))
}

function avatarBackground(address?: string, shot: 'face' | 'body' = 'face') {
  if (!address) return { color: { r: 0.42, g: 0.36, b: 0.5, a: 1 } }
  loadAvatarSnapshot(address)
  const snapshot = avatarSnapshots.get(address.toLowerCase())
  const src = shot === 'body' ? snapshot?.body ?? snapshot?.face : snapshot?.face
  return src
    ? { textureMode: 'stretch' as const, texture: { src, filterMode: 'tri-linear' as const } }
    : { avatarTexture: { userId: address, filterMode: 'tri-linear' as const } }
}

function clickFlash(key: string, tint: 'green' | 'red' = 'green'): void {
  clickFlashKey = key
  clickFlashUntil = Date.now() + CLICK_FLASH_MS
  clickFlashTint = tint === 'red'
    ? { r: 1, g: 0.12, b: 0.18, a: 0.46 }
    : { r: 0.38, g: 1, b: 0.62, a: 0.4 }
  playPress()
}

function clickFlashOverlay(key: string) {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        display: clickFlashKey === key && Date.now() < clickFlashUntil ? 'flex' : 'none'
      }}
      uiBackground={{ color: clickFlashTint }}
    />
  )
}

function imauiImage(name: string) {
  return {
    textureMode: 'stretch' as const,
    texture: { src: IMAUI_IMAGE_ROOT + name, filterMode: 'tri-linear' as const }
  }
}

function inventoryImage(name: string) {
  return {
    textureMode: 'stretch' as const,
    texture: { src: INVENTORY_IMAGE_ROOT + name, filterMode: 'tri-linear' as const }
  }
}

function tutorialGuideImage(step: TutorialGuideStep | null, compactUi: boolean): string | null {
  if (!step) return null
  return compactUi ? (step.mobileImage ?? step.desktopImage ?? null) : (step.desktopImage ?? step.mobileImage ?? null)
}
function partIcon(part: PartType) {
  return uiImage(`${part.toLowerCase()}.png`)
}

function artifactThumbnail(artifact: ArtifactType, compactUi: boolean) {
  const suffix = compactUi ? 'Mobile' : 'Desktop'
  if (artifact === 'NO_COOLDOWN') return inventoryImage(`Rayo_${suffix}-${compactUi ? 76 : 75}.png`)
  if (artifact === 'DOUBLE_PLACE') return inventoryImage(`doble_${suffix}-${compactUi ? 78 : 77}.png`)
  if (artifact === 'TRIPLE_PLACE') return inventoryImage(`triple_${suffix}-${compactUi ? 80 : 79}.png`)
  return inventoryImage(`full_${suffix}-${compactUi ? 82 : 81}.png`)
}

function inventoryArtifactImageSize(artifact: ArtifactType, compactUi: boolean) {
  const scale = artifact === 'DOUBLE_PLACE' ? 2 : 3
  const reduction = 0.85
  const width = (compactUi ? 176 : 136) * scale * reduction
  const height = (compactUi ? 59 : 51) * scale * reduction
  return { width, height }
}

const INVENTORY_OBJECT_SLOTS = Array.from({ length: 4 }, (_, index) => ({ id: `object-slot-${index}`, index }))

const EQUIPPED_ARTIFACT_SLOTS = [
  { id: 'artifact-slot-1', label: '1', index: 0 },
  { id: 'artifact-slot-2', label: '2', index: 1 }
]

const ARTIFACT_SHOP_ITEMS: ArtifactType[] = [...TUTORIAL_ARTIFACT_TYPES].sort((a, b) => ARTIFACT_PRICE_CRYSTALS[a] - ARTIFACT_PRICE_CRYSTALS[b])

function artifactShortLabel(artifact: ArtifactType | undefined): string {
  if (!artifact) return 'EMPTY'
  if (artifact === 'NO_COOLDOWN') return 'NO CD'
  if (artifact === 'DOUBLE_PLACE') return 'DOUBLE'
  if (artifact === 'TRIPLE_PLACE') return 'TRIPLE'
  return 'FULL'
}

function artifactDescription(artifact: ArtifactType): string {
  if (artifact === 'NO_COOLDOWN') return '10s without placement cooldown'
  if (artifact === 'DOUBLE_PLACE') return '10s places a second matching block'
  if (artifact === 'TRIPLE_PLACE') return 'Places 3 blocks: cube, cylinder and pyramid'
  return 'Completes the current template instantly'
}

function countArtifacts(list: Array<ArtifactType | undefined | null>, type: ArtifactType): number {
  return list.filter((item) => item === type).length
}

function firstArtifactIndex(list: ArtifactType[], type: ArtifactType): number {
  return list.findIndex((item) => item === type)
}

function tutorialArtifactCount(type: ArtifactType): number {
  return tutorialArtifactInventoryCounts[type] ?? 0
}

function displayedArtifactCount(snap: ReturnType<typeof getClientSnapshot>, artifact: ArtifactType, tutorialActive: boolean): number {
  if (tutorialActive) return tutorialArtifactCount(artifact) + countArtifacts(tutorialEquippedArtifacts, artifact)
  return countArtifacts(snap.artifactInventory, artifact) + countArtifacts(snap.equippedArtifacts, artifact)
}

function displayedEquippedArtifactCount(snap: ReturnType<typeof getClientSnapshot>, slotIndex: number, tutorialActive: boolean): number {
  if (tutorialActive) return Math.max(0, tutorialEquippedArtifactCounts[slotIndex] ?? 0)
  return Math.max(0, snap.equippedArtifactCounts[slotIndex] ?? 0)
}

function artifactSlotLabel(artifact: ArtifactType | undefined, count: number): string {
  if (!artifact) return 'EMPTY'
  return `${artifactShortLabel(artifact)} x${Math.max(1, count)}`
}

function activateEquippedArtifactSlot(slotIndex: number, artifact: ArtifactType | undefined, tutorialCompleteVisible: boolean): void {
  if (!artifact) {
    openInventoryPanel()
    return
  }
  if (tutorialCompleteVisible) useTutorialPracticeArtifact(slotIndex)
  else requestUseArtifact(slotIndex)
}

function visibleInventoryArtifact(index: number, inventory: ArtifactType[]): ArtifactType | undefined {
  return TUTORIAL_ARTIFACT_TYPES[index]
}

function visibleEquippedArtifacts(snap: ReturnType<typeof getClientSnapshot>, tutorialCompleteVisible: boolean): Array<ArtifactType | undefined> {
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
  return PRACTICE_HINTS[Math.floor(floatTime / 5) % PRACTICE_HINTS.length]
}

function phaseLabel(phase: RoundPhase, snap: ReturnType<typeof getClientSnapshot>): string {
  switch (phase) {
    case 'BUILD':          return `BUILD THE ${snap.templateId} - ${snap.secondsLeft}s`
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
    const roster = snap.players
    const rosterHeaderHeight = compactUi ? 68 : 52
    const rosterRowHeight = compactUi ? 48 : 30
    const rosterHeight = rosterHeaderHeight + Math.max(1, roster.length) * rosterRowHeight
    const cinematicBarWidth = compactUi ? 1400 : 1200
    const levelProgress = getLevelProgress(snap.totalXp)
    const excellence = snap.roundsPlayed > 0 ? Math.round(snap.totalXp / snap.roundsPlayed) : 0
    const dominance = snap.roundsPlayed > 0 ? Math.round((snap.mvpAwards / snap.roundsPlayed) * 100) : 0
    const scraperTitle = getScraperTitle(snap.level)
    const currentLevelFloor = LEVEL_THRESHOLDS[Math.max(0, Math.min(LEVEL_THRESHOLDS.length - 1, levelProgress.level - 1))]
    const nextLevelFloor = LEVEL_THRESHOLDS[Math.max(0, Math.min(LEVEL_THRESHOLDS.length - 1, levelProgress.level))]
    const playerProgressPct = levelProgress.isMaxLevel
      ? 100
      : Math.min(100, Math.max(0, Math.round(((snap.totalXp - currentLevelFloor) / Math.max(1, nextLevelFloor - currentLevelFloor)) * 100)))
    const levelPointsRequired = levelProgress.isMaxLevel ? Math.max(1, snap.totalXp) : Math.max(1, nextLevelFloor - currentLevelFloor)
    const levelPointsCurrent = levelProgress.isMaxLevel
      ? levelPointsRequired
      : Math.min(levelPointsRequired, Math.max(0, snap.totalXp - currentLevelFloor))
    const playerLevelLabel = `LEVEL ${levelProgress.level}`
    const playerProgressLabel = `${levelPointsCurrent} / ${levelPointsRequired} PTS`
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
    const reward = communityTierReward(snap.communityTier)
    const roundTopRows = [...roster]
      .sort((a, b) => b.roundPoints - a.roundPoints || b.correctPieces - a.correctPieces || a.name.localeCompare(b.name))
      .slice(0, 5)
    const roundMvpRow = roundTopRows.find((player) => player.name === snap.mvpName)
    const mvpBlocks = roundMvpRow?.correctPieces ?? 0
    const previousRoundCount = Math.max(0, snap.roundsPlayed - 1)
    const previousExcellence = previousRoundCount > 0
      ? Math.round(Math.max(0, snap.totalXp - snap.roundPoints) / previousRoundCount)
      : 0
    const ownMvpThisRound = (roundMvpRow?.address ?? '').toLowerCase() === snap.playerAddress.toLowerCase()
    const previousMvpAwards = Math.max(0, snap.mvpAwards - (ownMvpThisRound ? 1 : 0))
    const previousDominance = previousRoundCount > 0
      ? Math.round((previousMvpAwards / previousRoundCount) * 100)
      : 0
    const excellenceTrend = excellence > previousExcellence ? 'UP' : excellence < previousExcellence ? 'DOWN' : 'SAME'
    const dominanceTrend = dominance > previousDominance ? 'UP' : dominance < previousDominance ? 'DOWN' : 'SAME'
    const tutorialSlide = TUTORIAL_SLIDES[tutorialStep]
    const selectedPart = PART_TYPES[selectedIndex]
    const guideStep = currentTutorialGuideStep()
    const tutorialCompleteVisible = tutorialGuideActive && guideStep?.action === 'COMPLETE'
    const tutorialImage = tutorialGuideImage(guideStep, compactUi)
    const tutorialImageVisible = tutorialGuideActive && tutorialImage !== null && !(guideStep?.action === 'PIECE' && tutorialPieceKeyPresses > 0) && !(guideStep?.action === 'F' && tutorialFKeyPresses > 0) && !(guideStep?.action === 'PIECE_BUTTONS' && tutorialPieceButtonPresses > 0) && !tutorialCompleteVisible && !tutorialVisible && !inCinematic
    const tutorialReadyAvailable = true
    const tutorialSkipAvailable = tutorialGuideActive && tutorialGuideSkipAllowed && !tutorialCompleteVisible
    const displayedEquippedArtifacts = visibleEquippedArtifacts(snap, tutorialGuideActive)
    const detailArtifactCount = artifactDetail ? countArtifacts(snap.artifactInventory, artifactDetail) : 0
    const detailArtifactInventoryIndex = artifactDetail ? firstArtifactIndex(snap.artifactInventory, artifactDetail) : -1
    const displayedPartsAttached = tutorialCompleteVisible ? bitCount(tutorialPracticePlacedMask) : snap.partsAttached
    const displayedPartsRequired = tutorialCompleteVisible ? TUTORIAL_PRACTICE_SLOTS.length : snap.partsRequired
    const tutorialTipVisible = (tutorialGuideActive || tutorialModeActive || dailyTutorialNeeded || isQueued) && !tutorialCompleteVisible && !tutorialVisible && !inCinematic
    const guideAdvanceAvailable = guideStep !== null && (guideStep.action === 'NEXT' || guideStep.action === 'ARTIFACT_REVIEW' || (guideStep.action === 'PIECE' && tutorialPieceKeyChanged) || (guideStep.action === 'F' && tutorialFKeyPressed) || (guideStep.action === 'PIECE_BUTTONS' && tutorialPieceButtonChanged))
    const tutorialTip = tutorialGuideActive && guideStep !== null
      ? guideStep.message
      : dailyTutorialNeeded
      ? 'Tutorial: start the tutorial to learn the game before joining.'
      : isSpectator
      ? 'Tutorial: you are spectating. Press JOIN GAME when you want to enter the next round.'
      : isQueued
        ? `Waiting for the next round. ${tutorialPracticeMessage()}`
        : inBuild
          ? 'Tutorial: selected ' + PART_LABEL[selectedPart] + '. E changes block, F auto places, tap slots for full points.'
          : phase === 'BUILD_COMPLETE'
            ? 'Tutorial: round finished. Check your points in Profile and your artifacts in Inventory.'
            : 'Tutorial: follow the round phase and get ready for the next build.'
    const cooldownElapsedMs = Date.now() - lastPlacementCooldownAt
    const autoCooldownPct = Math.min(100, Math.round((cooldownElapsedMs / lastPlacementCooldownMs) * 100))
    const autoCooldownReady = autoCooldownPct >= 100
    const autoCooldownColor = PART_UI_COLOR[lastPlacementCooldownPart]
    const sidePanelWidth = compactUi ? 560 : 380
    const sidePanelRight = compactUi ? 18 : 48
    const expandedPanelRight = compactUi ? 700 : 48
    const fixedSummaryTop = compactUi ? 18 : 58
    const panelControlsTop = compactUi ? 162 : 164
    const activePlayersButtonTop = compactUi ? 226 : 226
    const expandedPanelTop = compactUi ? 76 : 210
    const tutorialMenuFocusVisible = tutorialGuideActive && (guideStep?.action === 'PROFILE' || guideStep?.action === 'RANKING' || guideStep?.action === 'INVENTORY')
    const rosterWidth = compactUi ? 430 : 300
    const artifactPanelOpen = inventoryPanelOpen || shopPanelOpen
    const inventoryArtifactCount = (artifact: ArtifactType): number => tutorialGuideActive ? tutorialArtifactCount(artifact) : countArtifacts(snap.artifactInventory, artifact)
    const canStoreArtifact = (_artifact: ArtifactType): boolean => true

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
          uiBackground={uiVariant('top_phase_bar', compactUi)}
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

        {/* Tutorial menu focus shade */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: '100%',
            height: '100%',
            display: tutorialMenuFocusVisible ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.58 } }}
        />
        {/* Player summary */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: fixedSummaryTop, right: sidePanelRight },
            width: sidePanelWidth,
            height: compactUi ? 128 : 92,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && snap.profileLoaded && showInformationPanels ? 'flex' : 'none'
          }}
          uiBackground={uiVariant('player_summary_fixed', compactUi)}
        >
          <Label
            value={snap.playerName}
            fontSize={font(24)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 42 : 30 }}
            textAlign='middle-center'
          />
          <Label
            value={scraperTitle}
            fontSize={font(17)}
            color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 38 : 24 }}
            textAlign='middle-center'
          />
          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 42 : 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Label
              value={`LEVEL: ${levelProgress.level}`}
              fontSize={font(18)}
              color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
              uiTransform={{ width: '47%', height: '100%' }}
              textAlign='middle-center'
            />
            <Label
              value={`CRYSTALS: ${snap.crystals}`}
              fontSize={font(18)}
              color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
              uiTransform={{ width: '40%', height: '100%' }}
              textAlign='middle-right'
            />
          </UiEntity>
        </UiEntity>

        {/* Inventory shortcut */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: panelControlsTop, right: sidePanelRight },
            width: sidePanelWidth,
            height: compactUi ? 64 : 46,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            display: !syncing && snap.profileLoaded && showInformationPanels ? 'flex' : 'none'
          }}
        >
          <UiEntity
            uiTransform={{ width: '26%', height: '100%', margin: { right: 8 }, alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: musicMuted
              ? { r: 0.48, g: 0.04, b: 0.08, a: 0.96 }
              : { r: 0.025, g: 0.2, b: 0.25, a: 0.96 }
            }}
            onMouseDown={() => {
              clickFlash('tab-music')
              toggleMusic()
            }}
          >
            <Label value={musicMuted ? 'MUSIC OFF' : 'MUSIC ON'} fontSize={font(12)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            {clickFlashOverlay('tab-music')}
          </UiEntity>
          <UiEntity
            uiTransform={{ width: '34%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={{ color: inventoryPanelOpen
              ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
              : { r: 0.025, g: 0.2, b: 0.25, a: 0.96 }
            }}
            onMouseDown={() => {
              clickFlash('tab-inventory')
              inventoryPanelOpen = !inventoryPanelOpen
              if (!inventoryPanelOpen) artifactDetail = null
              if (inventoryPanelOpen && currentTutorialAction() === 'INVENTORY') completeTutorialGuideAction('INVENTORY')
              profilePanelOpen = false
              rankingPanelOpen = false
              activePlayersPanelOpen = false
              shopPanelOpen = false
              communityPanelOpen = false
            }}
          >
            <Label value='INVENTORY' fontSize={font(15)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            {clickFlashOverlay('tab-inventory')}
          </UiEntity>
        </UiEntity>

        {/* Active players */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: activePlayersButtonTop, right: sidePanelRight },
            width: rosterWidth,
            height: rosterHeight,
            flexDirection: 'column',
            display: 'none'
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
            position: { top: activePlayersButtonTop, right: sidePanelRight },
            width: sidePanelWidth,
            height: compactUi ? 64 : 46,
            alignItems: 'center',
            justifyContent: 'center',
            display: 'none'
          }}
          uiBackground={{ color: activePlayersPanelOpen
            ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
            : { r: 0.02, g: 0.03, b: 0.09, a: 0.9 }
          }}
          onMouseDown={() => {
            if (tutorialGuideActive) return
            clickFlash('active-players-mobile')
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
          {clickFlashOverlay('active-players-mobile')}
        </UiEntity>
        {/* Profile / ranking panel */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: expandedPanelTop, right: expandedPanelRight },
            width: compactUi ? 816 : 680,
            height: activePlayersPanelOpen ? (compactUi ? 520 : 420) : artifactPanelOpen ? (compactUi ? 640 : 500) : profilePanelOpen ? (compactUi ? 680 : 540) : communityPanelOpen ? (compactUi ? 520 : 420) : (compactUi ? 700 : 720),
            flexDirection: 'column',
            display: (profilePanelOpen || rankingPanelOpen || inventoryPanelOpen || activePlayersPanelOpen || shopPanelOpen || communityPanelOpen) && !syncing && snap.profileLoaded && (showInformationPanels || (tutorialGuideActive && inventoryPanelOpen)) ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.015, g: 0.025, b: 0.075, a: 0.98 } }}
        >
          <UiEntity
            uiTransform={{ width: '100%', height: compactUi ? 120 : 92, flexDirection: 'row', alignItems: 'center' }}
            uiBackground={{ color: { r: 0.02, g: 0.16, b: 0.18, a: 1 } }}
          >
            <UiEntity uiTransform={{ width: compactUi ? 696 : 580, height: '100%', flexDirection: 'column', justifyContent: 'center' }}>
              <Label
                value={rankingPanelOpen ? 'RANKINGS' : shopPanelOpen ? 'ARTIFACT SHOP' : inventoryPanelOpen ? 'INVENTORY' : activePlayersPanelOpen ? 'ACTIVE PLAYERS' : communityPanelOpen ? 'COMMUNITY' : snap.playerName}
                fontSize={font(33)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: compactUi ? 62 : 48 }}
                textAlign='middle-left'
              />
              <Label
                value={rankingPanelOpen ? 'SESSION   |   DAILY   |   WEEKLY   |   TOTAL' : shopPanelOpen ? `CRYSTALS: ${snap.crystals}   |   ARTIFACT PRICES` : inventoryPanelOpen ? `CRYSTALS: ${snap.crystals}   |   ARTIFACTS` : activePlayersPanelOpen ? `PLAYERS IN ROUND: ${roster.length}` : communityPanelOpen ? `TIER ${snap.communityTier}   |   ${snap.communityPoints} / ${communityRequired} PTS` : `${scraperTitle}   |   LEVEL: ${snap.level}`}
                fontSize={font(20)}
                color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
                uiTransform={{ width: '100%', height: compactUi ? 45 : 32 }}
                textAlign='middle-left'
              />
            </UiEntity>
            <UiEntity
              uiTransform={{ width: compactUi ? 120 : 80, height: compactUi ? 100 : 72, alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.35, g: 0.08, b: 0.12, a: 1 } }}
              onMouseDown={() => {
                clickFlash('panel-close', 'red')
                closeGameUi()
              }}
            >
              <Label value='X' fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
              {clickFlashOverlay('panel-close')}
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
          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 330 : 250, flexDirection: 'column', display: communityPanelOpen ? 'flex' : 'none' }}>
            <Label
              value={`CURRENT BONUS: +${reward.crystalBonus} CRYSTALS   |   +${reward.pointBonus} PTS`}
              fontSize={font(22)}
              color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
              uiTransform={{ width: '100%', height: compactUi ? 76 : 52 }}
              textAlign='middle-center'
            />
            <UiEntity
              uiTransform={{ width: '92%', height: compactUi ? 32 : 22, margin: { left: '4%' } }}
              uiBackground={uiVariant('progress_bar_bg', compactUi)}
            >
              <UiEntity
                uiTransform={{ width: `${communityPct}%`, height: '100%' }}
                uiBackground={uiVariant('community_fill', compactUi)}
              />
            </UiEntity>
            <UiEntity uiTransform={{ width: '100%', height: compactUi ? 64 : 46, flexDirection: 'row', alignItems: 'center', margin: { top: compactUi ? 24 : 16 } }}>
              <Label value='TIER' fontSize={font(18)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '24%', height: '100%' }} textAlign='middle-center' />
              <Label value='CRYSTALS' fontSize={font(18)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '38%', height: '100%' }} textAlign='middle-center' />
              <Label value='POINTS' fontSize={font(18)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '38%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
            {[1, 2, 3, 4, 5, 6].map((tier) => {
              const tierReward = communityTierReward(tier)
              return (
                <UiEntity
                  key={`community-tier-${tier}`}
                  uiTransform={{ width: '100%', height: compactUi ? 46 : 30, flexDirection: 'row', alignItems: 'center' }}
                  uiBackground={{ color: tier === snap.communityTier ? { r: 0.16, g: 0.13, b: 0.03, a: 0.85 } : { r: 0.035, g: 0.045, b: 0.11, a: tier % 2 === 0 ? 0.65 : 0.35 } }}
                >
                  <Label value={`${tier}+`} fontSize={font(17)} color={{ r: 0.92, g: 0.96, b: 1, a: 1 }} uiTransform={{ width: '24%', height: '100%' }} textAlign='middle-center' />
                  <Label value={`+${tierReward.crystalBonus}`} fontSize={font(17)} color={{ r: 0.2, g: 1, b: 0.85, a: 1 }} uiTransform={{ width: '38%', height: '100%' }} textAlign='middle-center' />
                  <Label value={`+${tierReward.pointBonus}`} fontSize={font(17)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '38%', height: '100%' }} textAlign='middle-center' />
                </UiEntity>
              )
            })}
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
            height: compactUi ? 330 : 260,
            flexDirection: 'row',
            alignItems: 'center',
            display: profilePanelOpen ? 'flex' : 'none'
          }}>
            <UiEntity uiTransform={{ width: '28%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <UiEntity
                uiTransform={{ width: compactUi ? 180 : 138, height: compactUi ? 180 : 138 }}
                uiBackground={avatarBackground(snap.playerAddress)}
              />
            </UiEntity>
            <UiEntity uiTransform={{ width: '72%', height: '100%', flexDirection: 'column', justifyContent: 'center' }}>
              <UiEntity uiTransform={{ width: '100%', height: '25%', flexDirection: 'row' }}>
                <Label value={`SESSION PTS: ${snap.sessionPoints}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-left' />
                <Label value={`ROUND PTS: ${snap.roundPoints}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-left' />
              </UiEntity>
              <UiEntity uiTransform={{ width: '100%', height: '25%', flexDirection: 'row' }}>
                <Label value={`BLOCKS: ${snap.correctPieces}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-left' />
                <Label value={`ROUNDS: ${snap.roundsPlayed}`} fontSize={font(20)} color={{ r: 0.88, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-left' />
              </UiEntity>
              <UiEntity uiTransform={{ width: '100%', height: '25%', flexDirection: 'row' }}>
                <Label value={`MVP: ${snap.mvpAwards}`} fontSize={font(20)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-left' />
                <Label value={`PERFECT: ${snap.perfectBuilds}`} fontSize={font(20)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '50%', height: '100%' }} textAlign='middle-left' />
              </UiEntity>
              <UiEntity uiTransform={{ width: '100%', height: '25%', flexDirection: 'row' }}>
                <Label value={`EXCELLENCE: ${excellence} PTS / ROUND`} fontSize={font(18)} color={{ r: 0.25, g: 1, b: 0.86, a: 1 }} uiTransform={{ width: '52%', height: '100%' }} textAlign='middle-left' />
                <Label value={`DOMINANCE: ${dominance}% MVP / ROUND`} fontSize={font(18)} color={{ r: 0.25, g: 1, b: 0.86, a: 1 }} uiTransform={{ width: '48%', height: '100%' }} textAlign='middle-left' />
              </UiEntity>
            </UiEntity>
          </UiEntity>

          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 500 : 380, flexDirection: 'column', display: inventoryPanelOpen ? 'flex' : 'none' }}>
            <Label value='OBJECTS' fontSize={font(18)} color={{ r: 0.35, g: 0.95, b: 1, a: 1 }} uiTransform={{ width: '100%', height: compactUi ? 40 : 28 }} textAlign='middle-center' />
            <UiEntity uiTransform={{ width: '100%', height: compactUi ? 260 : 190, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {INVENTORY_OBJECT_SLOTS.map((slot) => {
                const candidate = visibleInventoryArtifact(slot.index, snap.artifactInventory)
                const count = candidate ? inventoryArtifactCount(candidate) : 0
                const artifact = candidate && count > 0 ? candidate : undefined
                const imageSize = artifact ? inventoryArtifactImageSize(artifact, compactUi) : undefined
                return (
                  <UiEntity
                    key={`inventory-object-${slot.id}`}
                    uiTransform={{ width: compactUi ? 188 : 146, height: compactUi ? 210 : 150, margin: { left: compactUi ? 6 : 8, right: compactUi ? 6 : 8, top: 4, bottom: 4 }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    uiBackground={uiVariant(artifact ? 'inventory_object_slot_filled' : 'inventory_object_slot_empty', compactUi)}
                    onMouseDown={() => {
                      clickFlash(`inventory-object-${slot.index}`)
                      if (!artifact) return
                      if (tutorialGuideActive) {
                        const action = currentTutorialAction()
                        if (action !== 'ARTIFACT_1' && action !== 'ARTIFACT_2' && action !== 'COMPLETE') return
                        const emptyTutorialSlot = tutorialEquippedArtifacts.findIndex((item) => !item)
                        const tutorialSlotIndex = emptyTutorialSlot >= 0 ? emptyTutorialSlot : tutorialEquippedArtifacts.length
                        if (tutorialSlotIndex >= 2) return
                        const stackCount = tutorialArtifactCount(artifact)
                        if (stackCount <= 0) return
                        tutorialArtifactInventoryCounts[artifact] = 0
                        tutorialEquippedArtifacts[tutorialSlotIndex] = artifact
                        tutorialEquippedArtifactCounts[tutorialSlotIndex] = stackCount
                        if (action !== 'COMPLETE') completeTutorialGuideAction(action)
                        return
                      }
                      artifactDetail = artifact
                    }}
                  >
                    {artifact ? (
                      <UiEntity
                        uiTransform={{
                          positionType: 'absolute',
                          width: imageSize?.width ?? 0,
                          height: imageSize?.height ?? 0
                        }}
                        uiBackground={artifactThumbnail(artifact, compactUi)}
                      />
                    ) : (
                      <Label value='EMPTY' fontSize={font(15)} color={{ r: 0.45, g: 0.55, b: 0.65, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
                    )}
                    {artifact ? (
                      <Label
                        value={`x${count}`}
                        fontSize={font(18)}
                        color={{ r: 1, g: 0.88, b: 0.25, a: 1 }}
                        uiTransform={{ positionType: 'absolute', position: { right: 10, bottom: 8 }, width: compactUi ? 70 : 46, height: compactUi ? 34 : 24 }}
                        textAlign='middle-right'
                      />
                    ) : null}
                    {clickFlashOverlay(`inventory-object-${slot.index}`)}
                  </UiEntity>
                )
              })}
            </UiEntity>

            <UiEntity uiTransform={{ width: '100%', height: compactUi ? 112 : 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Label value='EQUIPPED' fontSize={font(16)} color={{ r: 0.35, g: 0.95, b: 1, a: 1 }} uiTransform={{ width: '28%', height: '100%' }} textAlign='middle-center' />
              {EQUIPPED_ARTIFACT_SLOTS.map((slot) => {
                const artifact = displayedEquippedArtifacts[slot.index]
                const artifactCount = artifact ? displayedEquippedArtifactCount(snap, slot.index, tutorialGuideActive) : 0
                return (
                  <UiEntity
                    key={`inventory-equipped-${slot.id}`}
                    uiTransform={{ width: compactUi ? 150 : 102, height: compactUi ? 82 : 58, margin: { left: 8, right: 8 }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    uiBackground={uiVariant('equipped_artifact_slot', compactUi)}
                    onMouseDown={() => {
                      clickFlash(`inventory-equipped-${slot.index}`)
                      if (!artifact) openInventoryPanel()
                    }}
                  >
                    <Label value={slot.label} fontSize={font(15)} color={{ r: 0.2, g: 1, b: 0.9, a: 1 }} uiTransform={{ positionType: 'absolute', position: { top: 2, left: 0 }, width: '100%', height: compactUi ? 24 : 18 }} textAlign='middle-center' />
                    {artifact ? (
                      <UiEntity
                        uiTransform={{ positionType: 'absolute', width: compactUi ? 136 : 92, height: compactUi ? 46 : 35 }}
                        uiBackground={artifactThumbnail(artifact, compactUi)}
                      />
                    ) : (
                      <Label value='EMPTY' fontSize={font(10)} color={{ r: 0.5, g: 0.58, b: 0.68, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
                    )}
                    {artifact ? (
                      <Label value={`x${artifactCount}`} fontSize={font(11)} color={{ r: 1, g: 0.88, b: 0.25, a: 1 }} uiTransform={{ positionType: 'absolute', position: { right: 7, bottom: 3 }, width: compactUi ? 52 : 34, height: compactUi ? 22 : 16 }} textAlign='middle-right' />
                    ) : null}
                    {artifact ? (
                      <UiEntity
                        uiTransform={{ positionType: 'absolute', position: { left: 7, bottom: 3 }, width: compactUi ? 34 : 24, height: compactUi ? 34 : 24, alignItems: 'center', justifyContent: 'center' }}
                        uiBackground={{ color: { r: 0.5, g: 0.04, b: 0.08, a: 0.95 } }}
                        onMouseDown={() => {
                          clickFlash(`inventory-unequip-${slot.index}`, 'red')
                          if (tutorialGuideActive) {
                            unequipTutorialArtifact(slot.index)
                          } else {
                            requestUnequipArtifact(slot.index)
                          }
                        }}
                      >
                        <Label value='X' fontSize={font(17)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
                        {clickFlashOverlay(`inventory-unequip-${slot.index}`)}
                      </UiEntity>
                    ) : null}
                    {clickFlashOverlay(`inventory-equipped-${slot.index}`)}
                  </UiEntity>
                )
              })}
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
                <UiEntity
                  uiTransform={{ width: '18%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                >
                  <UiEntity
                    uiTransform={{
                      width: compactUi ? 108 : 76,
                      height: compactUi ? 76 : 54
                    }}
                    uiBackground={artifactThumbnail(artifact, compactUi)}
                  />
                </UiEntity>
                <Label
                  value={ARTIFACT_LABEL[artifact]}
                  fontSize={font(22)}
                  color={{ r: 1, g: 1, b: 1, a: 1 }}
                  uiTransform={{ width: '28%', height: '100%' }}
                  textAlign='middle-center'
                />
                <Label
                  value={artifactDescription(artifact)}
                  fontSize={font(15)}
                  color={{ r: 0.72, g: 0.85, b: 0.92, a: 1 }}
                  uiTransform={{ width: '30%', height: '100%' }}
                  textAlign='middle-center'
                />
                <UiEntity
                  uiTransform={{ width: '24%', height: compactUi ? 72 : 54, alignItems: 'center', justifyContent: 'center' }}
                  uiBackground={{ color: snap.crystals >= ARTIFACT_PRICE_CRYSTALS[artifact] && canStoreArtifact(artifact) && !inBuild
                    ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
                    : { r: 0.18, g: 0.18, b: 0.22, a: 0.86 }
                  }}
                  onMouseDown={() => {
                    if (tutorialGuideActive) return
                    if (inBuild) return
                    if (!canStoreArtifact(artifact)) return
                    clickFlash(`shop-${artifact}`)
                    requestBuyArtifact(artifact)
                  }}
                >
                  <Label value={`BUY ${ARTIFACT_PRICE_CRYSTALS[artifact]}`} fontSize={font(16)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
                  {clickFlashOverlay(`shop-${artifact}`)}
                </UiEntity>
              </UiEntity>
            ))}
          </UiEntity>
          <UiEntity uiTransform={{ width: '100%', height: compactUi ? 58 : 44, flexDirection: 'row', alignItems: 'center', display: rankingPanelOpen ? 'flex' : 'none' }}>
            <UiEntity
              uiTransform={{ width: '15%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.04, g: 0.32, b: 0.31, a: 1 } }}
              onMouseDown={() => {
                clickFlash('ranking-prev')
                stepRankingTab(-1)
              }}
            >
              <Label
                value={'<'}
                fontSize={font(25)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
              {clickFlashOverlay('ranking-prev')}
            </UiEntity>
            <Label value='LEADERBOARDS' fontSize={font(23)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '70%', height: '100%' }} textAlign='middle-center' />
            <UiEntity
              uiTransform={{ width: '15%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.04, g: 0.32, b: 0.31, a: 1 } }}
              onMouseDown={() => {
                clickFlash('ranking-next')
                stepRankingTab(1)
              }}
            >
              <Label
                value={'>'}
                fontSize={font(25)}
                color={{ r: 1, g: 1, b: 1, a: 1 }}
                uiTransform={{ width: '100%', height: '100%' }}
                textAlign='middle-center'
              />
              {clickFlashOverlay('ranking-next')}
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
                  clickFlash(`ranking-tab-${tab}`)
                  rankingTab = tab
                  if (tab !== 'SESSION' && snap.leaderboards.generatedAt === 0) requestLeaderboards()
                }}
              >
                <Label value={tab} fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
                {clickFlashOverlay(`ranking-tab-${tab}`)}
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

        {/* Artifact detail */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: compactUi ? 260 : 300, left: compactUi ? 520 : 660 },
            width: compactUi ? 820 : 560,
            height: compactUi ? 420 : 290,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: inventoryPanelOpen && artifactDetail !== null && !tutorialGuideActive ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.01, g: 0.018, b: 0.045, a: 0.96 } }}
        >
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { top: compactUi ? 14 : 10, right: compactUi ? 14 : 10 },
              width: compactUi ? 72 : 44,
              height: compactUi ? 72 : 44,
              alignItems: 'center',
              justifyContent: 'center'
            }}
            uiBackground={uiVariant('leaderboard_close_button', compactUi)}
            onMouseDown={() => {
              clickFlash('artifact-detail-close', 'red')
              artifactDetail = null
            }}
          >
            <Label value='X' fontSize={font(18)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            {clickFlashOverlay('artifact-detail-close')}
          </UiEntity>
          {artifactDetail ? (
            <UiEntity uiTransform={{ width: '100%', height: compactUi ? 166 : 112, alignItems: 'center', justifyContent: 'center' }}>
              <UiEntity
                uiTransform={{ width: compactUi ? 300 : 200, height: compactUi ? 112 : 76 }}
                uiBackground={artifactThumbnail(artifactDetail, compactUi)}
              />
            </UiEntity>
          ) : null}
          <Label
            value={artifactDetail ? ARTIFACT_LABEL[artifactDetail] : ''}
            fontSize={font(25)}
            color={{ r: 0.25, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: '88%', height: compactUi ? 56 : 36 }}
            textAlign='middle-center'
          />
          <Label
            value={artifactDetail ? artifactDescription(artifactDetail) : ''}
            fontSize={font(17)}
            color={{ r: 0.86, g: 0.92, b: 1, a: 1 }}
            uiTransform={{ width: '82%', height: compactUi ? 74 : 48 }}
            textAlign='middle-center'
          />
          <UiEntity uiTransform={{ width: '86%', height: compactUi ? 86 : 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Label
              value={`OWNED: ${detailArtifactCount}`}
              fontSize={font(17)}
              color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
              uiTransform={{ width: '45%', height: '100%' }}
              textAlign='middle-center'
            />
            <UiEntity
              uiTransform={{ width: '40%', height: '84%', alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: detailArtifactInventoryIndex >= 0
                ? { r: 0.05, g: 0.52, b: 0.44, a: 1 }
                : { r: 0.18, g: 0.18, b: 0.22, a: 0.86 }
              }}
              onMouseDown={() => {
                if (detailArtifactInventoryIndex < 0) return
                clickFlash('artifact-detail-equip')
                requestEquipArtifact(detailArtifactInventoryIndex)
                artifactDetail = null
              }}
            >
              <Label value='EQUIP' fontSize={font(17)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
              {clickFlashOverlay('artifact-detail-equip')}
            </UiEntity>
          </UiEntity>
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
          uiBackground={uiVariant('tutorial_ready_box', compactUi)}
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
            uiBackground={uiVariant('leaderboard_close_button', compactUi)}
            onMouseDown={() => {
              clickFlash('ready-close', 'red')
              closeGameUi()
            }}
          >
            <Label value='X' fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            {clickFlashOverlay('ready-close')}
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
            uiBackground={uiVariant('join_button', compactUi)}
            onMouseDown={() => {
              clickFlash('ready-join')
              joinGame()
            }}
          >
            <Label
              value='' 
              fontSize={font(20)}
              color={{ r: 1, g: 1, b: 1, a: 1 }}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
            />
            {clickFlashOverlay('ready-join')}
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
          uiBackground={uiVariant('progress_bar_bg', compactUi)}
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
            height: compactUi ? 54 : 34,
            alignItems: 'center',
            justifyContent: 'center',
            display: (inBuild || tutorialCompleteVisible) ? 'flex' : 'none'
          }}
        >
          <Label
            value={`BLOCKS: ${displayedPartsAttached} / ${displayedPartsRequired}`}
            fontSize={font(compactUi ? 28 : 22)}
            color={{ r: 0.85, g: 0.85, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
        </UiEntity>

        {/* Tutorial image focus shade */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: '100%',
            height: '100%',
            display: tutorialImageVisible ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0, g: 0, b: 0, a: 0.58 } }}
        />
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: guideStep?.action === 'NEXT' ? (compactUi ? 430 : 340) : (compactUi ? 450 : 315), left: 0 },
            width: '100%',
            height: guideStep?.action === 'NEXT' ? (compactUi ? 661 : 630) : (compactUi ? 554 : 480),
            alignItems: 'center',
            justifyContent: 'center',
            display: tutorialImageVisible ? 'flex' : 'none'
          }}
        >
          <UiEntity
            uiTransform={{
              width: guideStep?.action === 'NEXT' ? (compactUi ? 1176 : 1120) : (compactUi ? 1204 : 1120),
              height: guideStep?.action === 'NEXT' ? (compactUi ? 661 : 630) : (compactUi ? 554 : 480)
            }}
            uiBackground={imauiImage(tutorialImage ?? 'fase1.png')}
          />
        </UiEntity>
        {/* Guided tutorial message */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 258 : 184, left: compactUi ? 420 : 610 },
            width: compactUi ? 1080 : 700,
            height: compactUi ? 112 : 76,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: tutorialCompleteVisible ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.015, g: 0.025, b: 0.075, a: 0.92 } }}
        >
          <Label
            value='E = CHANGE BLOCK'
            fontSize={font(18)}
            color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: '100%', height: '33%' }}
            textAlign='middle-center'
          />
          <Label
            value='F = AUTOPLACE'
            fontSize={font(18)}
            color={{ r: 0.2, g: 1, b: 0.9, a: 1 }}
            uiTransform={{ width: '100%', height: '33%' }}
            textAlign='middle-center'
          />
          <Label
            value='TAP / CLICK = PLACE (EXTRA POINTS)'
            fontSize={font(18)}
            color={{ r: 1, g: 0.84, b: 0.25, a: 1 }}
            uiTransform={{ width: '100%', height: '34%' }}
            textAlign='middle-center'
          />
        </UiEntity>
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
          uiBackground={uiVariant('tutorial_message_box', compactUi)}
        >
          <Label
            value={tutorialCompleteVisible ? tutorialPracticeMessage() : tutorialTip}
            fontSize={font(tutorialCompleteVisible ? 20 : 19)}
            color={tutorialCompleteVisible ? { r: 0.2, g: 1, b: 0.85, a: 1 } : { r: 0.9, g: 0.96, b: 1, a: 1 }}
            uiTransform={{ width: guideAdvanceAvailable || tutorialCompleteVisible ? '58%' : '94%', height: '100%' }}
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
            uiBackground={uiVariant(tutorialCompleteVisible ? 'tutorial_ready_button' : 'tutorial_next_button', compactUi)}
            onMouseDown={() => {
              clickFlash('tutorial-next')
              if (tutorialCompleteVisible) finishTutorialGuide(true)
              else if (guideStep) completeTutorialGuideAction(guideStep.action)
            }}
          >
            <Label
              value=''
              fontSize={font(20)}
              color={{ r: 1, g: 1, b: 1, a: 1 }}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
            />
            {clickFlashOverlay('tutorial-next')}
          </UiEntity>
        </UiEntity>
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: compactUi ? 186 : 126, left: compactUi ? 865 : 902 },
            width: compactUi ? 190 : 116,
            height: compactUi ? 64 : 44,
            alignItems: 'center',
            justifyContent: 'center',
            display: tutorialSkipAvailable ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.55, g: 0.04, b: 0.09, a: 0.95 } }}
          onMouseDown={() => {
            clickFlash('tutorial-skip', 'red')
            finishTutorialGuide(true)
          }}
        >
          <Label
            value='SKIP'
            fontSize={font(18)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
          {clickFlashOverlay('tutorial-skip')}
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
            display: (inBuild || tutorialCompleteVisible) ? 'flex' : 'none'
          }}
          uiBackground={uiVariant('piece_selector_panel', compactUi)}
        >
            <Label
              value=''
              fontSize={blockPanelFont(10)}
              color={{ r: 0.5, g: 0.5, b: 0.9, a: 0.9 }}
              uiTransform={{ positionType: 'absolute', position: { top: compactUi ? -24 : -16, left: 0 }, width: '100%', height: compactUi ? 26 : 16 }}
              textAlign='middle-center'
            />
            <UiEntity
              uiTransform={{ width: '100%', height: compactUi ? 76 : 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: { bottom: compactUi ? 18 : 10 } }}
            >
              {PART_TYPES.map(pt => {
                const isSelected = pt === PART_TYPES[selectedIndex]
                return (
                  <UiEntity
                    key={pt}
                    uiTransform={{
                      width: compactUi ? 218 : 140,
                      height: compactUi ? 72 : 44,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    uiBackground={uiVariant(isSelected ? 'piece_button_selected' : 'piece_button_inactive', compactUi)}
                    onMouseDown={() => {
                      clickFlash(`piece-${pt}`)
                      selectPart(PART_TYPES.indexOf(pt), inBuild, 'button')
                    }}
                  >
                    <UiEntity
                      uiTransform={{ positionType: 'absolute', width: compactUi ? 138 : 84, height: compactUi ? 138 : 84, display: isSelected ? 'flex' : 'none' }}
                      uiBackground={{ color: { r: 0.55, g: 1, b: 0.62, a: 0.34 } }}
                    />
                    <UiEntity
                      uiTransform={{ width: isSelected ? (compactUi ? 176 : 108) : (compactUi ? 146 : 90), height: isSelected ? (compactUi ? 176 : 108) : (compactUi ? 146 : 90) }}
                      uiBackground={partIcon(pt)}
                    />
                    {clickFlashOverlay(`piece-${pt}`)}
                  </UiEntity>
                )
              })}
            </UiEntity>
            <UiEntity
              uiTransform={{ width: '100%', height: compactUi ? 22 : 14, margin: { top: compactUi ? 14 : 8 }, alignItems: 'center', justifyContent: 'center' }}
              uiBackground={{ color: { r: 0.015, g: 0.018, b: 0.05, a: 0.92 } }}
            >
              <Label
                value={tutorialGuideActive ? 'SELECT BLOCK' : 'CURRENT BLOCK'}
                fontSize={blockPanelFont(10)}
                color={{ r: 0.92, g: 0.96, b: 1, a: 1 }}
              uiTransform={{ width: '100%', height: '100%' }}
              textAlign='middle-center'
            />
          </UiEntity>
            <UiEntity
              uiTransform={{ width: compactUi ? 540 : 340, height: compactUi ? 12 : 8, margin: { top: compactUi ? 6 : 3 }, display: compactUi ? 'none' : 'flex' }}
              uiBackground={uiVariant('cooldown_bar_bg', compactUi)}
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

        {/* Mobile cooldown bar */}
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: 106, left: 518 },
            width: 684,
            height: 18,
            display: compactUi && (inBuild || tutorialCompleteVisible) ? 'flex' : 'none'
          }}
          uiBackground={uiVariant('cooldown_bar_bg', true)}
        >
          <UiEntity
            uiTransform={{ width: `${autoCooldownPct}%`, height: '100%' }}
            uiBackground={{ color: autoCooldownReady
              ? { r: 0.15, g: 1, b: 0.55, a: 1 }
              : { r: autoCooldownColor.r, g: autoCooldownColor.g, b: autoCooldownColor.b, a: 1 }
            }}
          />
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
          uiBackground={uiVariant('artifact_hud_slots', compactUi)}
        >
          {EQUIPPED_ARTIFACT_SLOTS.map((slot) => {
            const artifact = displayedEquippedArtifacts[slot.index]
            const artifactCount = artifact ? displayedEquippedArtifactCount(snap, slot.index, tutorialGuideActive) : 0
            return (
              <UiEntity
                key={`hud-${slot.id}`}
                uiTransform={{
                  width: compactUi ? 132 : 84,
                  height: compactUi ? 112 : 72,
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                uiBackground={uiVariant('equipped_artifact_slot', compactUi)}
                onMouseDown={() => {
                  clickFlash(`hud-artifact-${slot.index}`)
                  activateEquippedArtifactSlot(slot.index, artifact, tutorialCompleteVisible)
                }}
              >
                <Label value={slot.label} fontSize={font(14)} color={{ r: 0.2, g: 1, b: 0.9, a: 1 }} uiTransform={{ positionType: 'absolute', position: { top: 2, left: 0 }, width: '100%', height: compactUi ? 24 : 16 }} textAlign='middle-center' />
                {artifact ? (
                  <UiEntity
                    uiTransform={{ positionType: 'absolute', width: compactUi ? 236 : 148, height: compactUi ? 80 : 56 }}
                    uiBackground={artifactThumbnail(artifact, compactUi)}
                  />
                ) : (
                  <Label value='EMPTY' fontSize={font(9)} color={{ r: 0.5, g: 0.58, b: 0.68, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
                )}
                {artifact ? (
                  <Label value={`x${artifactCount}`} fontSize={font(10)} color={{ r: 1, g: 0.88, b: 0.25, a: 1 }} uiTransform={{ positionType: 'absolute', position: { right: 5, bottom: 3 }, width: compactUi ? 48 : 32, height: compactUi ? 22 : 15 }} textAlign='middle-right' />
                ) : null}
                {clickFlashOverlay(`hud-artifact-${slot.index}`)}
              </UiEntity>
            )
          })}
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
            display: !syncing && !inCinematic && !tutorialGuideActive && !profilePanelOpen && !rankingPanelOpen && !inventoryPanelOpen && !activePlayersPanelOpen && !shopPanelOpen && !communityPanelOpen ? 'flex' : 'none'
          }}
          uiBackground={uiVariant('community_bar', compactUi)}
        >
          <UiEntity
            uiTransform={{ width: compactUi ? 1320 : 940, height: compactUi ? 48 : 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Label
              value={playerLevelLabel}
              fontSize={font(19)}
              color={{ r: 0.25, g: 0.95, b: 1, a: 1 }}
              uiTransform={{ width: '42%', height: '100%' }}
              textAlign='middle-left'
            />
            <Label
              value={playerProgressLabel}
              fontSize={font(19)}
              color={{ r: 0.25, g: 0.95, b: 1, a: 1 }}
              uiTransform={{ width: '42%', height: '100%' }}
              textAlign='middle-right'
            />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: compactUi ? 1320 : 940, height: compactUi ? 24 : 16 }}
            uiBackground={uiVariant('community_bar', compactUi)}
          >
            <UiEntity
              uiTransform={{ width: `${playerProgressPct}%`, height: '100%' }}
              uiBackground={uiVariant('community_fill', compactUi)}
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
          uiBackground={uiVariant('feedback_message', compactUi)}
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
              value='Place the matching blocks before the timer runs out.'
              fontSize={font(20)}
              color={{ r: 0.9, g: 0.9, b: 1, a: onboardingAlpha }}
              uiTransform={{ width: '100%', height: compactUi ? 58 : 32 }}
              textAlign='middle-center'
            />
            <Label
              value='<color=#00ffff>E</color> changes block. Click a slot to place it.'
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
            position: { top: compactUi ? 170 : 260, left: compactUi ? 170 : 360 },
            width: compactUi ? 1500 : 1200,
            height: compactUi ? 660 : 560,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            display: isPlaying && phase === 'BUILD_COMPLETE' && snap.resolved && !snap.isStale ? 'flex' : 'none'
          }}
          uiBackground={{ color: { r: 0.01, g: 0.015, b: 0.04, a: 0.9 } }}
        >
          <Label
            value={snap.performanceType === 'PERFECT' ? 'PERFECT BUILD!' : 'INCOMPLETE'}
            fontSize={font(compactUi ? 48 : 68)}
            color={snap.performanceType === 'PERFECT'
              ? { r: 0, g: 1, b: 1, a: 1 }
              : { r: 1, g: 0.25, b: 0.15, a: 1 }}
            uiTransform={{ width: '100%', height: compactUi ? 78 : 76 }}
            textAlign='middle-center'
          />
          <UiEntity uiTransform={{ width: '92%', height: compactUi ? 190 : 178, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <UiEntity uiTransform={{ width: '57%', height: '100%', flexDirection: 'row', alignItems: 'center' }} uiBackground={{ color: { r: 0.02, g: 0.045, b: 0.1, a: 0.82 } }}>
              <UiEntity
                uiTransform={{
                  width: compactUi ? 116 : 104,
                  height: compactUi ? 188 : 172,
                  margin: { left: compactUi ? 22 : 16, right: compactUi ? 26 : 22 }
                }}
                uiBackground={avatarBackground(snap.playerAddress, 'body')}
              />
              <UiEntity uiTransform={{ width: '68%', height: '100%', flexDirection: 'column', justifyContent: 'center' }}>
                <Label value={`YOU: ${snap.roundPoints} PTS`} fontSize={font(compactUi ? 21 : 28)} color={{ r: 0.2, g: 1, b: 0.85, a: 1 }} uiTransform={{ width: '100%', height: '25%' }} textAlign='middle-left' />
                <Label value={scraperTitle} fontSize={font(compactUi ? 15 : 20)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '100%', height: '18%' }} textAlign='middle-left' />
                <Label value={`${snap.roundCorrectPieces} BLOCKS   |   +${snap.lastRoundCrystalsEarned} CRYSTALS`} fontSize={font(compactUi ? 16 : 22)} color={{ r: 0.86, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '22%' }} textAlign='middle-left' />
                <UiEntity uiTransform={{ width: '100%', height: '18%', flexDirection: 'row', alignItems: 'center' }}>
                  <Label value={`EXCELLENCE: ${excellence} PTS / ROUND`} fontSize={font(compactUi ? 14 : 19)} color={{ r: 0.25, g: 1, b: 0.86, a: 1 }} uiTransform={{ width: compactUi ? '58%' : '74%', height: '100%' }} textAlign='middle-left' />
                  <Label value={excellenceTrend === 'UP' ? '▲' : excellenceTrend === 'DOWN' ? '▼' : '-'} fontSize={font(compactUi ? 18 : 24)} color={excellenceTrend === 'UP' ? { r: 0.1, g: 1, b: 0.25, a: 1 } : excellenceTrend === 'DOWN' ? { r: 1, g: 0.15, b: 0.12, a: 1 } : { r: 0.65, g: 0.7, b: 0.85, a: 1 }} uiTransform={{ width: compactUi ? '8%' : '9%', height: '100%' }} textAlign='middle-center' />
                </UiEntity>
                <UiEntity uiTransform={{ width: '100%', height: '17%', flexDirection: 'row', alignItems: 'center' }}>
                  <Label value={`DOMINANCE: ${dominance}% MVP / ROUND`} fontSize={font(compactUi ? 14 : 19)} color={{ r: 0.25, g: 1, b: 0.86, a: 1 }} uiTransform={{ width: compactUi ? '58%' : '74%', height: '100%' }} textAlign='middle-left' />
                  <Label value={dominanceTrend === 'UP' ? '▲' : dominanceTrend === 'DOWN' ? '▼' : '-'} fontSize={font(compactUi ? 18 : 24)} color={dominanceTrend === 'UP' ? { r: 0.1, g: 1, b: 0.25, a: 1 } : dominanceTrend === 'DOWN' ? { r: 1, g: 0.15, b: 0.12, a: 1 } : { r: 0.65, g: 0.7, b: 0.85, a: 1 }} uiTransform={{ width: compactUi ? '8%' : '9%', height: '100%' }} textAlign='middle-center' />
                </UiEntity>
              </UiEntity>
            </UiEntity>
            <UiEntity uiTransform={{ width: '38%', height: compactUi ? 134 : 116, flexDirection: 'row', alignItems: 'center' }} uiBackground={{ color: { r: 0.02, g: 0.045, b: 0.1, a: 0.82 } }}>
              <UiEntity
                uiTransform={{
                  width: compactUi ? 104 : 96,
                  height: compactUi ? 104 : 96,
                  margin: { left: compactUi ? 20 : 14, right: compactUi ? 22 : 18 }
                }}
                uiBackground={avatarBackground(roundMvpRow?.address)}
              />
              <UiEntity uiTransform={{ width: '72%', height: '100%', flexDirection: 'column', justifyContent: 'center' }}>
                <Label value='MVP' fontSize={font(compactUi ? 21 : 28)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '100%', height: '34%' }} textAlign='middle-left' />
                <Label value={snap.mvpName ? snap.mvpName : snap.players.length < 2 ? 'NEEDS 2+ PLAYERS' : 'NONE'} fontSize={font(compactUi ? 16 : 22)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '28%' }} textAlign='middle-left' />
                <Label value={`PTS: ${snap.mvpPoints}`} fontSize={font(compactUi ? 15 : 20)} color={{ r: 0.2, g: 1, b: 0.85, a: 1 }} uiTransform={{ width: '100%', height: '20%' }} textAlign='middle-left' />
                <Label value={`BLOCKS: ${mvpBlocks} / ${snap.partsRequired}`} fontSize={font(compactUi ? 15 : 20)} color={{ r: 0.86, g: 0.92, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '24%' }} textAlign='middle-left' />
              </UiEntity>
            </UiEntity>
          </UiEntity>
          <UiEntity uiTransform={{ width: '86%', height: compactUi ? 44 : 38, flexDirection: 'row', alignItems: 'center', margin: { top: compactUi ? 14 : 16 } }}>
            <Label value='TOP 5' fontSize={font(compactUi ? 18 : 24)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '46%', height: '100%' }} textAlign='middle-left' />
            <Label value='PTS' fontSize={font(compactUi ? 18 : 24)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '18%', height: '100%' }} textAlign='middle-center' />
            <Label value='BLOCKS' fontSize={font(compactUi ? 18 : 24)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '20%', height: '100%' }} textAlign='middle-center' />
            <Label value='LVL' fontSize={font(compactUi ? 18 : 24)} color={{ r: 0.35, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '16%', height: '100%' }} textAlign='middle-center' />
          </UiEntity>
          {roundTopRows.map((player, index) => (
            <UiEntity
              key={`round-top-${player.name}-${index}`}
              uiTransform={{ width: '86%', height: compactUi ? 52 : 46, flexDirection: 'row', alignItems: 'center' }}
              uiBackground={{ color: index === 0 ? { r: 0.18, g: 0.14, b: 0.025, a: 0.9 } : { r: 0.035, g: 0.045, b: 0.11, a: index % 2 === 0 ? 0.72 : 0.42 } }}
            >
              <UiEntity uiTransform={{ width: compactUi ? 44 : 40, height: compactUi ? 44 : 40, margin: { left: 10, right: 12 } }} uiBackground={avatarBackground(player.address)} />
              <Label value={`${index + 1}. ${player.name}`} fontSize={font(compactUi ? 17 : 23)} color={index === 0 ? { r: 1, g: 0.85, b: 0.25, a: 1 } : { r: 0.92, g: 0.94, b: 1, a: 1 }} uiTransform={{ width: '38%', height: '100%' }} textAlign='middle-left' />
              <Label value={`${player.roundPoints}`} fontSize={font(compactUi ? 17 : 23)} color={{ r: 0.2, g: 1, b: 0.85, a: 1 }} uiTransform={{ width: '18%', height: '100%' }} textAlign='middle-center' />
              <Label value={`${player.correctPieces}`} fontSize={font(compactUi ? 17 : 23)} color={{ r: 0.86, g: 0.9, b: 1, a: 1 }} uiTransform={{ width: '20%', height: '100%' }} textAlign='middle-center' />
              <Label value={`${player.level}`} fontSize={font(compactUi ? 17 : 23)} color={{ r: 1, g: 0.84, b: 0.25, a: 1 }} uiTransform={{ width: '16%', height: '100%' }} textAlign='middle-center' />
            </UiEntity>
          ))}
          <Label
            value='NEXT ROUND STARTS AUTOMATICALLY'
            fontSize={font(18)}
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
          uiBackground={uiVariant('leaderboard_camera_controls', compactUi)}
        >
          <UiEntity
            uiTransform={{ width: compactUi ? 150 : 96, height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={uiVariant('leaderboard_arrow_buttons', compactUi)}
            onMouseDown={() => {
              clickFlash('leaderboard-prev')
              previousLeaderboardMode()
            }}
          >
            <Label value='<' fontSize={font(28)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            {clickFlashOverlay('leaderboard-prev')}
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
            uiBackground={uiVariant('leaderboard_arrow_buttons', compactUi)}
            onMouseDown={() => {
              clickFlash('leaderboard-next')
              nextLeaderboardMode()
            }}
          >
            <Label value='>' fontSize={font(28)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            {clickFlashOverlay('leaderboard-next')}
          </UiEntity>
          <UiEntity
            uiTransform={{ width: compactUi ? 150 : 88, height: '100%', alignItems: 'center', justifyContent: 'center' }}
            uiBackground={uiVariant('leaderboard_close_button', compactUi)}
            onMouseDown={() => {
              clickFlash('leaderboard-close', 'red')
              closeLeaderboardCamera()
            }}
          >
            <Label value='X' fontSize={font(20)} color={{ r: 1, g: 1, b: 1, a: 1 }} uiTransform={{ width: '100%', height: '100%' }} textAlign='middle-center' />
            {clickFlashOverlay('leaderboard-close')}
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
            width: compactUi ? 208 : 260,
            height: compactUi ? 83 : 58,
            alignItems: 'center',
            justifyContent: 'center',
            display: !syncing && !tutorialVisible && !tutorialGuideActive && !inLeaderboardView ? 'flex' : 'none'
          }}
          uiBackground={uiVariant(isSpectator ? 'join_button' : 'leave_button', compactUi)}
          onMouseDown={() => {
            clickFlash('participation', isSpectator ? 'green' : 'red')
            isSpectator ? joinGame() : leaveGame()
          }}
        >
          <Label
            value='' 
            fontSize={font(15)}
            color={{ r: 1, g: 1, b: 1, a: 1 }}
            uiTransform={{ width: '100%', height: '100%' }}
            textAlign='middle-center'
          />
          {clickFlashOverlay('participation')}
        </UiEntity>



      </UiEntity>
    )
  }, { virtualWidth: 1920, virtualHeight: 1080 })
}



















































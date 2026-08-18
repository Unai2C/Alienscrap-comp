// Timing
export const BUILD_DURATION_SECONDS = 60
export const BUILD_COMPLETE_SECONDS = 5
export const COUNTDOWN_SECONDS = 2
export const PERFORMANCE_DURATION_SECONDS = 3
export const RESET_DELAY_SECONDS = 2

// Cinematic watchdog.
export const CINEMATIC_WATCHDOG_GRACE_SECONDS = 2

// State freshness threshold.
export const STALE_THRESHOLD_MS = 4000

// Scoring
export const POINTS_MANUAL_PIECE: Record<PartType, number> = {
  CUBE: 100,
  CYLINDER: 150,
  CONE: 200
}

export const POINTS_AUTO_PIECE: Record<PartType, number> = {
  CUBE: 60,
  CYLINDER: 90,
  CONE: 120
}

export const POINTS_FINAL_PIECE = 50
export const POINTS_GROUP_SUCCESS = 50
export const POINTS_SESSION_LEADER = 50
export const COMMUNITY_BASE_POINTS = 1000
export const COMMUNITY_GROWTH_POINTS = 500
export const SESSION_RECONNECT_MS = 5 * 60 * 1000
export const PLAYER_ONLINE_MS = 45 * 1000
export const HEARTBEAT_SECONDS = 15

export const SCRAP_PER_CORRECT_PIECE = 1
export const CRYSTALS_PERFECT_BASE = 10
export const CRYSTALS_PERFECT_PARTICIPATION = 2
export const CRYSTALS_PERFECT_TOP_BONUS = [8, 5, 3] as const
export const CRYSTALS_PERFECT_MVP_BONUS = 5
export const CRYSTALS_PERFECT_CAP = 30
export const CRYSTALS_FAILED_BASE = 2
export const CRYSTALS_FAILED_TOP_BONUS = [3, 2, 1] as const
export const CRYSTALS_FAILED_CAP = 6
export const ARTIFACT_USES_PER_ROUND = 2
export const ARTIFACT_PRICE_CRYSTALS = 60
export const ARTIFACT_DURATION_MS = 5000
export type ArtifactType = 'NO_COOLDOWN' | 'DOUBLE_PLACE' | 'TRIPLE_PLACE' | 'COMPLETE_TEMPLATE'

export const ARTIFACT_LABEL: Record<ArtifactType, string> = {
  NO_COOLDOWN: 'No Cooldown',
  DOUBLE_PLACE: 'Double Place',
  TRIPLE_PLACE: 'Triple Place',
  COMPLETE_TEMPLATE: 'Complete Template'
}

export type DifficultyTier = 'SOLO' | 'SMALL_GROUP' | 'SOCIAL_GROUP'

// World
export const SCENE_CENTER = { x: 24, y: 0, z: 24 }
export const TEMPLATE_BASE_Y = 6.8

// Block model scale.
export const GLB_SCALE = 0.39

// Parts
export type PartType = 'CUBE' | 'CYLINDER' | 'CONE'
export const PART_TYPES: PartType[] = ['CUBE', 'CYLINDER', 'CONE']
export type PlacementMode = 'manual' | 'auto'

export const PLACEMENT_COOLDOWN_MS: Record<PlacementMode, Record<PartType, number>> = {
  manual: {
    CUBE: 350,
    CYLINDER: 500,
    CONE: 650
  },
  auto: {
    CUBE: 1000,
    CYLINDER: 1400,
    CONE: 1800
  }
}

export const PART_GLB: Record<PartType, string> = {
  CUBE:     'assets/scene/CUBE_OPAQUE.glb',
  CYLINDER: 'assets/scene/CYLINDER_OPAQUE.glb',
  CONE:     'assets/scene/PYRAMID_OPAQUE.glb'
}

export const PART_GLB_ALPHA: Record<PartType, string> = {
  CUBE:     'assets/scene/CUBE_ALPHA.glb',
  CYLINDER: 'assets/scene/CYLINDER_ALPHA.glb',
  CONE:     'assets/scene/PYRAMID_ALPHA.glb'
}

export const PART_LABEL: Record<PartType, string> = {
  CUBE:     'Cube',
  CYLINDER: 'Cylinder',
  CONE:     'Cone'
}

export const PART_SYMBOL: Record<PartType, string> = {
  CUBE:     '■',
  CYLINDER: '◊',
  CONE:     '▲'
}

// Phase
export type RoundPhase = 'IDLE' | 'BUILD' | 'BUILD_COMPLETE' | 'COUNTDOWN' | 'PERFORM' | 'RESET'

export type PerformanceType = 'PERFECT' | 'FAIL' | ''

export const PERFORMANCE_LABEL: Record<'PERFECT' | 'FAIL', string> = {
  PERFECT: 'PERFECT BUILD!',
  FAIL:    'INCOMPLETE'
}

export function getPerformanceType(attached: number, required: number): PerformanceType {
  return attached >= required ? 'PERFECT' : 'FAIL'
}

// Logging
export const DEBUG = false



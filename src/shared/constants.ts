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
export const POINTS_CORRECT_PIECE = 100
export const POINTS_FINAL_PIECE = 50
export const POINTS_GROUP_SUCCESS = 50
export const POINTS_SESSION_LEADER = 50
export const COMMUNITY_BASE_POINTS = 1000
export const COMMUNITY_GROWTH_POINTS = 500
export const SESSION_RECONNECT_MS = 5 * 60 * 1000
export const PLAYER_ONLINE_MS = 45 * 1000
export const HEARTBEAT_SECONDS = 15

export type DifficultyTier = 'SOLO' | 'SMALL_GROUP' | 'SOCIAL_GROUP'

// World
export const SCENE_CENTER = { x: 24, y: 0, z: 24 }
export const TEMPLATE_BASE_Y = 6.8

// Block model scale.
export const GLB_SCALE = 0.39

// Parts
export type PartType = 'CUBE' | 'CYLINDER' | 'CONE'
export const PART_TYPES: PartType[] = ['CUBE', 'CYLINDER', 'CONE']

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

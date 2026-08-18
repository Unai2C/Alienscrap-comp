import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

// Client/server room messages.
export const Messages = {
  // Presence.
  connect: Schemas.Map({ ready: Schemas.Boolean }),
  heartbeat: Schemas.Map({ active: Schemas.Boolean }),

  // Competitive opt-in.
  joinGame: Schemas.Map({ requested: Schemas.Boolean }),
  leaveGame: Schemas.Map({ requested: Schemas.Boolean }),
  completeTutorial: Schemas.Map({ joinAfter: Schemas.Boolean }),

  requestLeaderboards: Schemas.Map({ requested: Schemas.Boolean }),
  buyArtifact: Schemas.Map({ artifactType: Schemas.String }),
  equipArtifact: Schemas.Map({ inventoryIndex: Schemas.Int }),
  useArtifact: Schemas.Map({ slotIndex: Schemas.Int }),

  // Piece placement request.
  attach: Schemas.Map({
    slotId: Schemas.String,
    partType: Schemas.String,
    mode: Schemas.String
  }),

  // Piece placement result.
  attachResult: Schemas.Map({
    slotId: Schemas.String,
    ok: Schemas.Boolean,
    reason: Schemas.String,
    required: Schemas.String
  }),

  artifactResult: Schemas.Map({
    ok: Schemas.Boolean,
    reason: Schemas.String
  }),

  // Targeted player status.
  playerUpdate: Schemas.Map({
    name: Schemas.String,
    status: Schemas.String,
    sessionPoints: Schemas.Int,
    roundPoints: Schemas.Int,
    correctPieces: Schemas.Int,
    ownOccupiedMask: Schemas.Int,
    profileLoaded: Schemas.Boolean,
    tutorialCompleted: Schemas.Boolean,
    lastTutorialDay: Schemas.Int,
    totalXp: Schemas.Int,
    level: Schemas.Int,
    roundsPlayed: Schemas.Int,
    perfectBuilds: Schemas.Int,
    mvpAwards: Schemas.Int,
    sessionLeaderAwards: Schemas.Int,
    crystals: Schemas.Int,
    cubeScrap: Schemas.Int,
    cylinderScrap: Schemas.Int,
    coneScrap: Schemas.Int,
    equippedArtifactsJson: Schemas.String,
    artifactInventoryJson: Schemas.String,
    artifactUsesThisRound: Schemas.Int,
    noCooldownUntil: Schemas.Number,
    doublePlaceUntil: Schemas.Number
  }),

  leaderboardUpdate: Schemas.Map({
    rankingsJson: Schemas.String
  }),

  // Server-owned round snapshot.
  stateUpdate: Schemas.Map({
    phase: Schemas.String,
    roundNumber: Schemas.Int,
    templateId: Schemas.String,
    partsAttached: Schemas.Int,
    partsRequired: Schemas.Int,
    occupiedMask: Schemas.Int,
    performanceType: Schemas.String,
    builders: Schemas.String,
    playersJson: Schemas.String,
    trophiesJson: Schemas.String,
    mvpName: Schemas.String,
    mvpPoints: Schemas.Int,
    difficulty: Schemas.String,
    secondsLeft: Schemas.Int,
    stateSeq: Schemas.Int,
    communityTier: Schemas.Int,
    communityPoints: Schemas.Int,
    communityRequiredPoints: Schemas.Int,
    communityMilestoneSeq: Schemas.Int
  })
}

export const room = registerMessages(Messages)



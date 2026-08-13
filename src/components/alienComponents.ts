import { engine, Schemas } from '@dcl/sdk/ecs'

// Server-owned game state.
export const RoundState = engine.defineComponent('alienscrap::RoundState', {
  phase:           Schemas.String,
  roundNumber:     Schemas.Int,
  templateId:      Schemas.String,
  partsAttached:   Schemas.Int,
  partsRequired:   Schemas.Int,
  occupiedMask:    Schemas.Int,
  performanceType: Schemas.String,
  builders:        Schemas.String,
  stateSeq:        Schemas.Int
})

export const GameTimer = engine.defineComponent('alienscrap::GameTimer', {
  secondsLeft: Schemas.Int
})

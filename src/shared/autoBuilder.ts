import { ARTIFACT_DURATION_MS, PartType } from './constants'

export interface AutoBuilderState {
  autoPlaceUntil: number
  nextAutoPlaceAt: number
  nextAutoPartIndex: number
}

export function startAutoBuilder(state: AutoBuilderState, now: number): void {
  state.autoPlaceUntil = now + ARTIFACT_DURATION_MS
  state.nextAutoPlaceAt = now + 2000
  state.nextAutoPartIndex = 0
}

export function stopAutoBuilder(state: AutoBuilderState): void {
  state.autoPlaceUntil = 0
  state.nextAutoPlaceAt = 0
  state.nextAutoPartIndex = 0
}

// Include the fifth placement at the deadline, even if a frame arrives late.
export function takeAutoBuilderPlacements(state: AutoBuilderState, now: number): number {
  let count = 0
  while (state.nextAutoPlaceAt > 0 && state.nextAutoPlaceAt <= now && state.nextAutoPlaceAt <= state.autoPlaceUntil) {
    count++
    state.nextAutoPlaceAt += 2000
  }
  if (state.nextAutoPlaceAt > state.autoPlaceUntil) state.nextAutoPlaceAt = 0
  return count
}

const AUTO_PART_ORDER: PartType[] = ['CUBE', 'CYLINDER', 'CONE']

// Continue after the shape actually placed; skip shapes with no free slots.
export function findAutoBuilderSlot(state: AutoBuilderState, findOpen: (part: PartType) => number): number {
  for (let offset = 0; offset < AUTO_PART_ORDER.length; offset++) {
    const partIndex = (state.nextAutoPartIndex + offset) % AUTO_PART_ORDER.length
    const slot = findOpen(AUTO_PART_ORDER[partIndex])
    if (slot < 0) continue
    state.nextAutoPartIndex = (partIndex + 1) % AUTO_PART_ORDER.length
    return slot
  }
  return -1
}

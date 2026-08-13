import { Storage } from '@dcl/sdk/server'
import { getLevelProgress } from '../../shared/progression'

const PROFILE_KEY = 'alienscrapyard_profile_v1'
const SCHEMA_VERSION = 3
const LOAD_ATTEMPTS = 3

export interface PlayerProfileV1 {
  schemaVersion: number
  wallet: string
  displayName: string
  totalXp: number
  level: number
  correctPieces: number
  roundsPlayed: number
  perfectBuilds: number
  mvpAwards: number
  sessionLeaderAwards: number
  tutorialCompleted: boolean
  firstSeenAt: number
  lastSeenAt: number
  updatedAt: number
}

function safeInt(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback
}

function emptyProfile(wallet: string, displayName: string): PlayerProfileV1 {
  const now = Date.now()
  return {
    schemaVersion: SCHEMA_VERSION,
    wallet,
    displayName,
    totalXp: 0,
    level: 1,
    correctPieces: 0,
    roundsPlayed: 0,
    perfectBuilds: 0,
    mvpAwards: 0,
    sessionLeaderAwards: 0,
    tutorialCompleted: false,
    firstSeenAt: now,
    lastSeenAt: now,
    updatedAt: now
  }
}

function normalizeProfile(raw: unknown, wallet: string, displayName: string): PlayerProfileV1 {
  const fallback = emptyProfile(wallet, displayName)
  if (!raw || typeof raw !== 'object') return fallback

  const saved = raw as Partial<PlayerProfileV1>
  const totalXp = safeInt(saved.totalXp)
  return {
    schemaVersion: SCHEMA_VERSION,
    wallet,
    displayName: typeof saved.displayName === 'string' && saved.displayName
      ? saved.displayName
      : displayName,
    totalXp,
    level: getLevelProgress(totalXp).level,
    correctPieces: safeInt(saved.correctPieces),
    roundsPlayed: safeInt(saved.roundsPlayed),
    perfectBuilds: safeInt(saved.perfectBuilds),
    mvpAwards: safeInt(saved.mvpAwards),
    sessionLeaderAwards: safeInt(saved.sessionLeaderAwards),
    tutorialCompleted: saved.tutorialCompleted === true,
    firstSeenAt: safeInt(saved.firstSeenAt, fallback.firstSeenAt),
    lastSeenAt: safeInt(saved.lastSeenAt, fallback.lastSeenAt),
    updatedAt: safeInt(saved.updatedAt, fallback.updatedAt)
  }
}

export class PlayerProfileStore {
  private readonly cache = new Map<string, PlayerProfileV1>()
  private readonly dirty = new Set<string>()
  private readonly revisions = new Map<string, number>()
  private readonly loading = new Map<string, Promise<PlayerProfileV1>>()

  private markDirty(address: string): void {
    this.dirty.add(address)
    this.revisions.set(address, (this.revisions.get(address) ?? 0) + 1)
  }

  async load(address: string, displayName: string): Promise<PlayerProfileV1> {
    const key = address.toLowerCase()
    const cached = this.cache.get(key)
    if (cached) {
      cached.lastSeenAt = Date.now()
      if (displayName && cached.displayName !== displayName) {
        cached.displayName = displayName
      }
      cached.updatedAt = cached.lastSeenAt
      this.markDirty(key)
      return cached
    }

    const pending = this.loading.get(key)
    if (pending) return pending

    const loadPromise = this.loadFromStorage(key, displayName)
    this.loading.set(key, loadPromise)
    try {
      return await loadPromise
    } finally {
      this.loading.delete(key)
    }
  }

  private async loadFromStorage(address: string, displayName: string): Promise<PlayerProfileV1> {
    let raw: unknown = null
    for (let attempt = 1; attempt <= LOAD_ATTEMPTS && raw === null; attempt++) {
      try {
        raw = await Storage.player.get<unknown>(address, PROFILE_KEY)
      } catch (error) {
        console.error(`[PROFILE] load attempt=${attempt} failed address=${address.slice(0, 8)} error=${error}`)
      }
    }

    const profile = normalizeProfile(raw, address, displayName)
    profile.displayName = displayName || profile.displayName
    profile.lastSeenAt = Date.now()
    this.cache.set(address, profile)
    this.markDirty(address)
    return profile
  }

  get(address: string): PlayerProfileV1 | null {
    return this.cache.get(address.toLowerCase()) ?? null
  }

  addProgress(address: string, xp: number, correctPieces = 0): PlayerProfileV1 | null {
    const key = address.toLowerCase()
    const profile = this.cache.get(key)
    if (!profile) return null

    profile.totalXp += Math.max(0, Math.floor(xp))
    profile.correctPieces += Math.max(0, Math.floor(correctPieces))
    profile.level = getLevelProgress(profile.totalXp).level
    profile.lastSeenAt = Date.now()
    profile.updatedAt = profile.lastSeenAt
    this.markDirty(key)
    return profile
  }

  ensureMinimumXp(address: string, minimumXp: number): PlayerProfileV1 | null {
    const key = address.toLowerCase()
    const profile = this.cache.get(key)
    if (!profile) return null

    const safeMinimum = Math.max(0, Math.floor(minimumXp))
    if (profile.totalXp >= safeMinimum) return profile

    profile.totalXp = safeMinimum
    profile.level = getLevelProgress(profile.totalXp).level
    profile.lastSeenAt = Date.now()
    profile.updatedAt = profile.lastSeenAt
    this.markDirty(key)
    return profile
  }

  recordRound(address: string, perfect: boolean): void {
    const key = address.toLowerCase()
    const profile = this.cache.get(key)
    if (!profile) return

    profile.roundsPlayed += 1
    if (perfect) profile.perfectBuilds += 1
    profile.lastSeenAt = Date.now()
    profile.updatedAt = profile.lastSeenAt
    this.markDirty(key)
  }

  recordMvp(address: string): void {
    const key = address.toLowerCase()
    const profile = this.cache.get(key)
    if (!profile) return

    profile.mvpAwards += 1
    profile.lastSeenAt = Date.now()
    profile.updatedAt = profile.lastSeenAt
    this.markDirty(key)
  }

  recordSessionLeader(address: string): void {
    const key = address.toLowerCase()
    const profile = this.cache.get(key)
    if (!profile) return

    profile.sessionLeaderAwards += 1
    profile.lastSeenAt = Date.now()
    profile.updatedAt = profile.lastSeenAt
    this.markDirty(key)
  }

  completeTutorial(address: string): void {
    const key = address.toLowerCase()
    const profile = this.cache.get(key)
    if (!profile || profile.tutorialCompleted) return

    profile.tutorialCompleted = true
    profile.lastSeenAt = Date.now()
    profile.updatedAt = profile.lastSeenAt
    this.markDirty(key)
  }

  async save(address: string): Promise<boolean> {
    const key = address.toLowerCase()
    const profile = this.cache.get(key)
    if (!profile || !this.dirty.has(key)) return true

    const revision = this.revisions.get(key) ?? 0
    const snapshot: PlayerProfileV1 = {
      ...profile,
      schemaVersion: SCHEMA_VERSION,
      level: getLevelProgress(profile.totalXp).level,
      updatedAt: Date.now()
    }

    let saved = false
    try {
      saved = await Storage.player.set(key, PROFILE_KEY, snapshot)
    } catch (error) {
      console.error(`[PROFILE] save failed address=${key.slice(0, 8)} error=${error}`)
    }
    if (saved && (this.revisions.get(key) ?? 0) === revision) {
      this.dirty.delete(key)
      profile.updatedAt = snapshot.updatedAt
    }
    return saved
  }

  async saveDirty(): Promise<void> {
    const addresses = [...this.dirty]
    if (addresses.length === 0) return
    await Promise.all(addresses.map((address) => this.save(address)))
  }

  async saveAndEvict(address: string): Promise<void> {
    const key = address.toLowerCase()
    const saved = await this.save(key)
    if (!saved || this.dirty.has(key)) return
    this.cache.delete(key)
    this.revisions.delete(key)
  }
}

export function createPlayerProfileStore(): PlayerProfileStore {
  return new PlayerProfileStore()
}

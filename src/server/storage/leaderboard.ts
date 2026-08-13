import { Storage } from '@dcl/sdk/server'
import { getLevelProgress } from '../../shared/progression'
import { PlayerProfileV1 } from './playerProfile'

const LEADERBOARD_PREFIX = 'alienscrapyard_leaderboard_v1_'
const SCHEMA_VERSION = 4
const PAGE_SIZE = 200
const MAX_RECORDS = 1000
const LOAD_ATTEMPTS = 3

interface LeaderboardRecordV1 {
  schemaVersion: number
  wallet: string
  displayName: string
  totalXp: number
  totalRounds: number
  totalMvps: number
  level: number
  dailyKey: string
  dailyPoints: number
  dailyRounds: number
  dailyMvps: number
  weeklyKey: string
  weeklyPoints: number
  weeklyRounds: number
  weeklyMvps: number
  updatedAt: number
}

export interface LeaderboardEntry {
  name: string
  points: number
  level: number
  rounds: number
  mvps: number
}

export interface LeaderboardSnapshot {
  daily: LeaderboardEntry[]
  weekly: LeaderboardEntry[]
  total: LeaderboardEntry[]
  generatedAt: number
}

function safeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function dayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

function weekKey(now = Date.now()): string {
  const date = new Date(now)
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const weekday = thursday.getUTCDay() || 7
  thursday.setUTCDate(thursday.getUTCDate() + 4 - weekday)
  const year = thursday.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function storageKey(address: string): string {
  return `${LEADERBOARD_PREFIX}${address.toLowerCase()}`
}

function normalizeRecord(raw: unknown, address = '', displayName = '', knownTotalMvps = 0): LeaderboardRecordV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const saved = raw as Partial<LeaderboardRecordV1>
  const wallet = typeof saved.wallet === 'string' && saved.wallet ? saved.wallet.toLowerCase() : address.toLowerCase()
  if (!wallet) return null

  const sourceSchemaVersion = safeInt(saved.schemaVersion)
  const dailyPoints = safeInt(saved.dailyPoints)
  const weeklyPoints = safeInt(saved.weeklyPoints)
  const totalXp = Math.max(safeInt(saved.totalXp), dailyPoints, weeklyPoints)
  let totalMvps = Math.max(safeInt(saved.totalMvps), safeInt(knownTotalMvps))
  const dailyKeyValue = typeof saved.dailyKey === 'string' ? saved.dailyKey : ''
  const weeklyKeyValue = typeof saved.weeklyKey === 'string' ? saved.weeklyKey : ''
  const dailyRounds = safeInt(saved.dailyRounds)
  const weeklyRounds = safeInt(saved.weeklyRounds)
  let dailyMvps = safeInt(saved.dailyMvps)
  let weeklyMvps = safeInt(saved.weeklyMvps)

  // Seed legacy period MVPs from durable totals.
  if (sourceSchemaVersion < SCHEMA_VERSION && totalMvps > 0) {
    if (dailyKeyValue === dayKey() && dailyRounds > 0 && dailyMvps === 0) {
      dailyMvps = Math.min(totalMvps, dailyRounds)
    }
    if (weeklyKeyValue === weekKey() && weeklyRounds > 0 && weeklyMvps === 0) {
      weeklyMvps = Math.min(totalMvps, weeklyRounds)
    }
  }

  dailyMvps = Math.min(dailyMvps, dailyRounds)
  weeklyMvps = Math.min(weeklyRounds, Math.max(weeklyMvps, dailyMvps))
  totalMvps = Math.max(totalMvps, weeklyMvps, dailyMvps)

  return {
    schemaVersion: SCHEMA_VERSION,
    wallet,
    displayName: typeof saved.displayName === 'string' && saved.displayName ? saved.displayName : displayName,
    totalXp,
    totalRounds: safeInt(saved.totalRounds),
    totalMvps,
    level: getLevelProgress(totalXp).level,
    dailyKey: dailyKeyValue,
    dailyPoints,
    dailyRounds,
    dailyMvps,
    weeklyKey: weeklyKeyValue,
    weeklyPoints,
    weeklyRounds,
    weeklyMvps,
    updatedAt: safeInt(saved.updatedAt)
  }
}

export class GlobalLeaderboardStore {
  private readonly cache = new Map<string, LeaderboardRecordV1>()
  private readonly dirty = new Set<string>()
  private readonly revisions = new Map<string, number>()

  private markDirty(address: string): void {
    this.dirty.add(address)
    this.revisions.set(address, (this.revisions.get(address) ?? 0) + 1)
  }

  async load(profile: PlayerProfileV1): Promise<number> {
    const address = profile.wallet.toLowerCase()
    const cached = this.cache.get(address)
    if (cached) {
      cached.displayName = profile.displayName || cached.displayName
      cached.totalXp = Math.max(cached.totalXp, cached.dailyPoints, cached.weeklyPoints, profile.totalXp)
      cached.totalRounds = Math.max(cached.totalRounds, profile.roundsPlayed)
      cached.totalMvps = Math.max(cached.totalMvps, profile.mvpAwards)
      cached.level = getLevelProgress(cached.totalXp).level
      this.rollPeriods(cached)
      this.markDirty(address)
      return cached.totalXp
    }

    let raw: unknown = null
    for (let attempt = 1; attempt <= LOAD_ATTEMPTS && raw === null; attempt++) {
      try {
        raw = await Storage.get<unknown>(storageKey(address))
      } catch (error) {
        console.error(`[LEADERBOARD] load attempt=${attempt} failed address=${address.slice(0, 8)} error=${error}`)
      }
    }

    const saved = normalizeRecord(raw, address, profile.displayName, profile.mvpAwards)
    const record: LeaderboardRecordV1 = saved ?? {
      schemaVersion: SCHEMA_VERSION,
      wallet: address,
      displayName: profile.displayName,
      totalXp: profile.totalXp,
      totalRounds: profile.roundsPlayed,
      totalMvps: profile.mvpAwards,
      level: profile.level,
      dailyKey: dayKey(),
      dailyPoints: 0,
      dailyRounds: 0,
      dailyMvps: 0,
      weeklyKey: weekKey(),
      weeklyPoints: 0,
      weeklyRounds: 0,
      weeklyMvps: 0,
      updatedAt: Date.now()
    }

    record.displayName = profile.displayName || record.displayName
    record.totalXp = Math.max(record.totalXp, record.dailyPoints, record.weeklyPoints, profile.totalXp)
    record.totalRounds = Math.max(record.totalRounds, profile.roundsPlayed)
    record.totalMvps = Math.max(record.totalMvps, profile.mvpAwards)
    record.level = getLevelProgress(record.totalXp).level
    this.rollPeriods(record)
    this.cache.set(address, record)
    this.markDirty(address)
    return record.totalXp
  }

  addPoints(address: string, displayName: string, totalXp: number, points: number): void {
    const key = address.toLowerCase()
    const record = this.cache.get(key)
    if (!record) return

    const earned = Math.max(0, Math.floor(points))
    this.rollPeriods(record)
    record.displayName = displayName || record.displayName
    record.dailyPoints += earned
    record.weeklyPoints += earned
    record.totalXp = Math.max(
      record.totalXp,
      record.dailyPoints,
      record.weeklyPoints,
      Math.max(0, Math.floor(totalXp))
    )
    record.level = getLevelProgress(record.totalXp).level
    record.updatedAt = Date.now()
    this.markDirty(key)
  }

  recordRound(address: string, totalRounds: number, totalMvps: number, awardedMvp: boolean): void {
    const key = address.toLowerCase()
    const record = this.cache.get(key)
    if (!record) return

    this.rollPeriods(record)
    record.dailyRounds += 1
    record.weeklyRounds += 1
    if (awardedMvp) {
      record.dailyMvps += 1
      record.weeklyMvps += 1
    }
    record.totalRounds = Math.max(record.totalRounds, Math.max(0, Math.floor(totalRounds)))
    record.totalMvps = Math.max(record.totalMvps, Math.max(0, Math.floor(totalMvps)))
    record.updatedAt = Date.now()
    this.markDirty(key)
  }

  private rollPeriods(record: LeaderboardRecordV1): void {
    const today = dayKey()
    const thisWeek = weekKey()
    if (record.dailyKey !== today) {
      record.dailyKey = today
      record.dailyPoints = 0
      record.dailyRounds = 0
      record.dailyMvps = 0
    }
    if (record.weeklyKey !== thisWeek) {
      record.weeklyKey = thisWeek
      record.weeklyPoints = 0
      record.weeklyRounds = 0
      record.weeklyMvps = 0
    }
  }

  async save(address: string): Promise<boolean> {
    const key = address.toLowerCase()
    const record = this.cache.get(key)
    if (!record || !this.dirty.has(key)) return true

    this.rollPeriods(record)
    const revision = this.revisions.get(key) ?? 0
    const snapshot = { ...record, updatedAt: Date.now() }
    let saved = false
    try {
      saved = await Storage.set(storageKey(key), snapshot)
    } catch (error) {
      console.error(`[LEADERBOARD] save failed address=${key.slice(0, 8)} error=${error}`)
    }
    if (saved && (this.revisions.get(key) ?? 0) === revision) {
      this.dirty.delete(key)
      record.updatedAt = snapshot.updatedAt
    }
    return saved
  }

  async saveDirty(): Promise<void> {
    await Promise.all([...this.dirty].map((address) => this.save(address)))
  }

  async getSnapshot(limit = 10): Promise<LeaderboardSnapshot> {
    const records = new Map<string, LeaderboardRecordV1>()

    try {
      let offset = 0
      while (offset < MAX_RECORDS) {
        const result = await Storage.getValues({ prefix: LEADERBOARD_PREFIX, limit: PAGE_SIZE, offset })
        for (const item of result.data) {
          const record = normalizeRecord(item.value)
          if (record) records.set(record.wallet, record)
        }
        offset += result.data.length
        if (result.data.length === 0 || offset >= result.pagination.total) break
      }
    } catch (error) {
      console.error(`[LEADERBOARD] list failed error=${error}`)
    }

    for (const [address, cached] of this.cache) records.set(address, { ...cached })
    const today = dayKey()
    const thisWeek = weekKey()
    const all = [...records.values()]
    const rank = (
      points: (record: LeaderboardRecordV1) => number,
      rounds: (record: LeaderboardRecordV1) => number,
      mvps: (record: LeaderboardRecordV1) => number
    ): LeaderboardEntry[] => all
      .map((record) => ({
        name: record.displayName,
        points: points(record),
        level: record.level,
        rounds: rounds(record),
        mvps: mvps(record)
      }))
      .filter((entry) => entry.points > 0)
      .sort((a, b) => b.points - a.points || b.level - a.level || a.name.localeCompare(b.name))
      .slice(0, Math.max(1, limit))

    return {
      daily: rank(
        (record) => record.dailyKey === today ? record.dailyPoints : 0,
        (record) => record.dailyKey === today ? record.dailyRounds : 0,
        (record) => record.dailyKey === today ? record.dailyMvps : 0
      ),
      weekly: rank(
        (record) => record.weeklyKey === thisWeek ? record.weeklyPoints : 0,
        (record) => record.weeklyKey === thisWeek ? record.weeklyRounds : 0,
        (record) => record.weeklyKey === thisWeek ? record.weeklyMvps : 0
      ),
      total: rank(
        (record) => record.totalXp,
        (record) => record.totalRounds,
        (record) => record.totalMvps
      ),
      generatedAt: Date.now()
    }
  }
}

export function createGlobalLeaderboardStore(): GlobalLeaderboardStore {
  return new GlobalLeaderboardStore()
}

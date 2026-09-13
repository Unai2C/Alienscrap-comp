// Keep custom events well below the SDK's 12 KiB transport budget.
const CHUNK_CHARACTERS = 900
const MAX_CHUNKS = 256
const TRANSFER_TTL_MS = 30000
let sequence = 0

export function encodeLeaderboard(snapshot: unknown): string[] {
  const characters = Array.from(JSON.stringify(snapshot))
  const total = Math.ceil(characters.length / CHUNK_CHARACTERS)
  if (total > MAX_CHUNKS) throw new Error('Leaderboard exceeds transfer budget')
  const transfer = `${Date.now()}-${++sequence}`
  return Array.from({ length: total }, (_, index) => JSON.stringify({
    leaderboardChunk: 1, transfer, index, total,
    chunk: characters.slice(index * CHUNK_CHARACTERS, (index + 1) * CHUNK_CHARACTERS).join('')
  }))
}

export class LeaderboardReceiver {
  private pending = new Map<string, { created: number; total: number; chunks: Map<number, string> }>()

  receive(json: string, now = Date.now()): unknown | undefined {
    for (const [id, state] of this.pending) {
      if (now - state.created > TRANSFER_TTL_MS) this.pending.delete(id)
    }
    const message = JSON.parse(json)
    // Also accept a complete snapshot from an older server during an update.
    if (message?.leaderboardChunk !== 1) return message
    const { transfer, index, total, chunk } = message
    if (typeof transfer !== 'string' || !Number.isInteger(total) || total < 1 || total > MAX_CHUNKS ||
      !Number.isInteger(index) || index < 0 || index >= total || typeof chunk !== 'string' || chunk.length > CHUNK_CHARACTERS * 2) {
      throw new Error('Invalid leaderboard chunk')
    }
    let state = this.pending.get(transfer)
    if (!state) {
      if (this.pending.size >= 4) this.pending.delete(this.pending.keys().next().value!)
      state = { created: now, total, chunks: new Map() }
      this.pending.set(transfer, state)
    }
    if (state.total !== total) throw new Error('Inconsistent leaderboard transfer')
    state.chunks.set(index, chunk)
    if (state.chunks.size !== total) return undefined
    this.pending.delete(transfer)
    return JSON.parse(Array.from({ length: total }, (_, i) => state!.chunks.get(i)!).join(''))
  }
}

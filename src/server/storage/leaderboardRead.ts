import { getRealm } from '~system/Runtime'
import { signedFetch } from '~system/SignedFetch'

interface StoragePage {
  data: { value: unknown }[]
  pagination: { offset: number; total: number }
}

// Storage.getValues masks HTTP failures as empty pages. Keep failures distinct.
export async function readLeaderboardPage(prefix: string, limit: number, offset: number): Promise<StoragePage> {
  const { realmInfo } = await getRealm({})
  if (!realmInfo) throw new Error('Storage realm unavailable')
  const baseUrl = realmInfo.isPreview ? realmInfo.baseUrl
    : realmInfo.baseUrl.includes('.zone') ? 'https://storage.decentraland.zone' : 'https://storage.decentraland.org'
  const response = await signedFetch({
    url: `${baseUrl}/values?prefix=${encodeURIComponent(prefix)}&limit=${limit}&offset=${offset}`
  })
  if (!response.ok) throw new Error(`Leaderboard storage HTTP ${response.status}`)
  const page = JSON.parse(response.body || '{}') as StoragePage
  if (!Array.isArray(page.data) || !page.pagination || !Number.isFinite(page.pagination.total)) {
    throw new Error('Invalid leaderboard storage response')
  }
  return page
}

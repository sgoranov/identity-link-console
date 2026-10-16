import type { QueryPayload } from './types'
import { DEFAULT_PAGE_SIZE } from '../config'

type Page<T> = {
  items: T[]
  hasMore: boolean
}

// Fetches every page of a query, one after another, e.g. all groups to choose
// from in a form.
export const fetchAllPages = async <T>(
  fetchPage: (payload: QueryPayload) => Promise<Page<T>>,
  payload: QueryPayload,
): Promise<T[]> => {
  const limit = payload.limit ?? DEFAULT_PAGE_SIZE
  const items: T[] = []

  for (let offset = 0; ; offset += limit) {
    const page = await fetchPage({ ...payload, limit, offset })
    items.push(...page.items)
    // An empty page also ends the list, so a wrong hasMore cannot loop forever.
    if (!page.hasMore || page.items.length === 0) return items
  }
}

import { describe, expect, it, vi } from 'vitest'
import type { QueryPayload } from './types'
import { fetchAllPages } from './fetchAllPages'

const payload: QueryPayload = { type: 'Group', alias: 't', limit: 2, orderBy: { 't.name': 'ASC' } }

describe('fetchAllPages', () => {
  it('fetches pages until there are no more and returns all items in order', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ['a', 'b'], hasMore: true })
      .mockResolvedValueOnce({ items: ['c', 'd'], hasMore: true })
      .mockResolvedValueOnce({ items: ['e'], hasMore: false })

    expect(await fetchAllPages(fetchPage, payload)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(fetchPage.mock.calls.map(([page]) => page)).toEqual([
      { ...payload, offset: 0 },
      { ...payload, offset: 2 },
      { ...payload, offset: 4 },
    ])
  })

  it('stops at an empty page even when more are reported', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ['a', 'b'], hasMore: true })
      .mockResolvedValue({ items: [], hasMore: true })

    expect(await fetchAllPages(fetchPage, payload)).toEqual(['a', 'b'])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })
})

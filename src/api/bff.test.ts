import { describe, expect, it } from 'vitest'
import { BFF_BASE_URL, buildBffUrl } from './bff'

const sessionUrl = `${window.location.origin}${BFF_BASE_URL}/session`

describe('buildBffUrl', () => {
  it('builds an absolute URL under the BFF base URL', () => {
    expect(buildBffUrl('/session')).toBe(sessionUrl)
  })

  it('adds a missing leading slash', () => {
    expect(buildBffUrl('session')).toBe(sessionUrl)
  })

  it('adds the query parameters, leaving out undefined ones', () => {
    const url = new URL(
      buildBffUrl('/proxy/authorization-metadata/scopes', {
        audience: 'https://billing.example.com',
        limit: 10,
        active: true,
        cursor: undefined,
      }),
    )

    expect(Object.fromEntries(url.searchParams)).toEqual({
      audience: 'https://billing.example.com',
      limit: '10',
      active: 'true',
    })
  })
})

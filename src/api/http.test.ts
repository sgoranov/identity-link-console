import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { fetchJson } from './http'

const url = 'https://bff.test/resource'

const stubLocation = () => {
  const assign = vi.fn()
  vi.stubGlobal('location', {
    origin: 'https://console.test',
    href: 'https://console.test/admin-console/users',
    assign,
  })
  return assign
}

describe('fetchJson', () => {
  it('returns the parsed JSON response', async () => {
    server.use(http.get(url, () => HttpResponse.json({ id: 1 })))

    await expect(fetchJson(url)).resolves.toEqual({ id: 1 })
  })

  it('sends the body as JSON', async () => {
    let received: { contentType: string | null; body: unknown } | undefined
    server.use(
      http.post(url, async ({ request }) => {
        received = {
          contentType: request.headers.get('content-type'),
          body: await request.json(),
        }
        return HttpResponse.json({})
      }),
    )

    await fetchJson(url, { method: 'POST', body: { name: 'admins' } })

    expect(received).toEqual({
      contentType: 'application/json',
      body: { name: 'admins' },
    })
  })

  it('returns undefined for 204 No Content', async () => {
    server.use(http.delete(url, () => new HttpResponse(null, { status: 204 })))

    await expect(fetchJson(url, { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('uses the error message from the response body', async () => {
    server.use(
      http.post(url, () => HttpResponse.json({ error: 'Username already exists' }, { status: 409 })),
    )

    await expect(fetchJson(url, { method: 'POST', body: {} })).rejects.toThrow(
      'Username already exists',
    )
  })

  it('falls back to a generic message when the body has no error', async () => {
    server.use(http.get(url, () => new HttpResponse('Bad Gateway', { status: 502 })))

    await expect(fetchJson(url)).rejects.toThrow('Request failed with status 502')
  })

  it('rejects 403 responses as Forbidden', async () => {
    server.use(http.get(url, () => new HttpResponse(null, { status: 403 })))

    await expect(fetchJson(url)).rejects.toThrow('Forbidden')
  })

  it('redirects to the login URL provided by the server on 401', async () => {
    const assign = stubLocation()
    server.use(
      http.get(url, () => HttpResponse.json({ loginUrl: '/bff/login' }, { status: 401 })),
    )

    await expect(fetchJson(url)).rejects.toThrow('Unauthorized')
    expect(assign).toHaveBeenCalledWith('https://console.test/bff/login')
  })

  it('redirects to /login with the current page on 401 without a login URL', async () => {
    const assign = stubLocation()
    server.use(http.get(url, () => new HttpResponse(null, { status: 401 })))

    await expect(fetchJson(url)).rejects.toThrow('Unauthorized')

    const redirectUrl = new URL(assign.mock.calls[0][0])
    expect(redirectUrl.pathname).toBe('/login')
    expect(redirectUrl.searchParams.get('redirect')).toBe(
      'https://console.test/admin-console/users',
    )
  })
})

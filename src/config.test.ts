import { describe, expect, it, vi } from 'vitest'

const settings = ['VITE_MAX_USER_GROUPS', 'VITE_BFF_BASE_URL', 'VITE_MAX_CLIENT_GROUPS', 'VITE_DEFAULT_PAGE_SIZE'] as const
type Settings = Partial<Record<(typeof settings)[number], string>>

// config.ts reads the runtime config (window.__APP_CONFIG__, written by
// runtime-config.js) and the build-time environment once, when first imported.
const loadConfig = async ({ runtime, build = {} }: { runtime?: Settings; build?: Settings } = {}) => {
  for (const name of settings) vi.stubEnv(name, build[name])
  vi.stubGlobal('__APP_CONFIG__', runtime)
  vi.resetModules()
  const { BFF_BASE_URL, DEFAULT_PAGE_SIZE, MAX_CLIENT_GROUPS, MAX_USER_GROUPS } = await import('./config')
  return { BFF_BASE_URL, DEFAULT_PAGE_SIZE, MAX_CLIENT_GROUPS, MAX_USER_GROUPS }
}

const defaults = { BFF_BASE_URL: '/bff', DEFAULT_PAGE_SIZE: 10, MAX_CLIENT_GROUPS: 20, MAX_USER_GROUPS: 20 }

const buildSettings: Settings = {
  VITE_BFF_BASE_URL: '/build/bff',
  VITE_DEFAULT_PAGE_SIZE: '25',
  VITE_MAX_CLIENT_GROUPS: '30',
  VITE_MAX_USER_GROUPS: '40',
}

describe('config', () => {
  it('uses the defaults when nothing is configured', async () => {
    expect(await loadConfig()).toEqual(defaults)
  })

  it('uses the build-time settings', async () => {
    expect(await loadConfig({ build: buildSettings })).toEqual({
      BFF_BASE_URL: '/build/bff',
      DEFAULT_PAGE_SIZE: 25,
      MAX_CLIENT_GROUPS: 30,
      MAX_USER_GROUPS: 40,
    })
  })

  it('prefers the runtime config over the build-time settings', async () => {
    const runtime: Settings = {
      VITE_BFF_BASE_URL: '/runtime/bff',
      VITE_DEFAULT_PAGE_SIZE: '50',
      VITE_MAX_CLIENT_GROUPS: '60',
      VITE_MAX_USER_GROUPS: '70',
    }

    expect(await loadConfig({ runtime, build: buildSettings })).toEqual({
      BFF_BASE_URL: '/runtime/bff',
      DEFAULT_PAGE_SIZE: 50,
      MAX_CLIENT_GROUPS: 60,
      MAX_USER_GROUPS: 70,
    })
  })

  it.each(['0', '-5', 'ten'])('uses the default instead of the invalid number "%s"', async (value) => {
    const config = await loadConfig({
      runtime: { VITE_DEFAULT_PAGE_SIZE: value, VITE_MAX_CLIENT_GROUPS: value, VITE_MAX_USER_GROUPS: value },
    })

    expect(config).toEqual(defaults)
  })

  it('rounds fractional numbers down', async () => {
    const config = await loadConfig({ runtime: { VITE_DEFAULT_PAGE_SIZE: '12.7' } })

    expect(config.DEFAULT_PAGE_SIZE).toBe(12)
  })

  // The Docker image writes runtime-config.js with envsubst, which leaves an
  // empty string for every variable that was not set.
  const unsetInDocker: Settings = {
    VITE_BFF_BASE_URL: '',
    VITE_DEFAULT_PAGE_SIZE: '',
    VITE_MAX_CLIENT_GROUPS: '',
    VITE_MAX_USER_GROUPS: '',
  }

  it('uses the defaults when the runtime config leaves every setting empty', async () => {
    expect(await loadConfig({ runtime: unsetInDocker })).toEqual(defaults)
  })

  it('uses the build-time settings when the runtime config leaves them empty', async () => {
    expect(await loadConfig({ runtime: unsetInDocker, build: buildSettings })).toEqual({
      BFF_BASE_URL: '/build/bff',
      DEFAULT_PAGE_SIZE: 25,
      MAX_CLIENT_GROUPS: 30,
      MAX_USER_GROUPS: 40,
    })
  })
})

declare global {
  interface Window {
    __APP_CONFIG__?: {
      VITE_MAX_USER_GROUPS?: string
      VITE_BFF_BASE_URL?: string
      VITE_MAX_CLIENT_GROUPS?: string
      VITE_DEFAULT_PAGE_SIZE?: string
      VITE_ADMINISTRATOR_GROUP?: string
    }
  }
}

const runtime = window.__APP_CONFIG__

const env = {
  VITE_MAX_USER_GROUPS:
    runtime?.VITE_MAX_USER_GROUPS ?? import.meta.env.VITE_MAX_USER_GROUPS,

  VITE_BFF_BASE_URL:
    runtime?.VITE_BFF_BASE_URL ?? import.meta.env.VITE_BFF_BASE_URL,

  VITE_MAX_CLIENT_GROUPS:
    runtime?.VITE_MAX_CLIENT_GROUPS ?? import.meta.env.VITE_MAX_CLIENT_GROUPS,

  VITE_DEFAULT_PAGE_SIZE:
    runtime?.VITE_DEFAULT_PAGE_SIZE ?? import.meta.env.VITE_DEFAULT_PAGE_SIZE,

  VITE_ADMINISTRATOR_GROUP:
    runtime?.VITE_ADMINISTRATOR_GROUP ?? import.meta.env.VITE_ADMINISTRATOR_GROUP,
}

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

export const MAX_USER_GROUPS = parsePositiveInt(
  env.VITE_MAX_USER_GROUPS,
  20,
)

export const BFF_BASE_URL = env.VITE_BFF_BASE_URL ?? "/bff"

export const MAX_CLIENT_GROUPS = parsePositiveInt(
  env.VITE_MAX_CLIENT_GROUPS,
  20,
)

export const DEFAULT_PAGE_SIZE = parsePositiveInt(
  env.VITE_DEFAULT_PAGE_SIZE,
  10,
)

export const ADMINISTRATOR_GROUP =
  env.VITE_ADMINISTRATOR_GROUP ?? "administrator"
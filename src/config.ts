const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

export const MAX_USER_GROUPS = parsePositiveInt(
  import.meta.env.VITE_MAX_USER_GROUPS,
  20,
)

export const BFF_BASE_URL = import.meta.env.VITE_BFF_BASE_URL ?? '/bff'

export const MAX_CLIENT_GROUPS = parsePositiveInt(
  import.meta.env.VITE_MAX_CLIENT_GROUPS,
  20,
)

export const DEFAULT_PAGE_SIZE = parsePositiveInt(
  import.meta.env.VITE_DEFAULT_PAGE_SIZE,
  10,
)

export const ADMINISTRATOR_GROUP = import.meta.env.VITE_ADMINISTRATOR_GROUP ?? 'administrator'

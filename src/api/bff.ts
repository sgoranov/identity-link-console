import { BFF_BASE_URL } from '../config'

type QueryParams = Record<string, string | number | boolean | undefined>

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`)

export const buildBffUrl = (path: string, params?: QueryParams) => {
  const url = new URL(`${BFF_BASE_URL}${normalizePath(path)}`, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}

export const bffQueryKey = (path: string, params?: QueryParams) =>
  params ? [path, params] : [path]

export { BFF_BASE_URL }

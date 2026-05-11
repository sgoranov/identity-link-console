import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'

export interface SessionInfo {
  id: string
  access_token_present: boolean
  refresh_token_present: boolean

  name?: string
  email?: string
}

export const sessionQueryKey = () => ['users.session']

export const fetchSession = async (): Promise<SessionInfo> => {
  const url = buildBffUrl('/session')
  return fetchJson<SessionInfo>(url, { method: 'GET' })
}

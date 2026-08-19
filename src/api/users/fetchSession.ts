import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { Role } from '../../auth/roles'

export interface SessionInfo {
  id: string
  access_token_present: boolean
  refresh_token_present: boolean
  roles: Role[]

  name?: string
  email?: string
}

export const sessionQueryKey = () => ['users.session']

export const fetchSession = async (): Promise<SessionInfo> => {
  const url = buildBffUrl('/session')
  return fetchJson<SessionInfo>(url, { method: 'GET' })
}

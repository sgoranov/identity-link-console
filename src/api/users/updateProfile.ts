import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { UserRecord } from '../../components/Users/UserTable.columns'

export type UpdateProfilePayload = {
  firstName: string
  lastName: string
  email: string
  twoFaEnabled: boolean
  password?: string
}

export const updateProfile = async (payload: UpdateProfilePayload): Promise<UserRecord> => {
  const url = buildBffUrl('/proxy/users/api/v1/profile')

  return await fetchJson<UserRecord>(url, {
    method: 'PUT',
    body: payload,
  })
}

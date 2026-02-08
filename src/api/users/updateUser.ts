import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { UserRecord } from '../../components/Users/UserTable.columns'
import type { CreateUserPayload } from './createUser'

export type UpdateUserPayload = Omit<CreateUserPayload, 'password'> & {
  password?: string
}

export const updateUser = async (
  userId: string,
  payload: UpdateUserPayload,
): Promise<UserRecord> => {
  const url = buildBffUrl(`/proxy/users/api/v1/user/${userId}`)

  return await fetchJson<UserRecord>(url, {
    method: 'PUT',
    body: payload,
  })
}

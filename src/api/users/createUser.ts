import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { UserFormValues } from '../../components/Users/UserFormDrawer'
import type { UserRecord } from '../../components/Users/UserTable.columns'

export type CreateUserPayload = UserFormValues & {
  grantTypes: string[]
  groups: string[]
}

export const createUser = async (payload: CreateUserPayload): Promise<UserRecord> => {
  const url = buildBffUrl('/proxy/users/api/v1/user')

  return await fetchJson<UserRecord>(url, {
    method: 'POST',
    body: payload,
  })
}

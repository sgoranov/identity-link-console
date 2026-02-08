import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { QueryPayload, QueryResponse } from '../types'
import type { UserRecord } from '../../components/Users/UserTable.columns'

export const usersQueryKey = (payload: QueryPayload) => ['users.list', payload]

export type UsersPage = {
  items: UserRecord[]
  hasMore: boolean
}

export const fetchUsers = async (payload: QueryPayload): Promise<UsersPage> => {
  const url = buildBffUrl('/proxy/users/api/v1/query')

  const data = await fetchJson<QueryResponse<UserRecord>>(url, {
    method: 'POST',
    body: payload,
  })

  return {
    items: data.response.result,
    hasMore: data.response.hasMore,
  }
}

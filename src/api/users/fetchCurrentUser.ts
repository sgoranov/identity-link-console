import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { UserRecord } from '../../components/Users/UserTable.columns'

interface UserQueryResponse {
  response: {
    result: UserRecord[]
    hasMore: boolean
  }
}

export const currentUserQueryKey = (id: string | undefined) => ['users.current', id]

export const fetchCurrentUser = async (id: string): Promise<UserRecord> => {
  const url = buildBffUrl('/proxy/users/api/v1/query')

  const payload = {
    type: 'User',
    alias: 't',
    query: 't.id = :id',
    parameters: { id },
    limit: 1,
  }

  const data = await fetchJson<UserQueryResponse>(url, {
    method: 'POST',
    body: payload,
  })

  return data.response.result[0]
}

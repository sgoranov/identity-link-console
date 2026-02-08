import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import { MAX_USER_GROUPS } from '../../config'
import type { QueryPayload, QueryResponse } from '../types'
import type { UserRecord } from '../../components/Users/UserTable.columns'

export const groupUsersQueryKey = (groupId: string) => ['groups.users', groupId]

export type GroupUsersPage = {
  items: UserRecord[]
  hasMore: boolean
}

export const fetchGroupUsers = async (groupId: string): Promise<GroupUsersPage> => {
  const url = buildBffUrl('/proxy/users/api/v1/query')

  const payload: QueryPayload = {
    type: 'User',
    alias: 't',
    joins: { g: 't.groups' },
    query: 'g.id = :groupId',
    parameters: { groupId },
    limit: MAX_USER_GROUPS,
  }

  const data = await fetchJson<QueryResponse<UserRecord>>(url, {
    method: 'POST',
    body: payload,
  })

  return {
    items: data.response.result,
    hasMore: data.response.hasMore,
  }
}

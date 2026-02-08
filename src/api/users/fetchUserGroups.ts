import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import { MAX_USER_GROUPS } from '../../config'
import type { QueryPayload, QueryResponse, Group } from '../types'

export const userGroupsQueryKey = (username: string) => ['users.groups', username]

export const fetchUserGroups = async (username: string): Promise<Group[]> => {
  const url = buildBffUrl('/proxy/users/api/v1/query')

  const payload: QueryPayload = {
    type: 'Group',
    alias: 't',
    joins: { u: 't.users' },
    query: 'u.username = :username',
    parameters: { username },
    limit: MAX_USER_GROUPS,
  }

  const data = await fetchJson<QueryResponse<Group>>(url, {
    method: 'POST',
    body: payload,
  })

  return data.response.result
}

import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { QueryPayload, QueryResponse, Group } from '../types'
import { DEFAULT_PAGE_SIZE } from '../../config'

export const groupsQueryKey = (payload: QueryPayload) => ['groups.list', payload]

const defaultPayload: QueryPayload = {
  type: 'Group',
  alias: 't',
  limit: DEFAULT_PAGE_SIZE,
  offset: 0,
  orderBy: { 't.id': 'DESC' },
}

export type GroupsPage = {
  items: Group[]
  hasMore: boolean
}

export const fetchGroups = async (
  payload: QueryPayload = defaultPayload,
): Promise<GroupsPage> => {
  const url = buildBffUrl('/proxy/users/api/v1/query')

  const data = await fetchJson<QueryResponse<Group>>(url, {
    method: 'POST',
    body: payload,
  })

  return {
    items: data.response.result,
    hasMore: data.response.hasMore,
  }
}

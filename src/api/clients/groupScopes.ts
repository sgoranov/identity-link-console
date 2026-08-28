import { buildBffUrl } from '../bff'
import { fetchJson } from '../http'
import type { GroupScope } from '../types'

type ScopeResponse = { response: { scope: GroupScope } }
type ScopesResponse = {
  response: { scopes: GroupScope[] | Record<string, GroupScope> }
}

export type CreateClientGroupScopePayload = Pick<GroupScope, 'audience' | 'scope'>

export const clientGroupScopesQueryKey = (groupId: string) => [
  'clients.groups.scopes',
  groupId,
]

export const fetchClientGroupScopes = async (groupId: string): Promise<GroupScope[]> => {
  const data = await fetchJson<ScopesResponse>(
    buildBffUrl(`/proxy/clients/api/v1/group/${groupId}/scope`),
  )
  return Array.isArray(data.response.scopes)
    ? data.response.scopes
    : Object.values(data.response.scopes ?? {})
}

export const createClientGroupScope = async (
  groupId: string,
  payload: CreateClientGroupScopePayload,
): Promise<GroupScope> => {
  const data = await fetchJson<ScopeResponse>(
    buildBffUrl(`/proxy/clients/api/v1/group/${groupId}/scope`),
    { method: 'POST', body: payload },
  )
  return data.response.scope
}

export const deleteClientGroupScope = async (
  groupId: string,
  scopeId: string,
): Promise<void> => {
  await fetchJson(buildBffUrl(`/proxy/clients/api/v1/group/${groupId}/scope/${scopeId}`), {
    method: 'DELETE',
  })
}

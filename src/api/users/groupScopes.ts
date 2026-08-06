import { buildBffUrl } from '../bff'
import { fetchJson } from '../http'
import type { GroupScope } from '../types'

type ScopeResponse = {
  response: {
    scope: GroupScope
  }
}

type ScopesResponse = {
  response: {
    scopes: GroupScope[] | Record<string, GroupScope>
  }
}

export type CreateGroupScopePayload = Pick<GroupScope, 'audience' | 'scope'>

export const groupScopesQueryKey = (groupId: string) => ['groups.scopes', groupId]

export const fetchGroupScopes = async (groupId: string): Promise<GroupScope[]> => {
  const data = await fetchJson<ScopesResponse>(
    buildBffUrl(`/proxy/users/api/v1/group/${groupId}/scope`),
  )

  const scopes = data.response.scopes
  return Array.isArray(scopes) ? scopes : Object.values(scopes ?? {})
}

export const createGroupScope = async (
  groupId: string,
  payload: CreateGroupScopePayload,
): Promise<GroupScope> => {
  const data = await fetchJson<ScopeResponse>(
    buildBffUrl(`/proxy/users/api/v1/group/${groupId}/scope`),
    { method: 'POST', body: payload },
  )

  return data.response.scope
}

export const deleteGroupScope = async (groupId: string, scopeId: string): Promise<void> => {
  await fetchJson(buildBffUrl(`/proxy/users/api/v1/group/${groupId}/scope/${scopeId}`), {
    method: 'DELETE',
  })
}

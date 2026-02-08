import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { Group } from '../types'

export type UpdateGroupPayload = {
  name: string
}

export const updateGroup = async (
  groupId: string,
  payload: UpdateGroupPayload,
): Promise<Group> => {
  const url = buildBffUrl(`/proxy/users/api/v1/group/${groupId}`)

  return await fetchJson<Group>(url, {
    method: 'PUT',
    body: payload,
  })
}

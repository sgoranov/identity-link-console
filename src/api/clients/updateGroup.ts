import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { Group } from '../types'

export type UpdateClientGroupPayload = {
  name: string
}

export const updateClientGroup = async (
  groupId: string,
  payload: UpdateClientGroupPayload,
): Promise<Group> => {
  const url = buildBffUrl(`/proxy/clients/api/v1/group/${groupId}`)

  return await fetchJson<Group>(url, {
    method: 'PUT',
    body: payload,
  })
}

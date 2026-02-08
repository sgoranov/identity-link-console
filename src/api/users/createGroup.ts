import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { Group } from '../types'

export type CreateGroupPayload = {
  name: string
}

export const createGroup = async (payload: CreateGroupPayload): Promise<Group> => {
  const url = buildBffUrl('/proxy/users/api/v1/group')

  return await fetchJson<Group>(url, {
    method: 'POST',
    body: payload,
  })
}

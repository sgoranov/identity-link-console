import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { Group } from '../types'

export type CreateClientGroupPayload = {
  name: string
}

export const createClientGroup = async (
  payload: CreateClientGroupPayload,
): Promise<Group> => {
  const url = buildBffUrl('/proxy/clients/api/v1/group')

  return await fetchJson<Group>(url, {
    method: 'POST',
    body: payload,
  })
}

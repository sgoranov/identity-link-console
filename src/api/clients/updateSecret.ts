import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { ClientSecretRecord } from './fetchClientSecrets'

export type UpdateClientSecretPayload = {
  id: string
  passwordHint?: string
}

export const updateClientSecret = async (
  payload: UpdateClientSecretPayload,
): Promise<ClientSecretRecord> => {
  const url = buildBffUrl('/proxy/clients/api/v1/secret')

  return await fetchJson<ClientSecretRecord>(url, {
    method: 'PUT',
    body: payload,
  })
}

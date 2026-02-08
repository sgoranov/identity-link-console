import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { ClientRecord } from '../../components/Clients/ClientTable.columns'

export type CreateClientPayload = {
  name: string
  description: string
  redirectUri: string[]
  groups: string[]
  grantTypes: string[]
  scopes: string[]
  isPublic: boolean
}

export const createClient = async (payload: CreateClientPayload): Promise<ClientRecord> => {
  const url = buildBffUrl('/proxy/clients/api/v1/client')

  return await fetchJson<ClientRecord>(url, {
    method: 'POST',
    body: payload,
  })
}

import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { ClientRecord } from '../../components/Clients/ClientTable.columns'
import type { CreateClientPayload } from './createClient'

export type UpdateClientPayload = Omit<CreateClientPayload, 'isPublic'>

export const updateClient = async (
  clientId: string,
  payload: UpdateClientPayload,
): Promise<ClientRecord> => {
  const url = buildBffUrl(`/proxy/clients/api/v1/client/${clientId}`)

  return await fetchJson<ClientRecord>(url, {
    method: 'PUT',
    body: payload,
  })
}

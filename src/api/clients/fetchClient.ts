import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { QueryPayload, QueryResponse } from '../types'
import type { ClientRecord } from '../../components/Clients/ClientTable.columns'

export const clientQueryKey = (clientId: string) => ['clients.detail', clientId]

export const fetchClient = async (clientId: string): Promise<ClientRecord> => {
  const url = buildBffUrl('/proxy/clients/api/v1/query')

  const payload: QueryPayload = {
    type: 'Client',
    alias: 't',
    query: 't.id = :id',
    parameters: { id: clientId },
    limit: 1,
  }

  const data = await fetchJson<QueryResponse<ClientRecord>>(url, {
    method: 'POST',
    body: payload,
  })

  return data.response.result[0]
}

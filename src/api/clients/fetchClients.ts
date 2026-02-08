import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { QueryPayload, QueryResponse } from '../types'
import type { ClientRecord } from '../../components/Clients/ClientTable.columns'
import { DEFAULT_PAGE_SIZE } from '../../config'

export const clientsQueryKey = (payload: QueryPayload) => ['clients.list', payload]

const defaultPayload: QueryPayload = {
  type: 'Client',
  alias: 't',
  limit: DEFAULT_PAGE_SIZE,
  offset: 0,
}

export type ClientsPage = {
  items: ClientRecord[]
  hasMore: boolean
}

export const fetchClients = async (
  payload: QueryPayload = defaultPayload,
): Promise<ClientsPage> => {
  const url = buildBffUrl('/proxy/clients/api/v1/query')

  const data = await fetchJson<QueryResponse<ClientRecord>>(url, {
    method: 'POST',
    body: payload,
  })

  return {
    items: data.response.result,
    hasMore: data.response.hasMore,
  }
}

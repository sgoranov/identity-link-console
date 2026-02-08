import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import { MAX_CLIENT_GROUPS } from '../../config'
import type { QueryPayload, QueryResponse } from '../types'

type ClientRecord = {
  id: string
  name?: string
  clientId?: string
}

export const clientGroupClientsQueryKey = (groupId: string) => ['clients.groups.clients', groupId]

export type ClientGroupClientsPage = {
  items: ClientRecord[]
  hasMore: boolean
}

export const fetchClientGroupClients = async (
  groupId: string,
): Promise<ClientGroupClientsPage> => {
  const url = buildBffUrl('/proxy/clients/api/v1/query')

  const payload: QueryPayload = {
    type: 'Client',
    alias: 't',
    joins: { g: 't.groups' },
    query: 'g.id = :groupId',
    parameters: { groupId },
    limit: MAX_CLIENT_GROUPS,
  }

  const data = await fetchJson<QueryResponse<ClientRecord>>(url, {
    method: 'POST',
    body: payload,
  })

  return {
    items: data.response.result,
    hasMore: data.response.hasMore,
  }
}

import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'
import type { QueryPayload, QueryResponse } from '../types'
import { DEFAULT_PAGE_SIZE } from '../../config'

export type ClientSecretRecord = {
  id: string
  passwordHint?: string | null
  expirationDateTime?: string | null
  expirationPeriod?: string | null
  isSystem?: boolean
}

export const clientSecretsQueryKey = (clientId: string, payload: QueryPayload) => [
  'clients.secrets.list',
  clientId,
  payload,
]

const defaultPayload: QueryPayload = {
  type: 'Secret',
  alias: 't',
  limit: DEFAULT_PAGE_SIZE,
  offset: 0,
}

export type ClientSecretsPage = {
  items: ClientSecretRecord[]
  hasMore: boolean
}

export const fetchClientSecrets = async (
  clientId: string,
  payload: QueryPayload = defaultPayload,
): Promise<ClientSecretsPage> => {
  const url = buildBffUrl('/proxy/clients/api/v1/query')

  const requestPayload: QueryPayload = {
    ...payload,
    joins: { c: 't.client' },
    query: 'c.id = :id',
    parameters: { ...payload.parameters, id: clientId },
  }

  const data = await fetchJson<QueryResponse<ClientSecretRecord>>(url, {
    method: 'POST',
    body: requestPayload,
  })

  return {
    items: data.response.result,
    hasMore: data.response.hasMore,
  }
}

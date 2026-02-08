import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'

export type CreateClientSecretPayload = {
  client: string
  passwordHint?: string
  expirationPeriod: string
}

export type CreatedClientSecret = {
  password: string
  passwordHint?: string
  expirationDateTime?: string | null
  expirationPeriod?: string | null
  client: string
}

type CreateSecretResponse = {
  response: {
    secret: CreatedClientSecret
  }
}

export const createClientSecret = async (
  payload: CreateClientSecretPayload,
): Promise<CreatedClientSecret> => {
  const url = buildBffUrl('/proxy/clients/api/v1/secret/issue')

  const data = await fetchJson<CreateSecretResponse>(url, {
    method: 'POST',
    body: payload,
  })

  return data.response.secret
}

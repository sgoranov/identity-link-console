import { buildBffUrl } from './bff'
import { fetchJson } from './http'

type AudiencesResponse = {
  audiences: string[]
}

export type AuthorizationOption = {
  description?: string
  scopes?: string[]
}

export type AuthorizationScopes = {
  scopes: Record<string, AuthorizationOption>
  aliases: Record<string, AuthorizationOption>
}

export const audiencesQueryKey = ['authorization.audiences']
export const authorizationScopesQueryKey = (audience: string) => [
  'authorization.scopes',
  audience,
]

// The IDP authorization API is exposed to the BFF proxy as the
// "authorization-metadata" service. The configured base URL already includes
// /api/v1/authorization.
export const fetchAuthorizationAudiences = async (): Promise<string[]> => {
  const data = await fetchJson<AudiencesResponse>(
    buildBffUrl('/proxy/authorization-metadata/audiences'),
  )
  return data.audiences
}

export const fetchAuthorizationScopes = async (
  audience: string,
): Promise<AuthorizationScopes> => {
  return await fetchJson<AuthorizationScopes>(
    buildBffUrl('/proxy/authorization-metadata/scopes', { audience }),
  )
}

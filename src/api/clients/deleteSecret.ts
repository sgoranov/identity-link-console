import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'

export const deleteClientSecret = async (secretId: string): Promise<void> => {
  const url = buildBffUrl(`/proxy/clients/api/v1/secret/${secretId}`)

  await fetchJson<void>(url, {
    method: 'DELETE',
  })
}

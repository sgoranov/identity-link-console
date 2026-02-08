import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'

export const deleteClient = async (clientId: string): Promise<void> => {
  const url = buildBffUrl(`/proxy/clients/api/v1/client/${clientId}`)

  await fetchJson<void>(url, {
    method: 'DELETE',
  })
}

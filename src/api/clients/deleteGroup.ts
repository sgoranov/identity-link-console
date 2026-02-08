import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'

export const deleteClientGroup = async (groupId: string): Promise<void> => {
  const url = buildBffUrl(`/proxy/clients/api/v1/group/${groupId}`)

  await fetchJson<void>(url, {
    method: 'DELETE',
  })
}

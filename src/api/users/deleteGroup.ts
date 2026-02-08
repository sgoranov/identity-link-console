import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'

export const deleteGroup = async (groupId: string): Promise<void> => {
  const url = buildBffUrl(`/proxy/users/api/v1/group/${groupId}`)

  await fetchJson<void>(url, {
    method: 'DELETE',
  })
}

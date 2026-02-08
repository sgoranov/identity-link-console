import { fetchJson } from '../http'
import { buildBffUrl } from '../bff'

export const deleteUser = async (userId: string): Promise<void> => {
  const url = buildBffUrl(`/proxy/users/api/v1/user/${userId}`)

  await fetchJson<void>(url, {
    method: 'DELETE',
  })
}

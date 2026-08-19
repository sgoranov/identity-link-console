import { useQuery } from '@tanstack/react-query'
import { fetchSession, sessionQueryKey, type SessionInfo } from '../api/users/fetchSession'
import { fetchCurrentUser, currentUserQueryKey } from '../api/users/fetchCurrentUser'
import { hasRole as sessionHasRole, type Role } from '../auth/roles'

type UseUserOptions = {
  enabled?: boolean
}

export const useUser = (options: UseUserOptions = {}) => {
  const enabled = options.enabled ?? true

  // 1. Check if we have a session
  const sessionQuery = useQuery({
    queryKey: sessionQueryKey(),
    queryFn: fetchSession,
    enabled,
  })

  // 2. Fetch current user data if we have an ID
  const userQuery = useQuery({
    queryKey: currentUserQueryKey(sessionQuery.data?.id),
    queryFn: () => fetchCurrentUser(sessionQuery.data!.id),
    enabled: enabled && !!sessionQuery.data?.id, // Only run if we have an ID
  })

  const session = sessionQuery.data as SessionInfo | undefined
  const displayName = session?.name
  const roles = session?.roles ?? []
  const hasRole = (role: Role) => sessionHasRole(roles, role)

  return {
    session,
    user: userQuery.data,
    roles,
    hasRole,
    displayName,
    isLoading: enabled && (sessionQuery.isLoading || userQuery.isLoading),
    isLoggedIn: enabled && !!sessionQuery.data?.access_token_present,
  }
}

import { useQuery } from '@tanstack/react-query'
import { fetchSession, sessionQueryKey, type SessionInfo } from '../api/users/fetchSession'
import { fetchCurrentUser, currentUserQueryKey } from '../api/users/fetchCurrentUser'
import { fetchUserGroups, userGroupsQueryKey } from '../api/users/fetchUserGroups'
import { ADMINISTRATOR_GROUP } from '../config'

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

  // 3. Fetch user groups to get their names for admin check
  const groupsQuery = useQuery({
    queryKey: userGroupsQueryKey(userQuery.data?.username ?? ''),
    queryFn: () => fetchUserGroups(userQuery.data!.username),
    enabled: enabled && !!userQuery.data?.username,
  })

  const isAdmin = groupsQuery.data?.some(g => g.name === ADMINISTRATOR_GROUP) ?? false

  const session = sessionQuery.data as SessionInfo | undefined
  const displayName = session?.name

  return {
    session,
    user: userQuery.data,
    groups: groupsQuery.data ?? [],
    displayName,
    isLoading: enabled && (sessionQuery.isLoading || userQuery.isLoading || groupsQuery.isLoading),
    isLoggedIn: enabled && !!sessionQuery.data?.access_token_present,
    isAdmin,
  }
}

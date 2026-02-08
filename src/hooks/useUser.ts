import { useQuery } from '@tanstack/react-query'
import { fetchSession, sessionQueryKey } from '../api/users/fetchSession'
import { fetchCurrentUser, currentUserQueryKey } from '../api/users/fetchCurrentUser'

export const useUser = () => {
  // 1. Check if we have a session
  const sessionQuery = useQuery({
    queryKey: sessionQueryKey(),
    queryFn: fetchSession,
  })

  const userQuery = useQuery({
    queryKey: currentUserQueryKey(sessionQuery.data?.id),
    queryFn: () => fetchCurrentUser(sessionQuery.data!.id),
    enabled: !!sessionQuery.data?.id, // Only run if we have an ID
  })

  return {
    user: userQuery.data,
    isLoading: sessionQuery.isLoading || userQuery.isLoading,
    isLoggedIn: !!sessionQuery.data?.access_token_present,
  }
}

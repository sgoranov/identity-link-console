import {
  createRootRouteWithContext,
  createRoute,
  lazyRouteComponent,
  redirect,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Button, Result, Spin, Typography } from 'antd'
import { UnauthorizedError } from './api/http'
import { fetchSession, sessionQueryKey } from './api/users/fetchSession'
import { fetchCurrentUser, currentUserQueryKey } from './api/users/fetchCurrentUser'
import { hasRole, type Role } from './auth/roles'
import { m } from './paraglide/messages'
import RootLayout from './components/RootLayout'

export type RouterContext = {
  queryClient: QueryClient
}

// Replaces the whole app when the session cannot be verified, e.g. because the
// BFF is down, and when a page fails to load or render.
const RootError = ({ error }: ErrorComponentProps) => {
  const router = useRouter()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f6f8',
      }}
    >
      <Result
        status="error"
        title={m.layoutErrorTitle()}
        subTitle={error instanceof Error ? error.message : m.mainUnexpectedError()}
        extra={
          // Runs the session check and the page's loading again.
          <Button type="primary" onClick={() => router.invalidate()}>
            {m.layoutTryAgain()}
          </Button>
        }
      />
    </div>
  )
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  // This shows a full-page loading state while beforeLoad is running
  pendingComponent: () => (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        background: '#f5f6f8',
      }}
    >
      <Spin size="large" />
      <Typography.Text type="secondary">{m.layoutVerifyingSession()}</Typography.Text>
    </div>
  ),
  errorComponent: RootError,
  // Global guard: verify the session and fetch user before rendering the layout
  beforeLoad: async ({ context, location }) => {
    if (location.pathname === '/logout-success') {
      return
    }

    try {
      // 1. Ensure session exists
      const session = await context.queryClient.ensureQueryData({
        queryKey: sessionQueryKey(),
        queryFn: fetchSession,
      })

      // 2. Ensure current user data is loaded
      if (session.id) {
        try {
          await context.queryClient.ensureQueryData({
            queryKey: currentUserQueryKey(session.id),
            queryFn: () => fetchCurrentUser(session.id),
          })
        } catch (error) {
          console.warn('Failed to fetch current user (likely not an admin):', error)
        }
      }
    } catch (error) {
      // The browser is already on its way to the login page. Keep showing the
      // pending screen until it gets there, instead of an error.
      if (error instanceof UnauthorizedError) return new Promise<never>(() => {})

      console.error('Session verification failed:', error)
      throw error
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./pages/ProfilePage')),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: lazyRouteComponent(() => import('./pages/ProfilePage')),
})

const logoutSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/logout-success',
  component: lazyRouteComponent(() => import('./pages/LogoutSuccessPage')),
})

const requireRole = (role: Role) => async ({ context, location }: { context: RouterContext; location: any }) => {
  const session = await context.queryClient.ensureQueryData({
    queryKey: sessionQueryKey(),
    queryFn: fetchSession,
  })

  if (!session?.id) {
    throw redirect({
      to: '/',
      search: {
        redirect: location.href,
      },
    })
  }

  if (!hasRole(session.roles, role)) {
    throw redirect({
      to: '/',
      search: {
        redirect: location.href,
      },
    })
  }
}

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients',
  beforeLoad: requireRole('clients.read'),
  component: lazyRouteComponent(() => import('./pages/ClientsPage')),
})

const clientGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/client-groups',
  beforeLoad: requireRole('clients.groups.read'),
  component: lazyRouteComponent(() => import('./pages/ClientGroupsPage')),
})

const clientSecretsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients/$clientId/secrets',
  beforeLoad: requireRole('clients.secrets.read'),
  component: lazyRouteComponent(() => import('./pages/ClientSecretsPage')),
})

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  beforeLoad: requireRole('users.read'),
  component: lazyRouteComponent(() => import('./pages/UsersPage')),
})

const userGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user-groups',
  beforeLoad: requireRole('users.groups.read'),
  component: lazyRouteComponent(() => import('./pages/UserGroupsPage')),
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  profileRoute,
  logoutSuccessRoute,
  clientsRoute,
  clientGroupsRoute,
  clientSecretsRoute,
  usersRoute,
  userGroupsRoute,
])

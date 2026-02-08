import { createRootRouteWithContext, createRoute } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Spin, Typography } from 'antd'
import { fetchSession, sessionQueryKey } from './api/users/fetchSession'
import RootLayout from './components/RootLayout'
import HomePage from './pages/HomePage'
import ClientsPage from './pages/ClientsPage'
import UsersPage from './pages/UsersPage'
import UserGroupsPage from './pages/UserGroupsPage'
import ClientGroupsPage from './pages/ClientGroupsPage'
import ClientSecretsPage from './pages/ClientSecretsPage'

export type RouterContext = {
  queryClient: QueryClient
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
      <Typography.Text type="secondary">Verifying session...</Typography.Text>
    </div>
  ),
  // Global guard: verify the session before rendering the layout
  beforeLoad: async ({ context }) => {
    try {
      // ensureQueryData checks the cache first, then fetches if empty.
      // If the user is not logged in, fetchJson will hit a 401 and
      // trigger the window.location.assign redirect to Symfony.
      await context.queryClient.ensureQueryData({
        queryKey: sessionQueryKey(),
        queryFn: fetchSession,
      })
    } catch (error) {
      // We log the error and stop the route transition.
      // The browser is likely already redirecting via fetchJson interceptor.
      console.error('Authentication check failed:', error)
      throw error
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients',
  component: ClientsPage,
})

const clientGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/client-groups',
  component: ClientGroupsPage,
})

const clientSecretsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients/$clientId/secrets',
  component: ClientSecretsPage,
})

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UsersPage,
})

const userGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user-groups',
  component: UserGroupsPage,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  clientsRoute,
  clientGroupsRoute,
  clientSecretsRoute,
  usersRoute,
  userGroupsRoute,
])

import { createRootRouteWithContext, createRoute, lazyRouteComponent, redirect, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Spin, Typography } from 'antd'
import { fetchSession, sessionQueryKey } from './api/users/fetchSession'
import { fetchCurrentUser, currentUserQueryKey } from './api/users/fetchCurrentUser'
import { fetchUserGroups, userGroupsQueryKey } from './api/users/fetchUserGroups'
import { ADMINISTRATOR_GROUP } from './config'
import { m } from './paraglide/messages'
// Vite dev server can occasionally get into a bad HMR/cached state where it thinks a module
// doesn't have a default export (even when it does). Importing the namespace avoids a hard
// ESM linking error that would otherwise blank the page.
import * as RootLayoutModule from './components/RootLayout'

export type RouterContext = {
  queryClient: QueryClient
}

const RootLayout =
  (RootLayoutModule as any).default ??
  (RootLayoutModule as any).RootLayout

if (!RootLayout) {
  const keys = Object.keys(RootLayoutModule as any)
  console.error(
    `RootLayout module had no exports. ` +
      `This is usually a Vite dev-server cache/transform issue. ` +
      `Exports: ${keys.length ? keys.join(', ') : '(none)'}`
  )
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  // If RootLayout fails to load (e.g. Vite dev-server served an empty module),
  // fall back to a minimal layout so the app doesn't hard-crash into a blank page.
  component:
    RootLayout ??
    (() => (
      <div style={{ minHeight: '100vh', padding: 24 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          IdentityLink
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {m.layoutLoadFailed()}
        </Typography.Paragraph>
        <div style={{ marginTop: 16 }}>
          <Outlet />
        </div>
      </div>
    )),
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

// Administrative guard for restricted routes
const adminBeforeLoad = async ({ context, location }: { context: RouterContext; location: any }) => {
  // Keep the guard logic consistent with src/hooks/useUser.ts:
  // admin status is derived from the user's group names fetched via fetchUserGroups(username).
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

  const user = await context.queryClient.ensureQueryData({
    queryKey: currentUserQueryKey(session.id),
    queryFn: () => fetchCurrentUser(session.id),
  })

  const groups = await context.queryClient.ensureQueryData({
    queryKey: userGroupsQueryKey(user.username),
    queryFn: () => fetchUserGroups(user.username),
  })

  const isAdmin = groups?.some((g) => g.name === ADMINISTRATOR_GROUP) ?? false

  if (!isAdmin) {
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
  beforeLoad: adminBeforeLoad,
  component: lazyRouteComponent(() => import('./pages/ClientsPage')),
})

const clientGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/client-groups',
  beforeLoad: adminBeforeLoad,
  component: lazyRouteComponent(() => import('./pages/ClientGroupsPage')),
})

const clientSecretsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients/$clientId/secrets',
  beforeLoad: adminBeforeLoad,
  component: lazyRouteComponent(() => import('./pages/ClientSecretsPage')),
})

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  beforeLoad: adminBeforeLoad,
  component: lazyRouteComponent(() => import('./pages/UsersPage')),
})

const userGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user-groups',
  beforeLoad: adminBeforeLoad,
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

import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Role } from './auth/roles'
import { m } from './paraglide/messages'
import { aClient, admin, allRolesExcept, aSession } from './test/fixtures'
import { setupFakeBff } from './test/bff'
import { stubLocationAssign } from './test/location'
import { renderRoute } from './test/render'

const protectedRoutes: Array<{ path: string; role: Role; heading: () => string }> = [
  { path: '/users', role: 'users.read', heading: () => m.usersTitle() },
  { path: '/user-groups', role: 'users.groups.read', heading: () => m.userGroupsTitle() },
  { path: '/clients', role: 'clients.read', heading: () => m.clientsTitle() },
  { path: '/client-groups', role: 'clients.groups.read', heading: () => m.clientGroupsTitle() },
  { path: '/clients/billing-id/secrets', role: 'clients.secrets.read', heading: () => m.clientSecretsTitle() },
]

const seedFor = (roles: Role[]) => ({
  session: aSession({ id: admin.id, roles }),
  clients: [aClient({ id: 'billing-id' })],
})

describe('route guards', () => {
  it.each(protectedRoutes)('opens $path for a user with $role', async ({ path, role, heading }) => {
    setupFakeBff(seedFor([role]))

    const { router } = renderRoute(path)

    expect(await screen.findByRole('heading', { name: heading() })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(path)
  })

  it.each(protectedRoutes)('redirects $path to the profile without $role', async ({ path, role, heading }) => {
    setupFakeBff(seedFor(allRolesExcept(role)))

    const { router } = renderRoute(path)

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(router.state.location.search).toEqual({ redirect: path })
    expect(await screen.findByText(m.profileAccount())).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: heading() })).not.toBeInTheDocument()
  })

  it('opens the profile for a signed-in user without any roles', async () => {
    setupFakeBff(seedFor([]))

    renderRoute('/')

    expect(await screen.findByText(m.profileAccount())).toBeInTheDocument()
  })

  it('sends the user to the login page when the session has expired', async () => {
    const assign = stubLocationAssign()
    setupFakeBff({ session: null })

    renderRoute('/users')

    await waitFor(() => expect(assign).toHaveBeenCalledWith(`${window.location.origin}/bff/login`))
    // Until the login page loads, the session is still being verified rather
    // than reported as an error.
    expect(await screen.findByText(m.layoutVerifyingSession())).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: m.usersTitle() })).not.toBeInTheDocument()
  })

  it('shows the logout page without checking the session', async () => {
    const bff = setupFakeBff({ session: null })

    renderRoute('/logout-success')

    expect(await screen.findByText(m.logoutSuccessTitle())).toBeInTheDocument()
    expect(bff.requests.filter((request) => request.path === '/session')).toEqual([])
  })
})

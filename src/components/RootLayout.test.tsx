import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ROLES, type Role } from '../auth/roles'
import { BFF_LOGOUT_URL } from '../auth/urls'
import { m } from '../paraglide/messages'
import { setLocale } from '../paraglide/runtime'
import { chooseOption } from '../test/antd'
import { setupFakeBff } from '../test/bff'
import { admin, allRolesExcept, aSession } from '../test/fixtures'
import { stubLocationAssign } from '../test/location'
import { renderRoute } from '../test/render'
import { setViewportWidth } from '../test/viewport'

// On a phone-sized screen, the default in tests, the menu lives in a drawer
// behind the menu button.
const openMenu = async ({ roles = [...ROLES], path = '/' }: { roles?: Role[]; path?: string } = {}) => {
  setupFakeBff({ session: aSession({ id: admin.id, name: 'Grace Hopper', roles }) })
  const user = userEvent.setup()
  const { router } = renderRoute(path)
  await user.click(await screen.findByRole('button', { name: 'menu' }))
  const drawer = await screen.findByRole('dialog')
  return { user, drawer, router }
}

// sibling is the other entry in the same section, used to prove the section
// was expanded when checking that an entry is hidden.
const menuEntries: Array<{ section: () => string; entry: () => string; sibling: () => string; role: Role }> = [
  { section: () => m.usersTitle(), entry: () => m.layoutUsersList(), sibling: () => m.userGroupsTitle(), role: 'users.read' },
  { section: () => m.usersTitle(), entry: () => m.userGroupsTitle(), sibling: () => m.layoutUsersList(), role: 'users.groups.read' },
  { section: () => m.clientsTitle(), entry: () => m.layoutClientsList(), sibling: () => m.clientGroupsTitle(), role: 'clients.read' },
  { section: () => m.clientsTitle(), entry: () => m.clientGroupsTitle(), sibling: () => m.layoutClientsList(), role: 'clients.groups.read' },
]

describe('RootLayout menu', () => {
  it('only shows the profile to a user without roles', async () => {
    const { drawer } = await openMenu({ roles: [] })

    expect(within(drawer).getByText(m.profileTitle())).toBeInTheDocument()
    expect(within(drawer).queryByText(m.usersTitle())).not.toBeInTheDocument()
    expect(within(drawer).queryByText(m.clientsTitle())).not.toBeInTheDocument()
  })

  it.each(menuEntries)('shows the entry for $role', async ({ section, entry, role }) => {
    const { user, drawer } = await openMenu({ roles: [role] })

    await user.click(within(drawer).getByText(section()))

    expect(await within(drawer).findByText(entry())).toBeInTheDocument()
  })

  it.each(menuEntries)('hides the entry without $role', async ({ section, entry, sibling, role }) => {
    const { user, drawer } = await openMenu({ roles: allRolesExcept(role) })

    await user.click(within(drawer).getByText(section()))

    expect(await within(drawer).findByText(sibling())).toBeInTheDocument()
    expect(within(drawer).queryByText(entry())).not.toBeInTheDocument()
  })

  it('goes to the chosen page and closes the menu', async () => {
    const { user, drawer, router } = await openMenu()

    await user.click(within(drawer).getByText(m.usersTitle()))
    await user.click(await within(drawer).findByText(m.layoutUsersList()))

    expect(await screen.findByRole('heading', { name: m.usersTitle() })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/users')
    await waitFor(() => expect(drawer).not.toBeVisible())
  })

  it('opens the section of the current page', async () => {
    const { drawer } = await openMenu({ path: '/clients' })

    expect(within(drawer).getByText(m.layoutClientsList())).toBeInTheDocument()
    expect(within(drawer).queryByText(m.layoutUsersList())).not.toBeInTheDocument()
  })

  it('shows who is signed in', async () => {
    const { drawer } = await openMenu()

    expect(within(drawer).getByText('Grace Hopper')).toBeInTheDocument()
    expect(within(document.querySelector('header')!).getByText('G')).toBeInTheDocument()
  })

  it('signs out through the BFF', async () => {
    const assign = stubLocationAssign()
    const { user, drawer } = await openMenu()

    await user.click(within(drawer).getByRole('button', { name: m.layoutSignOut() }))

    expect(assign).toHaveBeenCalledWith(BFF_LOGOUT_URL)
  })
})

describe('RootLayout on a wide screen', () => {
  beforeEach(() => setViewportWidth(1280))
  // The chosen language is kept in a cookie, which would carry over to the
  // next test.
  afterEach(() => setLocale('en', { reload: false }))

  const renderLayout = async (session = aSession({ id: admin.id, name: 'Grace Hopper' })) => {
    setupFakeBff({ session })
    const user = userEvent.setup()
    renderRoute('/')
    const header = (await screen.findByRole('menu')).closest('header')!
    return { user, header }
  }

  it('shows the menu, the signed-in user and sign out in the header', async () => {
    const { header } = await renderLayout()

    expect(within(header).getByText(m.profileTitle())).toBeInTheDocument()
    expect(within(header).getByText(m.usersTitle())).toBeInTheDocument()
    expect(within(header).getByText(m.clientsTitle())).toBeInTheDocument()
    expect(within(header).getByText('Grace Hopper')).toBeInTheDocument()
    expect(within(header).getByText('G')).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: m.layoutSignOut() })).toBeInTheDocument()
    expect(within(header).queryByRole('button', { name: 'menu' })).not.toBeInTheDocument()
  })

  it("shows the user's name from their profile when the session has none", async () => {
    const { header } = await renderLayout(aSession({ id: admin.id, name: undefined }))

    expect(await within(header).findByText(`${admin.firstName} ${admin.lastName}`)).toBeInTheDocument()
    expect(within(header).getByText(admin.firstName[0])).toBeInTheDocument()
  })

  it('signs out through the BFF', async () => {
    const assign = stubLocationAssign()
    const { user, header } = await renderLayout()

    await user.click(within(header).getByRole('button', { name: m.layoutSignOut() }))

    expect(assign).toHaveBeenCalledWith(BFF_LOGOUT_URL)
  })

  it('switches the language', async () => {
    const { user, header } = await renderLayout()

    await chooseOption(user, within(header).getByLabelText(m.layoutLanguage()), 'Български')

    expect(await screen.findByText(m.profileAccount({}, { locale: 'bg' }))).toBeInTheDocument()
    expect(within(header).getByText(m.profileTitle({}, { locale: 'bg' }))).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: m.layoutSignOut({}, { locale: 'bg' }) })).toBeInTheDocument()
  })
})

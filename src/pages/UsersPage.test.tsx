import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { QueryPayload } from '../api/types'
import type { Role } from '../auth/roles'
import { DEFAULT_PAGE_SIZE } from '../config'
import { m } from '../paraglide/messages'
import { chooseOption, confirmPopconfirm, findOption, findRow, paste } from '../test/antd'
import { admin, aGroup, allRolesExcept, aSession, aUser } from '../test/fixtures'
import { setupFakeBff, type FakeBffData } from '../test/bff'
import { renderRoute } from '../test/render'

const operators = aGroup({ id: 'operators-id', name: 'operators' })
const jane = aUser({
  id: 'jane-id',
  username: 'jdoe',
  email: 'jane.doe@example.com',
  groups: { data: [operators.id], hasMore: false },
})
const bob = aUser({ id: 'bob-id', username: 'bob', firstName: 'Bob', lastName: 'Builder', email: 'bob@example.com' })
const systemUser = aUser({ id: 'system-id', username: 'system', email: 'system@example.com', isSystem: true })

const renderUsersPage = async (seed: Partial<FakeBffData> = {}) => {
  const bff = setupFakeBff({ users: [admin, jane, bob, systemUser], userGroups: [operators], ...seed })
  const user = userEvent.setup()
  renderRoute('/users')
  await findRow(admin.email)
  return { bff, user }
}

const openEditDrawer = async (user: ReturnType<typeof userEvent.setup>, email: string) => {
  await user.click(within(await findRow(email)).getByRole('button', { name: m.mainEdit() }))
  return screen.findByRole('dialog')
}

describe('UsersPage', () => {
  it('lists the users returned by the BFF', async () => {
    await renderUsersPage()

    expect(screen.getByText(admin.email)).toBeInTheDocument()
    expect(screen.getByText(bob.email)).toBeInTheDocument()
  })

  it('shows the BFF error when users cannot be loaded', async () => {
    const bff = setupFakeBff()
    bff.fail('post', '/proxy/users/api/v1/query', 'Users service unavailable', 503)
    // The signed-in user is looked up through the same endpoint.
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderRoute('/users')

    expect(await screen.findByText(m.usersUnableToLoad())).toBeInTheDocument()
    expect(screen.getByText('Users service unavailable')).toBeInTheDocument()
    expect(consoleWarn).toHaveBeenCalledWith('Failed to fetch current user (likely not an admin):', expect.any(Error))
  })

  describe('permissions', () => {
    it('shows every action to a user with all roles', async () => {
      await renderUsersPage()

      expect(screen.getByRole('button', { name: m.usersCreate() })).toBeInTheDocument()
      const row = await findRow(jane.email)
      expect(within(row).getByRole('button', { name: m.mainEdit() })).toBeInTheDocument()
      expect(within(row).getByRole('button', { name: m.mainDelete() })).toBeInTheDocument()
    })

    it.each<{ action: string; role: Role; find: (row: HTMLElement) => HTMLElement | null }>([
      { action: 'create', role: 'users.write', find: () => screen.queryByRole('button', { name: m.usersCreate() }) },
      { action: 'edit', role: 'users.write', find: (row) => within(row).queryByRole('button', { name: m.mainEdit() }) },
      { action: 'delete', role: 'users.delete', find: (row) => within(row).queryByRole('button', { name: m.mainDelete() }) },
    ])('hides $action without $role', async ({ role, find }) => {
      await renderUsersPage({ session: aSession({ id: admin.id, roles: allRolesExcept(role) }) })

      expect(find(await findRow(jane.email))).not.toBeInTheDocument()
    })
  })

  it('creates a user and refreshes the list', async () => {
    const { bff, user } = await renderUsersPage({ users: [admin] })

    await user.click(screen.getByRole('button', { name: m.usersCreate() }))
    const drawer = await screen.findByRole('dialog')
    await user.type(within(drawer).getByLabelText(m.mainUsername()), 'carol')
    await user.type(within(drawer).getByLabelText(m.mainPassword()), 's3cret')
    await user.type(within(drawer).getByLabelText(m.mainFirstName()), 'Carol')
    await user.type(within(drawer).getByLabelText(m.mainLastName()), 'Smith')
    await user.type(within(drawer).getByLabelText(m.mainEmail()), 'carol@example.com')
    await user.click(within(drawer).getByRole('button', { name: m.usersCreate() }))

    expect(await screen.findByText('carol@example.com')).toBeInTheDocument()
    expect(bff.mutations()).toEqual([
      {
        method: 'POST',
        path: '/proxy/users/api/v1/user',
        body: expect.objectContaining({ username: 'carol', password: 's3cret', email: 'carol@example.com' }),
      },
    ])
  })

  describe('deleting', () => {
    it('deletes a user after confirmation and refreshes the list', async () => {
      const { bff, user } = await renderUsersPage()

      await user.click(within(await findRow(jane.email)).getByRole('button', { name: m.mainDelete() }))
      await confirmPopconfirm(user, m.usersDeleteQuestion(), m.mainDelete())

      await waitFor(() => expect(screen.queryByText(jane.email)).not.toBeInTheDocument())
      expect(bff.mutations()).toEqual([
        { method: 'DELETE', path: `/proxy/users/api/v1/user/${jane.id}`, body: undefined },
      ])
    })

    it('keeps the user and shows the BFF error when deleting fails', async () => {
      const { bff, user } = await renderUsersPage()
      bff.fail('delete', '/proxy/users/api/v1/user/:id', 'User has active sessions', 409)

      await user.click(within(await findRow(jane.email)).getByRole('button', { name: m.mainDelete() }))
      await confirmPopconfirm(user, m.usersDeleteQuestion(), m.mainDelete())

      expect(await screen.findByText(m.usersUnableToDelete())).toBeInTheDocument()
      expect(screen.getByText('User has active sessions')).toBeInTheDocument()
      expect(screen.getByText(jane.email)).toBeInTheDocument()
    })

    it('does not offer to delete the signed-in user', async () => {
      await renderUsersPage()

      const row = await findRow(admin.email)
      expect(within(row).getByRole('button', { name: m.mainEdit() })).toBeInTheDocument()
      expect(within(row).queryByRole('button', { name: m.mainDelete() })).not.toBeInTheDocument()
    })
  })

  it('does not allow editing or deleting system users', async () => {
    await renderUsersPage()

    const row = await findRow(systemUser.email)
    expect(within(row).getByRole('button', { name: m.mainEdit() })).toBeDisabled()
    expect(within(row).getByRole('button', { name: m.mainDelete() })).toBeDisabled()
  })

  it('offers every group to choose from, not only the first page of them', async () => {
    const groups = Array.from({ length: DEFAULT_PAGE_SIZE + 1 }, (_, index) =>
      aGroup({ id: `group-${index + 10}-id`, name: `group-${index + 10}` }),
    )
    const lastGroup = groups.at(-1)!
    const { user } = await renderUsersPage({ userGroups: groups })

    await user.click(screen.getByRole('button', { name: m.usersCreate() }))
    const drawer = await screen.findByRole('dialog')
    await user.type(within(drawer).getByLabelText(m.mainGroups()), lastGroup.name)

    expect(await findOption(lastGroup.name)).toBeInTheDocument()
  })

  it('keeps the form open and shows the BFF error when creating fails', async () => {
    const { bff, user } = await renderUsersPage()
    bff.fail('post', '/proxy/users/api/v1/user', 'Username is already taken', 409)

    await user.click(screen.getByRole('button', { name: m.usersCreate() }))
    const drawer = await screen.findByRole('dialog')
    await user.type(within(drawer).getByLabelText(m.mainUsername()), 'jdoe')
    await user.type(within(drawer).getByLabelText(m.mainPassword()), 's3cret')
    await user.type(within(drawer).getByLabelText(m.mainFirstName()), 'Jane')
    await user.type(within(drawer).getByLabelText(m.mainLastName()), 'Doe')
    await user.type(within(drawer).getByLabelText(m.mainEmail()), 'jane@example.com')
    await user.click(within(drawer).getByRole('button', { name: m.usersCreate() }))

    expect(await screen.findByText(m.usersUnableToSave())).toBeInTheDocument()
    expect(screen.getByText('Username is already taken')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  describe('searching', () => {
    const searchField = () => screen.getByRole('combobox')
    const searchBox = () => screen.getByPlaceholderText(m.usersSearch())
    const listedEmails = () =>
      [admin, jane, bob, systemUser].map((listed) => listed.email).filter((email) => screen.queryByText(email))
    const lastUsersQuery = (bff: ReturnType<typeof setupFakeBff>) =>
      bff.requests
        .filter((request) => request.path === '/proxy/users/api/v1/query')
        .map((request) => request.body as QueryPayload)
        .filter((payload) => payload.type === 'User' && payload.limit === DEFAULT_PAGE_SIZE)
        .at(-1)

    it.each([
      { field: 'name', option: () => m.mainName(), term: 'Builder', query: '(t.firstName LIKE :term OR t.lastName LIKE :term)' },
      { field: 'email', option: () => m.mainEmail(), term: 'bob@', query: 't.email LIKE :term' },
      { field: 'username', option: () => m.mainUsername(), term: 'bo', query: 't.username LIKE :term' },
    ])('searches by $field', async ({ option, term, query }) => {
      const { bff, user } = await renderUsersPage()

      await chooseOption(user, searchField(), option())
      await user.type(searchBox(), term)

      await waitFor(() => expect(listedEmails()).toEqual([bob.email]))
      expect(lastUsersQuery(bff)).toMatchObject({ query, parameters: { term: `%${term}%` } })
    })

    it('searches again when another field is chosen', async () => {
      const { bff, user } = await renderUsersPage()
      await user.type(searchBox(), 'jdoe')
      // No first or last name contains "jdoe".
      await waitFor(() => {
        expect(searchField()).toBeInTheDocument()
        expect(listedEmails()).toEqual([])
      })

      await chooseOption(user, searchField(), m.mainUsername())

      await waitFor(() => expect(listedEmails()).toEqual([jane.email]))
      expect(lastUsersQuery(bff)).toMatchObject({ query: 't.username LIKE :term', parameters: { term: '%jdoe%' } })
    })
  })

  describe('editing', () => {
    it('saves changes to the user, keeping their groups and current password', async () => {
      const { bff, user } = await renderUsersPage()

      const drawer = await openEditDrawer(user, jane.email)
      // The user's groups load separately and are filled in as selected tags.
      expect(await within(drawer).findByText(operators.name)).toBeInTheDocument()
      const firstName = within(drawer).getByLabelText(m.mainFirstName())
      await user.clear(firstName)
      await paste(user, firstName, 'Janet')
      await user.click(within(drawer).getByRole('button', { name: m.mainSaveChanges() }))

      expect(await findRow('Janet Doe')).toBeInTheDocument()
      expect(bff.mutations()).toEqual([
        {
          method: 'PUT',
          path: `/proxy/users/api/v1/user/${jane.id}`,
          body: {
            username: jane.username,
            firstName: 'Janet',
            lastName: jane.lastName,
            email: jane.email,
            grantTypes: jane.grantTypes,
            groups: [operators.id],
            twoFaEnabled: false,
          },
        },
      ])
    })

    it('changes the password when a new one is entered', async () => {
      const { bff, user } = await renderUsersPage()

      const drawer = await openEditDrawer(user, jane.email)
      await within(drawer).findByText(operators.name)
      await user.type(within(drawer).getByLabelText(m.mainPassword()), 'n3w-s3cret')
      await user.click(within(drawer).getByRole('button', { name: m.mainSaveChanges() }))

      await waitFor(() => expect(bff.mutations()).toHaveLength(1))
      expect(bff.mutations()[0].body).toMatchObject({ password: 'n3w-s3cret' })
    })

    it('sends a username change to the edited user, not to the user who had that username', async () => {
      const { bff, user } = await renderUsersPage()

      const drawer = await openEditDrawer(user, jane.email)
      const username = within(drawer).getByLabelText(m.mainUsername())
      await user.clear(username)
      await user.type(username, bob.username)
      await user.click(within(drawer).getByRole('button', { name: m.mainSaveChanges() }))

      await waitFor(() => expect(bff.mutations()).toHaveLength(1))
      expect(bff.mutations()[0]).toMatchObject({
        method: 'PUT',
        path: `/proxy/users/api/v1/user/${jane.id}`,
      })
      // The users service rejects a username that another user already has.
      expect(await screen.findByText(`Invalid username. The value "${bob.username}" already exists.`)).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(bff.data.users.find((candidate) => candidate.id === bob.id)?.email).toBe(bob.email)
    })

    it('saves a username change to a username that is not on the current page', async () => {
      const { bff, user } = await renderUsersPage()

      const drawer = await openEditDrawer(user, jane.email)
      const username = within(drawer).getByLabelText(m.mainUsername())
      await user.clear(username)
      await user.type(username, 'jane_doe')
      await user.click(within(drawer).getByRole('button', { name: m.mainSaveChanges() }))

      await waitFor(() => expect(bff.mutations()).toHaveLength(1))
      expect(bff.mutations()[0]).toMatchObject({
        method: 'PUT',
        path: `/proxy/users/api/v1/user/${jane.id}`,
        body: expect.objectContaining({ username: 'jane_doe' }),
      })
    })
  })
})

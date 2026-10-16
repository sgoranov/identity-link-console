import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Group } from '../api/types'
import type { Role } from '../auth/roles'
import { MAX_CLIENT_GROUPS, MAX_USER_GROUPS } from '../config'
import { m } from '../paraglide/messages'
import { confirmPopconfirm, findPopconfirm, findRow, paste } from '../test/antd'
import { aClient, admin, aGroup, allRolesExcept, aSession, aUser } from '../test/fixtures'
import { setupFakeBff, type FakeBffData } from '../test/bff'
import { renderRoute } from '../test/render'

const operators = aGroup({ id: 'operators-id', name: 'operators' })
const auditors = aGroup({ id: 'auditors-id', name: 'auditors' })
const systemGroup = aGroup({ id: 'system-group-id', name: 'administrators', isSystem: true })
const billingAudience = 'https://billing.example.com'

// The user and client group pages share their structure; each variant says
// how the two differ.
const variants = [
  {
    kind: 'user groups',
    path: '/user-groups',
    service: 'users',
    writeRole: 'users.groups.write' as Role,
    deleteRole: 'users.groups.delete' as Role,
    usageLimit: MAX_USER_GROUPS,
    seed: (groups: Group[], membersOfOperators: number): Partial<FakeBffData> => ({
      userGroups: groups,
      users: [
        admin,
        ...Array.from({ length: membersOfOperators }, (_, index) =>
          aUser({ id: `member-${index}`, username: `member${index}`, groups: { data: [operators.id], hasMore: false } }),
        ),
      ],
    }),
    assigned: (count: string) => m.userGroupsAssignedToUsers({ count }),
    notAssigned: () => m.userGroupsNotAssignedToUsers(),
    scopesTitle: (group: string) => m.groupScopesTitle({ group }),
  },
  {
    kind: 'client groups',
    path: '/client-groups',
    service: 'clients',
    writeRole: 'clients.groups.write' as Role,
    deleteRole: 'clients.groups.delete' as Role,
    usageLimit: MAX_CLIENT_GROUPS,
    seed: (groups: Group[], membersOfOperators: number): Partial<FakeBffData> => ({
      clientGroups: groups,
      clients: Array.from({ length: membersOfOperators }, (_, index) =>
        aClient({ id: `member-${index}`, name: `member${index}`, groups: { data: [operators.id], hasMore: false } }),
      ),
    }),
    assigned: (count: string) => m.clientGroupsAssignedToClients({ count }),
    notAssigned: () => m.clientGroupsNotAssignedToClients(),
    scopesTitle: (group: string) => m.clientGroupScopesTitle({ group }),
  },
]

describe.each(variants)('$kind page', (variant) => {
  const renderGroupsPage = async ({ members = 2, ...seed }: Partial<FakeBffData> & { members?: number } = {}) => {
    const bff = setupFakeBff({ ...variant.seed([operators, auditors, systemGroup], members), ...seed })
    const user = userEvent.setup()
    renderRoute(variant.path)
    await findRow(operators.name)
    return { bff, user }
  }

  const openDeleteConfirmation = async (user: ReturnType<typeof userEvent.setup>, group: Group) => {
    await user.click(within(await findRow(group.name)).getByRole('button', { name: m.mainDelete() }))
    return findPopconfirm(m.groupsDeleteQuestion())
  }

  const usageDescription = (usage: string) => m.groupsDeletionPermanentWithUsage({ usage })

  it('lists the groups returned by the BFF', async () => {
    await renderGroupsPage()

    expect(screen.getByText(auditors.name)).toBeInTheDocument()
    expect(screen.getByText(systemGroup.name)).toBeInTheDocument()
  })

  describe('permissions', () => {
    it('shows every action to a user with all roles', async () => {
      await renderGroupsPage()

      expect(screen.getByRole('button', { name: m.groupsCreate() })).toBeInTheDocument()
      const row = await findRow(operators.name)
      expect(within(row).getByRole('button', { name: m.groupScopesHeading() })).toBeInTheDocument()
      expect(within(row).getByRole('button', { name: m.mainEdit() })).toBeInTheDocument()
      expect(within(row).getByRole('button', { name: m.mainDelete() })).toBeInTheDocument()
    })

    it.each<{ action: string; role: () => Role; find: (row: HTMLElement) => HTMLElement | null }>([
      { action: 'create', role: () => variant.writeRole, find: () => screen.queryByRole('button', { name: m.groupsCreate() }) },
      { action: 'edit', role: () => variant.writeRole, find: (row) => within(row).queryByRole('button', { name: m.mainEdit() }) },
      { action: 'scopes', role: () => variant.writeRole, find: (row) => within(row).queryByRole('button', { name: m.groupScopesHeading() }) },
      { action: 'delete', role: () => variant.deleteRole, find: (row) => within(row).queryByRole('button', { name: m.mainDelete() }) },
    ])('hides $action without the role', async ({ role, find }) => {
      await renderGroupsPage({ session: aSession({ id: admin.id, roles: allRolesExcept(role()) }) })

      expect(find(await findRow(operators.name))).not.toBeInTheDocument()
    })
  })

  describe('deleting', () => {
    it('shows how many members use the group, then deletes it after confirmation', async () => {
      const { bff, user } = await renderGroupsPage({ members: 2 })

      const popup = await openDeleteConfirmation(user, operators)
      expect(await within(popup).findByText(usageDescription(variant.assigned('2')))).toBeInTheDocument()
      await confirmPopconfirm(user, m.groupsDeleteQuestion(), m.mainDelete())

      await waitFor(() => expect(screen.queryByText(operators.name)).not.toBeInTheDocument())
      expect(bff.mutations()).toEqual([
        { method: 'DELETE', path: `/proxy/${variant.service}/api/v1/group/${operators.id}`, body: undefined },
      ])
    })

    it('marks the member count as incomplete when there are more members than the check returns', async () => {
      const { user } = await renderGroupsPage({ members: variant.usageLimit + 1 })

      const popup = await openDeleteConfirmation(user, operators)

      expect(
        await within(popup).findByText(usageDescription(variant.assigned(`${variant.usageLimit}+`))),
      ).toBeInTheDocument()
    })

    it('says when the group is not in use', async () => {
      const { user } = await renderGroupsPage()

      const popup = await openDeleteConfirmation(user, auditors)

      expect(await within(popup).findByText(usageDescription(variant.notAssigned()))).toBeInTheDocument()
    })

    it('shows the BFF error when the usage check fails', async () => {
      const { bff, user } = await renderGroupsPage()
      bff.fail('post', `/proxy/${variant.service}/api/v1/query`, 'Query service unavailable', 503)

      await openDeleteConfirmation(user, operators)

      expect(await screen.findByText(m.groupsUnableToCheckUsage())).toBeInTheDocument()
      expect(screen.getByText('Query service unavailable')).toBeInTheDocument()
    })

    it('says that the usage could not be checked when the check fails', async () => {
      const { bff, user } = await renderGroupsPage({ members: 2 })
      bff.fail('post', `/proxy/${variant.service}/api/v1/query`, 'Query service unavailable', 503)

      const popup = await openDeleteConfirmation(user, operators)
      await screen.findByText(m.groupsUnableToCheckUsage())

      expect(await within(popup).findByText(usageDescription(m.groupsUsageNotChecked()))).toBeInTheDocument()
      expect(within(popup).queryByText(usageDescription(variant.notAssigned()))).not.toBeInTheDocument()
    })

    it('keeps the group and shows the BFF error when deleting fails', async () => {
      const { bff, user } = await renderGroupsPage()
      bff.fail('delete', `/proxy/${variant.service}/api/v1/group/:id`, 'Group is still in use', 409)

      await openDeleteConfirmation(user, auditors)
      await confirmPopconfirm(user, m.groupsDeleteQuestion(), m.mainDelete())

      expect(await screen.findByText(m.groupsUnableToDelete())).toBeInTheDocument()
      expect(screen.getByText('Group is still in use')).toBeInTheDocument()
      expect(screen.getByText(auditors.name)).toBeInTheDocument()
    })
  })

  describe('saving', () => {
    it('creates a group and refreshes the list', async () => {
      const { bff, user } = await renderGroupsPage()

      await user.click(screen.getByRole('button', { name: m.groupsCreate() }))
      const drawer = await screen.findByRole('dialog')
      await user.type(within(drawer).getByLabelText(m.mainName()), 'support')
      await user.click(within(drawer).getByRole('button', { name: m.groupsCreate() }))

      expect(await findRow('support')).toBeInTheDocument()
      expect(bff.mutations()).toEqual([
        { method: 'POST', path: `/proxy/${variant.service}/api/v1/group`, body: { name: 'support' } },
      ])
    })

    it('renames a group', async () => {
      const { bff, user } = await renderGroupsPage()

      await user.click(within(await findRow(operators.name)).getByRole('button', { name: m.mainEdit() }))
      const drawer = await screen.findByRole('dialog')
      const name = within(drawer).getByLabelText(m.mainName())
      await waitFor(() => expect(name).toHaveValue(operators.name))
      await user.clear(name)
      await paste(user, name, 'ops')
      await user.click(within(drawer).getByRole('button', { name: m.mainSaveChanges() }))

      expect(await findRow('ops')).toBeInTheDocument()
      expect(bff.mutations()).toEqual([
        { method: 'PUT', path: `/proxy/${variant.service}/api/v1/group/${operators.id}`, body: { name: 'ops' } },
      ])
    })

    it('keeps the form open and shows the BFF error when saving fails', async () => {
      const { bff, user } = await renderGroupsPage()
      bff.fail('post', `/proxy/${variant.service}/api/v1/group`, 'Group name is already taken', 409)

      await user.click(screen.getByRole('button', { name: m.groupsCreate() }))
      const drawer = await screen.findByRole('dialog')
      await user.type(within(drawer).getByLabelText(m.mainName()), operators.name)
      await user.click(within(drawer).getByRole('button', { name: m.groupsCreate() }))

      expect(await screen.findByText(m.groupsUnableToSave())).toBeInTheDocument()
      expect(screen.getByText('Group name is already taken')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('assigns scopes from the scopes drawer and lists the audience for the group', async () => {
    const { user } = await renderGroupsPage({
      audiences: [billingAudience],
      authorizationScopes: {
        [billingAudience]: {
          aliases: {},
          scopes: { 'invoices.read': { description: 'Read invoices' } },
          openid_connect_resources: { aliases: {}, scopes: {} },
        },
      },
    })
    const row = await findRow(operators.name)
    expect(within(row).getByText(m.groupScopesNoAssignedAudiences())).toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: m.groupScopesHeading() }))
    expect(await screen.findByText(variant.scopesTitle(operators.name))).toBeInTheDocument()
    await user.click(await screen.findByRole('checkbox', { name: (name) => name.startsWith('invoices.read ') }))

    expect(await within(await findRow(operators.name)).findByText(billingAudience)).toBeInTheDocument()
  })

  it('does not allow editing or deleting system groups', async () => {
    await renderGroupsPage()

    const row = await findRow(systemGroup.name)
    expect(within(row).getByRole('button', { name: m.mainEdit() })).toBeDisabled()
    expect(within(row).getByRole('button', { name: m.mainDelete() })).toBeDisabled()
  })
})

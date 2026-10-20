import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Role } from '../auth/roles'
import { DEFAULT_PAGE_SIZE } from '../config'
import { m } from '../paraglide/messages'
import { addTags, confirmPopconfirm, findOption, findRow, paste } from '../test/antd'
import { aClient, admin, aGroup, allRolesExcept, aSession } from '../test/fixtures'
import { setupFakeBff, type FakeBffData } from '../test/bff'
import { renderRoute } from '../test/render'

const billing = aClient({ id: 'billing-id', name: 'billing', description: 'Billing service' })
const reports = aClient({ id: 'reports-id', name: 'reports', description: 'Reporting service' })
const systemClient = aClient({ id: 'system-client-id', name: 'console', description: 'Admin console', isSystem: true })
const operators = aGroup({ id: 'operators-id', name: 'operators' })

const renderClientsPage = async (seed: Partial<FakeBffData> = {}) => {
  const bff = setupFakeBff({ clients: [billing, reports, systemClient], ...seed })
  const user = userEvent.setup()
  const view = renderRoute('/clients')
  await findRow(billing.description!)
  return { ...view, bff, user }
}

describe('ClientsPage', () => {
  it('lists the clients returned by the BFF', async () => {
    await renderClientsPage()

    expect(screen.getByText(reports.description!)).toBeInTheDocument()
    expect(screen.getByText(systemClient.description!)).toBeInTheDocument()
  })

  it('shows the BFF error when clients cannot be loaded', async () => {
    const bff = setupFakeBff()
    bff.fail('post', '/proxy/clients/api/v1/query', 'Clients service unavailable', 503)

    renderRoute('/clients')

    expect(await screen.findByText(m.clientsUnableToLoad())).toBeInTheDocument()
    expect(screen.getByText('Clients service unavailable')).toBeInTheDocument()
  })

  describe('permissions', () => {
    it('shows every action to a user with all roles', async () => {
      await renderClientsPage()

      expect(screen.getByRole('button', { name: m.clientsCreate() })).toBeInTheDocument()
      const row = await findRow(billing.description!)
      expect(within(row).getByRole('button', { name: m.clientsSecretsAction() })).toBeInTheDocument()
      expect(within(row).getByRole('button', { name: m.mainEdit() })).toBeInTheDocument()
      expect(within(row).getByRole('button', { name: m.mainDelete() })).toBeInTheDocument()
    })

    it.each<{ action: string; role: Role; find: (row: HTMLElement) => HTMLElement | null }>([
      { action: 'create', role: 'clients.write', find: () => screen.queryByRole('button', { name: m.clientsCreate() }) },
      { action: 'edit', role: 'clients.write', find: (row) => within(row).queryByRole('button', { name: m.mainEdit() }) },
      { action: 'delete', role: 'clients.delete', find: (row) => within(row).queryByRole('button', { name: m.mainDelete() }) },
      { action: 'secrets', role: 'clients.secrets.read', find: (row) => within(row).queryByRole('button', { name: m.clientsSecretsAction() }) },
    ])('hides $action without $role', async ({ role, find }) => {
      await renderClientsPage({ session: aSession({ id: admin.id, roles: allRolesExcept(role) }) })

      expect(find(await findRow(billing.description!))).not.toBeInTheDocument()
    })
  })

  it('opens the secrets of a client', async () => {
    const { router, user } = await renderClientsPage()

    await user.click(within(await findRow(billing.description!)).getByRole('button', { name: m.clientsSecretsAction() }))

    expect(await screen.findByRole('heading', { name: m.clientSecretsTitle() })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/clients/${billing.id}/secrets`)
  })

  describe('deleting', () => {
    it('deletes a client after confirmation and refreshes the list', async () => {
      const { bff, user } = await renderClientsPage()

      await user.click(within(await findRow(billing.description!)).getByRole('button', { name: m.mainDelete() }))
      await confirmPopconfirm(user, m.clientsDeleteQuestion(), m.mainDelete())

      await waitFor(() => expect(screen.queryByText(billing.description!)).not.toBeInTheDocument())
      expect(bff.mutations()).toEqual([
        { method: 'DELETE', path: `/proxy/clients/api/v1/client/${billing.id}`, body: undefined },
      ])
    })

    it('keeps the client and shows the BFF error when deleting fails', async () => {
      const { bff, user } = await renderClientsPage()
      bff.fail('delete', '/proxy/clients/api/v1/client/:id', 'Client has active tokens', 409)

      await user.click(within(await findRow(billing.description!)).getByRole('button', { name: m.mainDelete() }))
      await confirmPopconfirm(user, m.clientsDeleteQuestion(), m.mainDelete())

      expect(await screen.findByText(m.clientsUnableToDelete())).toBeInTheDocument()
      expect(screen.getByText('Client has active tokens')).toBeInTheDocument()
      expect(screen.getByText(billing.description!)).toBeInTheDocument()
    })
  })

  describe('saving', () => {
    it('creates a client, sending empty optional URLs as null, and refreshes the list', async () => {
      const { bff, user } = await renderClientsPage()

      await user.click(screen.getByRole('button', { name: m.clientsCreate() }))
      const drawer = await screen.findByRole('dialog')
      await paste(user, within(drawer).getByLabelText(m.mainName()), 'invoices')
      await paste(user, within(drawer).getByLabelText(m.mainDescription()), 'Invoice service')
      await paste(user, within(drawer).getByLabelText(m.clientsFormAudience()), 'https://invoices.example.com')
      await addTags(user, within(drawer).getByLabelText(m.clientsFormRedirectUris()), [
        'https://invoices.example.com/callback',
      ])
      await user.click(within(drawer).getByRole('button', { name: m.clientsCreate() }))

      expect(await findRow('Invoice service')).toBeInTheDocument()
      expect(bff.mutations()).toEqual([
        {
          method: 'POST',
          path: '/proxy/clients/api/v1/client',
          body: {
            name: 'invoices',
            description: 'Invoice service',
            audience: 'https://invoices.example.com',
            redirectUri: ['https://invoices.example.com/callback'],
            groups: [],
            grantTypes: [],
            isPublic: false,
            consentRequired: false,
            applicationUrl: null,
            termsOfServiceUrl: null,
            privacyPolicyUrl: null,
            logoUrl: null,
          },
        },
      ])
    })

    it('offers every group to choose from, not only the first page of them', async () => {
      const groups = Array.from({ length: DEFAULT_PAGE_SIZE + 1 }, (_, index) =>
        aGroup({ id: `group-${index + 10}-id`, name: `group-${index + 10}` }),
      )
      const lastGroup = groups.at(-1)!
      const { user } = await renderClientsPage({ clientGroups: groups })

      await user.click(screen.getByRole('button', { name: m.clientsCreate() }))
      const drawer = await screen.findByRole('dialog')
      await user.type(within(drawer).getByLabelText(m.mainGroups()), lastGroup.name)

      expect(await findOption(lastGroup.name)).toBeInTheDocument()
    })

    it('saves changes to a client without sending its audience or public flag', async () => {
      const client = aClient({
        ...billing,
        groups: { data: [operators.id], hasMore: false },
        consentRequired: true,
        applicationUrl: 'https://billing.example.com',
      })
      const { bff, user } = await renderClientsPage({ clients: [client], clientGroups: [operators] })

      await user.click(within(await findRow(client.description!)).getByRole('button', { name: m.mainEdit() }))
      const drawer = await screen.findByRole('dialog')
      const description = within(drawer).getByLabelText(m.mainDescription())
      await waitFor(() => expect(description).toHaveValue(client.description))
      await user.clear(description)
      await paste(user, description, 'Billing and invoicing')
      await user.click(within(drawer).getByRole('button', { name: m.mainSaveChanges() }))

      expect(await findRow('Billing and invoicing')).toBeInTheDocument()
      expect(bff.mutations()).toEqual([
        {
          method: 'PUT',
          path: `/proxy/clients/api/v1/client/${client.id}`,
          body: {
            name: client.name,
            description: 'Billing and invoicing',
            redirectUri: client.redirectUri,
            groups: [operators.id],
            grantTypes: client.grantTypes,
            consentRequired: true,
            applicationUrl: 'https://billing.example.com',
            termsOfServiceUrl: null,
            privacyPolicyUrl: null,
            logoUrl: null,
          },
        },
      ])
    })

    it('keeps the form open and shows the BFF error when saving fails', async () => {
      const { bff, user } = await renderClientsPage()
      bff.fail('put', '/proxy/clients/api/v1/client/:id', 'Redirect URI is not allowed', 422)

      await user.click(within(await findRow(billing.description!)).getByRole('button', { name: m.mainEdit() }))
      const drawer = await screen.findByRole('dialog')
      await waitFor(() => expect(within(drawer).getByLabelText(m.mainName())).toHaveValue(billing.name))
      await user.click(within(drawer).getByRole('button', { name: m.mainSaveChanges() }))

      expect(await screen.findByText(m.clientsUnableToSave())).toBeInTheDocument()
      expect(screen.getByText('Redirect URI is not allowed')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('does not allow editing or deleting system clients', async () => {
    await renderClientsPage()

    const row = await findRow(systemClient.description!)
    expect(within(row).getByRole('button', { name: m.mainEdit() })).toBeDisabled()
    expect(within(row).getByRole('button', { name: m.mainDelete() })).toBeDisabled()
  })
})

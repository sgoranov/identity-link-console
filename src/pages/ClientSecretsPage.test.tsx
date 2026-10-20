import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Role } from '../auth/roles'
import { m } from '../paraglide/messages'
import { chooseOption, confirmPopconfirm, findRow } from '../test/antd'
import { aClient, admin, allRolesExcept, aSecret, aSession } from '../test/fixtures'
import { setupFakeBff, type FakeBffData } from '../test/bff'
import { renderRoute } from '../test/render'

const billing = aClient({ id: 'billing-id', name: 'billing', description: 'Billing service' })
const deployKey = aSecret({ id: 'deploy-key-id', passwordHint: 'deploy key', expirationDateTime: '2027-01-01 00:00:00' })
const ciKey = aSecret({ id: 'ci-key-id', passwordHint: 'ci', expirationDateTime: null })
const systemSecret = aSecret({ id: 'system-secret-id', passwordHint: 'bootstrap', isSystem: true })

const renderSecretsPage = async ({ client = billing, ...seed }: Partial<FakeBffData> & { client?: typeof billing } = {}) => {
  const bff = setupFakeBff({
    clients: [client],
    secrets: { [client.id]: [deployKey, ciKey, systemSecret] },
    ...seed,
  })
  const user = userEvent.setup()
  const view = renderRoute(`/clients/${client.id}/secrets`)
  await findRow(deployKey.passwordHint!)
  // The client loads separately from its secrets; until then, actions that
  // depend on it (like Generate) are disabled regardless of permissions.
  await screen.findByText(client.name)
  return { ...view, bff, user }
}

const openGenerateDrawer = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: m.clientSecretsGenerate() }))
  return screen.findByRole('dialog')
}

const generateSecret = async (user: ReturnType<typeof userEvent.setup>, { hint = 'nightly job' } = {}) => {
  const drawer = await openGenerateDrawer(user)
  if (hint) await user.type(within(drawer).getByLabelText(m.clientSecretsPasswordHint()), hint)
  await chooseOption(user, within(drawer).getByLabelText(m.clientSecretsExpirationPeriod()), m.clientSecretsExpirationOneMonth())
  await user.click(within(drawer).getByRole('button', { name: m.clientSecretsGenerate() }))
}

describe('ClientSecretsPage', () => {
  it('shows the client and its secrets', async () => {
    await renderSecretsPage()

    expect(screen.getByText(billing.name)).toBeInTheDocument()
    expect(screen.getByText(billing.id)).toBeInTheDocument()
    expect(screen.getByText(billing.description!)).toBeInTheDocument()
    expect(within(await findRow(deployKey.passwordHint!)).getByText(deployKey.expirationDateTime!)).toBeInTheDocument()
    expect(within(await findRow(ciKey.passwordHint!)).getByText(m.clientSecretsNever())).toBeInTheDocument()
  })

  it('falls back to a generic description when the client has none', async () => {
    await renderSecretsPage({ client: aClient({ ...billing, description: '' }) })

    expect(screen.getByText(m.clientSecretsDescriptionFallback())).toBeInTheDocument()
  })

  it('shows the BFF error when secrets cannot be loaded', async () => {
    const bff = setupFakeBff({ clients: [billing] })
    bff.fail('post', '/proxy/clients/api/v1/query', 'Clients service unavailable', 503)

    renderRoute(`/clients/${billing.id}/secrets`)

    expect(await screen.findByText(m.clientSecretsUnableToLoad())).toBeInTheDocument()
    expect(screen.getByText('Clients service unavailable')).toBeInTheDocument()
  })

  it('goes back to the clients list', async () => {
    const { router, user } = await renderSecretsPage()

    await user.click(screen.getByRole('button', { name: m.clientSecretsBackToClients() }))

    expect(await screen.findByRole('heading', { name: m.clientsTitle() })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/clients')
  })

  describe('permissions', () => {
    it('shows every action to a user with all roles', async () => {
      await renderSecretsPage()

      expect(screen.getByRole('button', { name: m.clientSecretsGenerate() })).toBeEnabled()
      expect(within(await findRow(deployKey.passwordHint!)).getByRole('button', { name: m.mainDelete() })).toBeInTheDocument()
    })

    it.each<{ action: string; role: Role; find: (row: HTMLElement) => HTMLElement | null }>([
      { action: 'generate', role: 'clients.secrets.write', find: () => screen.queryByRole('button', { name: m.clientSecretsGenerate() }) },
      { action: 'delete', role: 'clients.secrets.delete', find: (row) => within(row).queryByRole('button', { name: m.mainDelete() }) },
    ])('hides $action without $role', async ({ role, find }) => {
      await renderSecretsPage({ session: aSession({ id: admin.id, roles: allRolesExcept(role) }) })

      expect(find(await findRow(deployKey.passwordHint!))).not.toBeInTheDocument()
    })
  })

  describe('generating', () => {
    it('issues a secret, shows it once and adds it to the list', async () => {
      const { bff, user } = await renderSecretsPage()

      await generateSecret(user, { hint: 'nightly job' })

      expect(await screen.findByDisplayValue('generated-secret-1')).toBeInTheDocument()
      expect(screen.getByText(m.clientSecretsGenerated())).toBeInTheDocument()
      expect(await findRow('nightly job')).toBeInTheDocument()
      expect(bff.mutations()).toEqual([
        {
          method: 'POST',
          path: '/proxy/clients/api/v1/secret/issue',
          body: { client: billing.id, passwordHint: 'nightly job', expirationPeriod: '1m' },
        },
      ])
    })

    it('leaves the hint out when none is given', async () => {
      const { bff, user } = await renderSecretsPage()

      await generateSecret(user, { hint: '' })

      await screen.findByDisplayValue('generated-secret-1')
      expect(bff.mutations()[0].body).toEqual({ client: billing.id, expirationPeriod: '1m' })
    })

    it('requires an expiration period', async () => {
      const { bff, user } = await renderSecretsPage()

      const drawer = await openGenerateDrawer(user)
      await user.click(within(drawer).getByRole('button', { name: m.clientSecretsGenerate() }))

      expect(await within(drawer).findByText(m.validationExpirationPeriodRequired())).toBeInTheDocument()
      expect(bff.mutations()).toEqual([])
    })

    it('copies the secret to the clipboard and hides it on dismiss', async () => {
      const { user } = await renderSecretsPage()
      await generateSecret(user)
      await screen.findByDisplayValue('generated-secret-1')

      await user.click(screen.getByRole('button', { name: m.mainCopy() }))
      expect(await navigator.clipboard.readText()).toBe('generated-secret-1')

      await user.click(screen.getByRole('button', { name: m.mainDismiss() }))
      expect(screen.queryByDisplayValue('generated-secret-1')).not.toBeInTheDocument()
    })

    it('shows an error when the clipboard is not available', async () => {
      const { user } = await renderSecretsPage()
      await generateSecret(user)
      await screen.findByDisplayValue('generated-secret-1')
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Clipboard access denied'))

      await user.click(screen.getByRole('button', { name: m.mainCopy() }))

      expect(await screen.findByText(m.clientSecretsCopyFailed())).toBeInTheDocument()
      expect(screen.getByText('Clipboard access denied')).toBeInTheDocument()
    })

    it('shows the BFF error and no secret when issuing fails', async () => {
      const { bff, user } = await renderSecretsPage()
      bff.fail('post', '/proxy/clients/api/v1/secret/issue', 'Secret limit reached', 422)

      await generateSecret(user)

      expect(await screen.findByText(m.clientSecretsUnableToSave())).toBeInTheDocument()
      expect(screen.getByText('Secret limit reached')).toBeInTheDocument()
      expect(screen.queryByText(m.clientSecretsGenerated())).not.toBeInTheDocument()
    })

    it('does not allow generating secrets for a system client', async () => {
      await renderSecretsPage({ client: aClient({ ...billing, isSystem: true }) })

      expect(screen.getByRole('button', { name: m.clientSecretsGenerate() })).toBeDisabled()
    })
  })

  describe('deleting', () => {
    it('deletes a secret after confirmation and refreshes the list', async () => {
      const { bff, user } = await renderSecretsPage()

      await user.click(within(await findRow(deployKey.passwordHint!)).getByRole('button', { name: m.mainDelete() }))
      await confirmPopconfirm(user, m.clientSecretsDeleteQuestion(), m.mainDelete())

      await waitFor(() => expect(screen.queryByText(deployKey.passwordHint!)).not.toBeInTheDocument())
      expect(bff.mutations()).toEqual([
        { method: 'DELETE', path: `/proxy/clients/api/v1/secret/${deployKey.id}`, body: undefined },
      ])
    })

    it('keeps the secret and shows the BFF error when deleting fails', async () => {
      const { bff, user } = await renderSecretsPage()
      bff.fail('delete', '/proxy/clients/api/v1/secret/:id', 'Secret is in use', 409)

      await user.click(within(await findRow(deployKey.passwordHint!)).getByRole('button', { name: m.mainDelete() }))
      await confirmPopconfirm(user, m.clientSecretsDeleteQuestion(), m.mainDelete())

      expect(await screen.findByText(m.clientSecretsUnableToDelete())).toBeInTheDocument()
      expect(screen.getByText('Secret is in use')).toBeInTheDocument()
      expect(screen.getByText(deployKey.passwordHint!)).toBeInTheDocument()
    })

    it('does not allow deleting system secrets', async () => {
      await renderSecretsPage()

      expect(within(await findRow(systemSecret.passwordHint!)).getByRole('button', { name: m.mainDelete() })).toBeDisabled()
    })
  })
})

import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthorizationScopes } from '../../api/authorization'
import type { Group, GroupScope } from '../../api/types'
import { m } from '../../paraglide/messages'
import { chooseOption } from '../../test/antd'
import { aGroup } from '../../test/fixtures'
import { bffUrl, setupFakeBff, type FakeBffData } from '../../test/bff'
import { renderWithProviders } from '../../test/render'
import { server } from '../../test/server'
import { GroupScopesDrawer as ClientGroupScopesDrawer } from '../Clients/GroupScopesDrawer'
import { GroupScopesDrawer as UserGroupScopesDrawer } from './GroupScopesDrawer'

const billing = 'https://billing.example.com'
const reports = 'https://reports.example.com'

const openIdConnect = {
  aliases: { profile_all: { description: 'All profile claims', scopes: ['profile', 'email'] } },
  scopes: { openid: { description: 'Sign in with OpenID Connect' } },
}

const billingScopes: AuthorizationScopes = {
  aliases: { 'invoices.all': { description: 'All invoice access', scopes: ['invoices.read', 'invoices.write'] } },
  scopes: {
    'invoices.read': { description: 'Read invoices' },
    'invoices.write': { description: 'Create and change invoices' },
  },
  openid_connect_resources: openIdConnect,
}

const reportsScopes: AuthorizationScopes = {
  aliases: {},
  scopes: { 'reports.read': { description: 'Read reports' } },
  openid_connect_resources: openIdConnect,
}

// The IDP encodes an empty map as [] rather than {}.
const emptyMap = [] as unknown as Record<string, never>

const operators = aGroup({ id: 'operators-id', name: 'operators' })

// The checkbox for a scope or alias; its accessible name starts with the scope
// and continues with its kind and description.
const scopeCheckbox = (scope: string) =>
  screen.getByRole('checkbox', { name: (name) => name.startsWith(`${scope} `) })
const findScopeCheckbox = (scope: string) =>
  screen.findByRole('checkbox', { name: (name) => name.startsWith(`${scope} `) })
const queryScopeCheckbox = (scope: string) =>
  screen.queryByRole('checkbox', { name: (name) => name.startsWith(`${scope} `) })

const variants = [
  {
    kind: 'user group',
    Drawer: UserGroupScopesDrawer,
    service: 'users',
    scopesKey: 'userGroupScopes' as const,
    title: (group: string) => m.groupScopesTitle({ group }),
    systemReadOnly: () => m.groupScopesSystemReadOnly(),
    showsOpenIdConnect: false,
  },
  {
    kind: 'client group',
    Drawer: ClientGroupScopesDrawer,
    service: 'clients',
    scopesKey: 'clientGroupScopes' as const,
    title: (group: string) => m.clientGroupScopesTitle({ group }),
    systemReadOnly: () => m.clientGroupScopesSystemReadOnly(),
    showsOpenIdConnect: true,
  },
]

describe.each(variants)('$kind scopes drawer', (variant) => {
  const renderDrawer = ({
    group = operators,
    assigned = [],
    ...seed
  }: Partial<FakeBffData> & { group?: Group; assigned?: GroupScope[] } = {}) => {
    const bff = setupFakeBff({
      audiences: [billing, reports],
      authorizationScopes: { [billing]: billingScopes, [reports]: reportsScopes },
      [variant.scopesKey]: { [group.id]: assigned },
      ...seed,
    })
    const user = userEvent.setup()
    renderWithProviders(<variant.Drawer group={group} open onClose={vi.fn()} />)
    return { bff, user }
  }

  const scopePath = (scopeId = '') =>
    `/proxy/${variant.service}/api/v1/group/${operators.id}/scope${scopeId ? `/${scopeId}` : ''}`

  it('shows the scopes of the first audience when the group has none', async () => {
    renderDrawer()

    expect(screen.getByText(variant.title(operators.name))).toBeInTheDocument()
    expect(await findScopeCheckbox('invoices.all')).not.toBeChecked()
    expect(scopeCheckbox('invoices.read')).not.toBeChecked()
    expect(scopeCheckbox('invoices.write')).not.toBeChecked()
    expect(screen.getByText('Read invoices')).toBeInTheDocument()
  })

  it('opens the audience the group already has scopes for', async () => {
    renderDrawer({ assigned: [{ id: 'assignment-1', audience: reports, scope: 'reports.read' }] })

    expect(await findScopeCheckbox('reports.read')).toBeChecked()
    expect(queryScopeCheckbox('invoices.read')).not.toBeInTheDocument()
  })

  it('accepts group scopes encoded as a map', async () => {
    renderDrawer()
    server.use(
      http.get(bffUrl(scopePath()), () =>
        HttpResponse.json({
          response: { scopes: { 'assignment-1': { id: 'assignment-1', audience: billing, scope: 'invoices.read' } } },
        }),
      ),
    )

    expect(await findScopeCheckbox('invoices.read')).toBeChecked()
  })

  it('assigns a scope when it is checked', async () => {
    const { bff, user } = renderDrawer()

    await user.click(await findScopeCheckbox('invoices.read'))

    await waitFor(() => expect(scopeCheckbox('invoices.read')).toBeChecked())
    expect(bff.mutations()).toEqual([
      { method: 'POST', path: scopePath(), body: { audience: billing, scope: 'invoices.read' } },
    ])
  })

  it('removes a scope when it is unchecked', async () => {
    const { bff, user } = renderDrawer({
      assigned: [{ id: 'assignment-1', audience: billing, scope: 'invoices.read' }],
    })

    await user.click(await findScopeCheckbox('invoices.read'))

    await waitFor(() => expect(scopeCheckbox('invoices.read')).not.toBeChecked())
    expect(bff.mutations()).toEqual([
      { method: 'DELETE', path: scopePath('assignment-1'), body: undefined },
    ])
  })

  it('shows the BFF error and leaves the scope unassigned when saving fails', async () => {
    const { bff, user } = renderDrawer()
    bff.fail('post', scopePath(), 'Scope is not allowed for this group', 422)

    await user.click(await findScopeCheckbox('invoices.read'))

    expect(await screen.findByText(m.groupScopesUnableToSave())).toBeInTheDocument()
    expect(screen.getByText('Scope is not allowed for this group')).toBeInTheDocument()
    expect(scopeCheckbox('invoices.read')).not.toBeChecked()
  })

  it('shows the scopes of another audience when it is selected', async () => {
    const { user } = renderDrawer()
    await findScopeCheckbox('invoices.read')

    await chooseOption(user, screen.getByRole('combobox'), reports)

    expect(await findScopeCheckbox('reports.read')).toBeInTheDocument()
    expect(queryScopeCheckbox('invoices.read')).not.toBeInTheDocument()
  })

  it('is read-only for system groups', async () => {
    const systemGroup = aGroup({ id: operators.id, name: 'administrators', isSystem: true })
    renderDrawer({ group: systemGroup })

    expect(await findScopeCheckbox('invoices.read')).toBeDisabled()
    expect(screen.getByText(variant.systemReadOnly())).toBeInTheDocument()
  })

  it(
    variant.showsOpenIdConnect
      ? 'offers the OpenID Connect scopes'
      : 'does not offer the OpenID Connect scopes, which users always hold',
    async () => {
      renderDrawer()
      await findScopeCheckbox('invoices.read')

      if (variant.showsOpenIdConnect) {
        expect(screen.getByText(m.groupScopesOpenIdConnectHeading())).toBeInTheDocument()
        expect(scopeCheckbox('openid')).toBeInTheDocument()
        expect(scopeCheckbox('profile_all')).toBeInTheDocument()
      } else {
        expect(screen.queryByText(m.groupScopesOpenIdConnectHeading())).not.toBeInTheDocument()
        expect(queryScopeCheckbox('openid')).not.toBeInTheDocument()
      }
    },
  )

  it('says when the audience has no aliases', async () => {
    renderDrawer({ audiences: [reports], authorizationScopes: { [reports]: { ...reportsScopes, aliases: emptyMap } } })

    expect(await findScopeCheckbox('reports.read')).toBeInTheDocument()
    expect(screen.getByText(m.groupScopesNoAliases())).toBeInTheDocument()
  })

  it('says when no scopes are available', async () => {
    const { bff } = renderDrawer({
      audiences: [reports],
      authorizationScopes: {
        [reports]: {
          aliases: emptyMap,
          scopes: emptyMap,
          openid_connect_resources: { aliases: emptyMap, scopes: emptyMap },
        },
      },
    })

    // Wait for the scopes to be requested, so the message below comes from
    // the response rather than from the moment before loading (BUG-4).
    await waitFor(() =>
      expect(bff.requests.map((request) => request.path)).toContain('/proxy/authorization-metadata/scopes'),
    )
    expect(await screen.findByText(m.groupScopesNoOptions())).toBeInTheDocument()
  })

  it('[BUG-4] does not say that no scopes are available while they are loading', async () => {
    let claimedNoScopes = false
    const observer = new MutationObserver(() => {
      if (document.body.textContent?.includes(m.groupScopesNoOptions())) claimedNoScopes = true
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    renderDrawer()
    await findScopeCheckbox('invoices.read')
    observer.disconnect()

    expect(claimedNoScopes).toBe(false)
  })

  it('says when the audiences cannot be loaded', async () => {
    const { bff } = renderDrawer()
    bff.fail('get', '/proxy/authorization-metadata/audiences')

    expect(await screen.findByText(m.groupScopesUnableToLoad())).toBeInTheDocument()
  })

  it('says when the scopes of an audience cannot be loaded', async () => {
    renderDrawer({ authorizationScopes: {} })

    expect(await screen.findByText(m.groupScopesUnableToLoadOptions())).toBeInTheDocument()
  })
})

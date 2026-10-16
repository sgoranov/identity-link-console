import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_CLIENT_GROUPS } from '../../config'
import { m } from '../../paraglide/messages'
import { addTags, chooseOption, expectFieldError, findFieldError, paste } from '../../test/antd'
import { aGroup } from '../../test/fixtures'
import { ClientFormDrawer, type ClientFormValues } from './ClientFormDrawer'

const operators = aGroup({ id: 'operators-id', name: 'operators' })

const validValues: ClientFormValues = {
  name: 'billing',
  description: 'Billing service',
  audience: 'https://billing.example.com',
  redirectUri: ['https://billing.example.com/callback'],
  groups: [],
  grantTypes: ['client_credentials'],
  consentRequired: false,
  applicationUrl: '',
  termsOfServiceUrl: '',
  privacyPolicyUrl: '',
  logoUrl: '',
}

const renderDrawer = (props: Partial<ComponentProps<typeof ClientFormDrawer>> = {}) => {
  const onSubmit = vi.fn()
  render(
    <ClientFormDrawer
      open
      mode="create"
      availableGroups={[operators]}
      onClose={vi.fn()}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, user: userEvent.setup() }
}

// Shortcuts that find the field by its label and return it.
const addTagsTo = async (user: UserEvent, label: string, tags: string[]) => {
  const input = screen.getByLabelText(label)
  await addTags(user, input, tags)
  return input
}

const pasteInto = async (user: UserEvent, label: string, text: string) => {
  const input = screen.getByLabelText(label)
  await paste(user, input, text)
  return input
}

describe('ClientFormDrawer', () => {
  it('shows required field errors and does not submit an empty form', async () => {
    const { onSubmit, user } = renderDrawer()

    await user.click(screen.getByRole('button', { name: m.clientsCreate() }))

    expect(await screen.findByText(m.validationNameRequired())).toBeInTheDocument()
    expect(screen.getByText(m.validationDescriptionRequired())).toBeInTheDocument()
    expect(screen.getByText(m.validationAudienceRequired())).toBeInTheDocument()
    expect(screen.getByText(m.validationAtLeastOneRedirectUriRequired())).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it.each([
    { field: 'name', label: () => m.mainName(), value: 'billing service', error: () => m.validationNamePattern() },
    { field: 'name', label: () => m.mainName(), value: 'a'.repeat(101), error: () => m.validationNameMaxLength() },
    { field: 'description', label: () => m.mainDescription(), value: 'a'.repeat(3001), error: () => m.validationDescriptionMaxLength() },
    { field: 'audience', label: () => m.clientsFormAudience(), value: 'billing', error: () => m.validationAudienceHttpUrl() },
    { field: 'audience', label: () => m.clientsFormAudience(), value: 'ftp://files.example.com', error: () => m.validationAudienceHttpUrl() },
    { field: 'audience', label: () => m.clientsFormAudience(), value: `https://example.com/${'a'.repeat(3000)}`, error: () => m.validationAudienceMaxLength() },
    { field: 'application URL', label: () => m.clientsFormApplicationUrl(), value: 'billing.example.com', error: () => m.validationUriValid() },
  ])('rejects $field "$value"', async ({ label, value, error }) => {
    const { user } = renderDrawer()

    const input = await pasteInto(user, label(), value)

    await expectFieldError(input, error())
  })

  it('rejects redirect URIs that are not URLs', async () => {
    const { user } = renderDrawer()

    const input = await addTagsTo(user, m.clientsFormRedirectUris(), ['billing-callback'])

    await expectFieldError(input, m.validationRedirectUriValid())
  })

  it('submits the entered values', async () => {
    const { onSubmit, user } = renderDrawer()

    await pasteInto(user, m.mainName(), 'billing')
    await pasteInto(user, m.mainDescription(), 'Billing service')
    // HTTP is allowed as well as HTTPS, e.g. for services on an internal network.
    await pasteInto(user, m.clientsFormAudience(), 'http://billing.internal:8080')
    await addTagsTo(user, m.clientsFormRedirectUris(), [
      'https://billing.example.com/callback',
      'https://billing.example.com/silent',
    ])
    await chooseOption(user, screen.getByLabelText(m.mainGroups()), operators.name)
    await chooseOption(user, screen.getByLabelText(m.mainGrantTypes()), m.mainGrantClientCredentials())
    await user.click(screen.getByLabelText(m.clientsFormPublicClient()))
    await user.click(screen.getByLabelText(m.clientsFormConsentRequired()))
    await pasteInto(user, m.clientsFormApplicationUrl(), 'https://billing.example.com')
    await user.click(screen.getByRole('button', { name: m.clientsCreate() }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'billing',
        description: 'Billing service',
        audience: 'http://billing.internal:8080',
        redirectUri: ['https://billing.example.com/callback', 'https://billing.example.com/silent'],
        groups: [operators.id],
        grantTypes: ['client_credentials'],
        isPublic: true,
        consentRequired: true,
        applicationUrl: 'https://billing.example.com',
      }),
    )
  })

  describe('editing', () => {
    it('shows the current values and does not allow changing the audience or public flag', async () => {
      renderDrawer({ mode: 'edit', initialValues: validValues })

      expect(await screen.findByDisplayValue(validValues.name)).toBeInTheDocument()
      expect(screen.getByText(validValues.redirectUri[0])).toBeInTheDocument()
      expect(screen.getByLabelText(m.clientsFormAudience())).toBeDisabled()
      expect(screen.getByLabelText(m.clientsFormAudience())).toHaveValue(validValues.audience)
      expect(screen.queryByLabelText(m.clientsFormPublicClient())).not.toBeInTheDocument()
    })

    it('rejects a client with more groups than allowed', async () => {
      const groups = Array.from({ length: MAX_CLIENT_GROUPS + 1 }, (_, index) => `group-${index}`)
      const { onSubmit, user } = renderDrawer({ mode: 'edit', initialValues: { ...validValues, groups } })

      await user.click(screen.getByRole('button', { name: m.mainSaveChanges() }))

      await expectFieldError(
        screen.getByLabelText(m.mainGroups()),
        m.validationCannotSpecifyMoreThanGroups({ max: MAX_CLIENT_GROUPS }),
      )
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it.each([
    { field: 'application URL', label: () => m.clientsFormApplicationUrl() },
    { field: 'terms of service URL', label: () => m.clientsFormTermsOfServiceUrl() },
    { field: 'privacy policy URL', label: () => m.clientsFormPrivacyPolicyUrl() },
    { field: 'logo URL', label: () => m.clientsFormLogoUrl() },
  ])('[BUG-3] does not describe a too long $field as a redirect URI', async ({ label }) => {
    const { user } = renderDrawer()

    const input = await pasteInto(user, label(), `https://example.com/${'a'.repeat(3000)}`)

    expect(await findFieldError(input)).not.toBe(m.validationRedirectUriMaxLength())
  })
})

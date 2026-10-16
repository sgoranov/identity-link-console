import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_USER_GROUPS } from '../../config'
import { m } from '../../paraglide/messages'
import { chooseOption, expectFieldError } from '../../test/antd'
import { aGroup } from '../../test/fixtures'
import { UserFormDrawer } from './UserFormDrawer'

const operators = aGroup({ id: 'operators-id', name: 'operators' })

const renderDrawer = (props: Partial<ComponentProps<typeof UserFormDrawer>> = {}) => {
  const onSubmit = vi.fn()
  render(
    <UserFormDrawer
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

const fillRequiredFields = async (user: UserEvent) => {
  await user.type(screen.getByLabelText(m.mainUsername()), 'jdoe')
  await user.type(screen.getByLabelText(m.mainPassword()), 's3cret')
  await user.type(screen.getByLabelText(m.mainFirstName()), 'Jane')
  await user.type(screen.getByLabelText(m.mainLastName()), 'Doe')
  await user.type(screen.getByLabelText(m.mainEmail()), 'jane.doe@example.com')
}

describe('UserFormDrawer', () => {
  it('shows required field errors and does not submit an empty form', async () => {
    const { onSubmit, user } = renderDrawer()

    await user.click(screen.getByRole('button', { name: m.usersCreate() }))

    expect(await screen.findByText(m.validationUsernameRequired())).toBeInTheDocument()
    expect(screen.getByText(m.validationPasswordRequired())).toBeInTheDocument()
    expect(screen.getByText(m.validationFirstNameRequired())).toBeInTheDocument()
    expect(screen.getByText(m.validationLastNameRequired())).toBeInTheDocument()
    expect(screen.getByText(m.validationEmailRequired())).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it.each([
    { field: 'username', label: () => m.mainUsername(), value: 'jane doe!', error: () => m.validationUsernamePattern() },
    { field: 'username', label: () => m.mainUsername(), value: 'a'.repeat(101), error: () => m.validationUsernameMaxLength() },
    { field: 'password', label: () => m.mainPassword(), value: 'a'.repeat(51), error: () => m.validationPasswordMaxLength() },
    { field: 'first name', label: () => m.mainFirstName(), value: 'a'.repeat(101), error: () => m.validationFirstNameMaxLength() },
    { field: 'last name', label: () => m.mainLastName(), value: 'a'.repeat(101), error: () => m.validationLastNameMaxLength() },
    { field: 'email', label: () => m.mainEmail(), value: 'jane.doe@', error: () => m.validationEmailValid() },
    { field: 'email', label: () => m.mainEmail(), value: `${'a'.repeat(90)}@example.com`, error: () => m.validationEmailMaxLength() },
  ])('rejects $field "$value"', async ({ label, value, error }) => {
    const { user } = renderDrawer()
    const input = screen.getByLabelText(label())

    await user.click(input)
    await user.paste(value)

    await expectFieldError(input, error())
  })

  it('requires at least one grant type', async () => {
    const { onSubmit, user } = renderDrawer({ initialValues: { grantTypes: [] } })

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: m.usersCreate() }))

    await expectFieldError(
      screen.getByLabelText(m.mainGrantTypes()),
      m.validationAtLeastOneGrantTypeRequired(),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a user with more groups than allowed', async () => {
    const groups = Array.from({ length: MAX_USER_GROUPS + 1 }, (_, index) => `group-${index}`)
    const { onSubmit, user } = renderDrawer({ initialValues: { groups } })

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: m.usersCreate() }))

    await expectFieldError(
      screen.getByLabelText(m.mainGroups()),
      m.validationNoMoreThanGroupsSelected({ max: MAX_USER_GROUPS }),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the entered values with all grant types selected by default', async () => {
    const { onSubmit, user } = renderDrawer()

    await fillRequiredFields(user)
    await chooseOption(user, screen.getByLabelText(m.mainGroups()), operators.name)
    await user.click(screen.getByLabelText(m.mainTwoFactorAuthentication()))
    await user.click(screen.getByRole('button', { name: m.usersCreate() }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      username: 'jdoe',
      password: 's3cret',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      grantTypes: ['client_credentials', 'password', 'authorization_code', 'refresh_token', 'implicit'],
      groups: [operators.id],
      twoFaEnabled: true,
    })
  })

  it('does not require a password when editing', async () => {
    const { onSubmit, user } = renderDrawer({
      mode: 'edit',
      initialValues: {
        username: 'jdoe',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
      },
    })

    await user.click(screen.getByRole('button', { name: m.mainSaveChanges() }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ username: 'jdoe', password: '' }))
  })
})

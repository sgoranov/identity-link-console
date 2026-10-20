import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { m } from '../paraglide/messages'
import { expectFieldError, paste } from '../test/antd'
import { admin, allRolesExcept, aSession } from '../test/fixtures'
import { setupFakeBff, type FakeBffData } from '../test/bff'
import { renderRoute } from '../test/render'

const renderProfilePage = async (seed: Partial<FakeBffData> = {}) => {
  const bff = setupFakeBff(seed)
  const user = userEvent.setup()
  renderRoute('/profile')
  // The form is filled in once the current user has loaded.
  await waitFor(() => expect(screen.getByLabelText(m.mainFirstName())).toHaveValue(admin.firstName))
  return { bff, user }
}

const clickSave = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: m.mainSaveChanges() }))

describe('ProfilePage', () => {
  it("shows the signed-in user's account and access", async () => {
    await renderProfilePage({
      session: aSession({ id: admin.id, name: 'Ada Admin', roles: ['users.read', 'users.self.update'] }),
      users: [{ ...admin, grantTypes: ['client_credentials', 'refresh_token'] }],
    })

    expect(screen.getByRole('heading', { name: 'Ada Admin' })).toBeInTheDocument()
    expect(screen.getByText(admin.email)).toBeInTheDocument()
    expect(screen.getByText(admin.id)).toBeInTheDocument()
    expect(screen.getByText(m.profileStandardUser())).toBeInTheDocument()
    expect(screen.getByText('users.read')).toBeInTheDocument()
    expect(screen.getByText('users.self.update')).toBeInTheDocument()
    expect(screen.getByText('Client Credentials')).toBeInTheDocument()
    expect(screen.getByText('Refresh Token')).toBeInTheDocument()
  })

  it('asks to sign in when there is no active session', async () => {
    setupFakeBff({ session: aSession({ id: admin.id, access_token_present: false }) })

    renderRoute('/profile')

    expect(await screen.findByText(m.profileNoActiveSession())).toBeInTheDocument()
    expect(screen.queryByLabelText(m.mainFirstName())).not.toBeInTheDocument()
  })

  describe('saving', () => {
    it('saves profile changes and confirms them', async () => {
      const { bff, user } = await renderProfilePage()

      const firstName = screen.getByLabelText(m.mainFirstName())
      await user.clear(firstName)
      await paste(user, firstName, 'Adele')
      await user.click(screen.getByLabelText(m.mainTwoFactorAuthentication()))
      await clickSave(user)

      expect(await screen.findByText(m.profileUpdated())).toBeInTheDocument()
      expect(bff.mutations()).toEqual([
        {
          method: 'PUT',
          path: '/proxy/users/api/v1/profile',
          body: { firstName: 'Adele', lastName: admin.lastName, email: admin.email, twoFaEnabled: true },
        },
      ])
    })

    it('changes the password when it is confirmed, then clears the password fields', async () => {
      const { bff, user } = await renderProfilePage()

      await user.type(screen.getByLabelText(m.profileNewPassword()), 'n3w-s3cret')
      await user.type(screen.getByLabelText(m.profileConfirmNewPassword()), 'n3w-s3cret')
      await clickSave(user)

      expect(await screen.findByText(m.profileUpdated())).toBeInTheDocument()
      expect(bff.mutations()[0].body).toMatchObject({ password: 'n3w-s3cret' })
      expect(screen.getByLabelText(m.profileNewPassword())).toHaveValue('')
      expect(screen.getByLabelText(m.profileConfirmNewPassword())).toHaveValue('')
    })

    it.each([
      { problem: 'the passwords differ', password: 'n3w-s3cret', confirmation: 'other', error: () => m.profilePasswordsDoNotMatch() },
      { problem: 'only the confirmation is entered', password: '', confirmation: 'n3w-s3cret', error: () => m.profileEnterNewPasswordBeforeConfirming() },
      { problem: 'the confirmation is missing', password: 'n3w-s3cret', confirmation: '', error: () => m.profileConfirmYourNewPassword() },
    ])('does not save when $problem', async ({ password, confirmation, error }) => {
      const { bff, user } = await renderProfilePage()

      if (password) await user.type(screen.getByLabelText(m.profileNewPassword()), password)
      if (confirmation) await user.type(screen.getByLabelText(m.profileConfirmNewPassword()), confirmation)
      await clickSave(user)

      await expectFieldError(screen.getByLabelText(m.profileConfirmNewPassword()), error())
      expect(bff.mutations()).toEqual([])
    })

    it('does not save an invalid email', async () => {
      const { bff, user } = await renderProfilePage()

      const email = screen.getByLabelText(m.mainEmail())
      await user.clear(email)
      await paste(user, email, 'admin@')
      await clickSave(user)

      await expectFieldError(email, m.validationEmailValid())
      expect(bff.mutations()).toEqual([])
    })

    it('shows the BFF error when saving fails', async () => {
      const { bff, user } = await renderProfilePage()
      bff.fail('put', '/proxy/users/api/v1/profile', 'Email is already in use', 409)

      await clickSave(user)

      const notice = (await screen.findByText(m.profileUnableToUpdate())).closest<HTMLElement>('.ant-notification-notice')!
      expect(within(notice).getByText('Email is already in use')).toBeInTheDocument()
    })
  })

  describe('permissions', () => {
    it('lets a user with users.self.update edit their profile and password', async () => {
      await renderProfilePage()

      expect(screen.getByLabelText(m.mainFirstName())).toBeEnabled()
      expect(screen.getByLabelText(m.profileNewPassword())).toBeEnabled()
      expect(screen.getByRole('button', { name: m.mainSaveChanges() })).toBeEnabled()
    })

    it('makes the profile read-only without users.self.update', async () => {
      await renderProfilePage({ session: aSession({ id: admin.id, roles: allRolesExcept('users.self.update') }) })

      expect(screen.getByLabelText(m.mainFirstName())).toBeDisabled()
      expect(screen.queryByLabelText(m.profileNewPassword())).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: m.mainSaveChanges() })).toBeDisabled()
    })

    it('makes the profile read-only for a system user', async () => {
      await renderProfilePage({ users: [{ ...admin, isSystem: true }] })

      expect(screen.getByText(m.profileSystemUser())).toBeInTheDocument()
      expect(screen.getByLabelText(m.mainFirstName())).toBeDisabled()
      expect(screen.queryByLabelText(m.profileNewPassword())).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: m.mainSaveChanges() })).not.toBeInTheDocument()
    })
  })
})

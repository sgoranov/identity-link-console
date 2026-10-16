import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BFF_LOGIN_URL } from '../auth/urls'
import { m } from '../paraglide/messages'
import { setupFakeBff } from '../test/bff'
import { stubLocationAssign } from '../test/location'
import { renderRoute } from '../test/render'
import { setViewportWidth } from '../test/viewport'

const renderLogoutPage = async () => {
  // The user has signed out, so there is no session.
  setupFakeBff({ session: null })
  const user = userEvent.setup()
  renderRoute('/logout-success')
  await screen.findByText(m.logoutSuccessTitle())
  return { user }
}

describe('LogoutSuccessPage', () => {
  it('signs in again through the BFF', async () => {
    const assign = stubLocationAssign()
    const { user } = await renderLogoutPage()

    await user.click(screen.getByRole('button', { name: m.logoutSignInAgain() }))

    expect(assign).toHaveBeenCalledWith(BFF_LOGIN_URL)
  })

  it.each([
    { screenSize: 'phone', width: 375 },
    { screenSize: 'wide screen', width: 1280 },
  ])('does not show the menu or sign out on a $screenSize', async ({ width }) => {
    setViewportWidth(width)
    await renderLogoutPage()

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'menu' })).not.toBeInTheDocument()
    expect(screen.queryByText(m.layoutSignOut())).not.toBeInTheDocument()
  })
})

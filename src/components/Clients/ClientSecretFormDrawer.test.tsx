import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { m } from '../../paraglide/messages'
import { expectFieldError } from '../../test/antd'
import { ClientSecretFormDrawer } from './ClientSecretFormDrawer'

const renderDrawer = (mode: 'create' | 'edit') => {
  const onSubmit = vi.fn()
  render(<ClientSecretFormDrawer open mode={mode} onClose={vi.fn()} onSubmit={onSubmit} />)
  return { onSubmit, user: userEvent.setup() }
}

describe('ClientSecretFormDrawer', () => {
  it('rejects password hints longer than 200 characters', async () => {
    const { user } = renderDrawer('create')
    const input = screen.getByLabelText(m.clientSecretsPasswordHint())

    await user.click(input)
    await user.paste('a'.repeat(201))

    await expectFieldError(input, m.validationPasswordHintMaxLength())
  })

  it('only asks for the expiration period when generating', () => {
    renderDrawer('edit')

    expect(screen.getByText(m.clientSecretsEdit())).toBeInTheDocument()
    expect(screen.getByLabelText(m.clientSecretsPasswordHint())).toBeInTheDocument()
    expect(screen.queryByLabelText(m.clientSecretsExpirationPeriod())).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: m.mainSaveChanges() })).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { m } from '../paraglide/messages'
import { expectFieldError } from '../test/antd'
import { ClientGroupFormDrawer } from './Clients/GroupFormDrawer'
import { GroupFormDrawer } from './Users/GroupFormDrawer'

describe.each([
  { kind: 'user group', Drawer: GroupFormDrawer },
  { kind: 'client group', Drawer: ClientGroupFormDrawer },
])('$kind form', ({ Drawer }) => {
  const renderDrawer = (mode: 'create' | 'edit', initialValues?: { name: string }) => {
    const onSubmit = vi.fn()
    render(<Drawer open mode={mode} initialValues={initialValues} onClose={vi.fn()} onSubmit={onSubmit} />)
    return { onSubmit, user: userEvent.setup() }
  }

  it('requires a name', async () => {
    const { onSubmit, user } = renderDrawer('create')

    await user.click(screen.getByRole('button', { name: m.groupsCreate() }))

    await expectFieldError(screen.getByLabelText(m.mainName()), m.validationNameRequired())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects names longer than 100 characters', async () => {
    const { user } = renderDrawer('create')
    const input = screen.getByLabelText(m.mainName())

    await user.click(input)
    await user.paste('a'.repeat(101))

    await expectFieldError(input, m.validationNameMaxLength())
  })

  it('submits the entered name', async () => {
    const { onSubmit, user } = renderDrawer('create')

    await user.type(screen.getByLabelText(m.mainName()), 'operators')
    await user.click(screen.getByRole('button', { name: m.groupsCreate() }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'operators' }))
  })

  it('shows the current name when editing', async () => {
    renderDrawer('edit', { name: 'operators' })

    expect(screen.getByText(m.groupsEdit())).toBeInTheDocument()
    expect(await screen.findByDisplayValue('operators')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: m.mainSaveChanges() })).toBeInTheDocument()
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'

// The table row that contains the given text, e.g. a user's email. Ignores
// matches outside tables, such as a textarea in an open drawer.
export const findRow = (text: string) =>
  waitFor(() => {
    const row = screen
      .getAllByText(text)
      .map((element) => element.closest('tr'))
      .find((candidate) => candidate !== null)
    if (!row) throw new Error(`No table row contains "${text}"`)
    return row
  })

// The open Popconfirm with the given title. Popconfirms render in a portal,
// outside the element that opened them.
export const findPopconfirm = async (title: string) => {
  const popup = (await screen.findByText(title)).closest<HTMLElement>('[role="tooltip"]')
  if (!popup) throw new Error(`"${title}" is not inside a popup`)
  return popup
}

export const confirmPopconfirm = async (user: UserEvent, title: string, okText: string) => {
  const popup = await findPopconfirm(title)
  await user.click(within(popup).getByRole('button', { name: okText }))
}

// Enters text in one step. Much faster than user.type for long values.
export const paste = async (user: UserEvent, input: HTMLElement, text: string) => {
  await user.click(input)
  await user.paste(text)
}

// Adds tags to a tags Select, separated by commas as a user would when
// entering several at once.
export const addTags = (user: UserEvent, input: HTMLElement, tags: string[]) =>
  paste(user, input, `${tags.join(',')},`)

// The validation error currently shown under a form field, if any.
const fieldError = (input: HTMLElement) =>
  input.closest('.ant-form-item')?.querySelector('.ant-form-item-explain-error')?.textContent || undefined

// Waits until the field shows the given validation error. The error can change
// while a value is entered (e.g. "required" right after clearing the field),
// so this waits for the expected one instead of taking the first.
export const expectFieldError = (input: HTMLElement, message: string) =>
  waitFor(() => expect(fieldError(input)).toBe(message))

// The option with the given label in an open antd Select. antd renders the
// visible options separately from the accessible listbox, which only contains
// the options near the active one.
export const findOption = (label: string) =>
  waitFor(() => {
    const match = [...document.querySelectorAll<HTMLElement>('.ant-select-item-option')].find(
      (candidate) => candidate.title === label,
    )
    if (!match) throw new Error(`Select option "${label}" not found`)
    return match
  })

// Opens an antd Select and picks the option with the given label.
export const chooseOption = async (user: UserEvent, select: HTMLElement, label: string) => {
  await user.click(select)
  await user.click(await findOption(label))
}

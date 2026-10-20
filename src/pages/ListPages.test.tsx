import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { QueryPayload } from '../api/types'
import { DEFAULT_PAGE_SIZE } from '../config'
import { m } from '../paraglide/messages'
import { setupFakeBff, type FakeBffData } from '../test/bff'
import { aClient, aGroup, aSecret, aSession, aUser } from '../test/fixtures'
import { renderRoute } from '../test/render'

// Records are named record-01, record-02, ... so that sorting them by name
// orders them by number.
const pad = (number: number) => String(number).padStart(2, '0')
const recordName = (number: number) => `record-${pad(number)}`
const recordNames = (...numbers: number[]) => numbers.map(recordName)
const numbersUpTo = (count: number) => Array.from({ length: count }, (_, index) => index + 1)

const billing = aClient({ id: 'billing-id', name: 'billing' })

type Variant = {
  kind: string
  path: string
  queryPath: string
  type: string
  seed: (numbers: number[]) => Partial<FakeBffData>
  search?: { placeholder: () => string; query: string; parameter: string }
  sortColumn: () => string
  sortKey: string
  defaultOrderBy?: QueryPayload['orderBy']
}

const groupsVariant = (kind: string, path: string, service: 'users' | 'clients'): Variant => ({
  kind,
  path,
  queryPath: `/proxy/${service}/api/v1/query`,
  type: 'Group',
  seed: (numbers) => ({
    [service === 'users' ? 'userGroups' : 'clientGroups']: numbers.map((number) =>
      aGroup({ id: `${recordName(number)}-id`, name: recordName(number) }),
    ),
  }),
  search: { placeholder: () => m.groupsSearchByName(), query: 't.name LIKE :name', parameter: 'name' },
  sortColumn: () => m.mainName(),
  sortKey: 't.name',
  defaultOrderBy: { 't.id': 'DESC' },
})

// The list pages share searching, sorting and paging; each variant says how
// to seed its records and what its list requests look like.
const variants: Variant[] = [
  {
    kind: 'users',
    path: '/users',
    queryPath: '/proxy/users/api/v1/query',
    type: 'User',
    seed: (numbers) => ({
      // The signed-in user is one of the listed users.
      session: aSession({ id: `${recordName(numbers[0])}-id` }),
      users: numbers.map((number) =>
        aUser({
          id: `${recordName(number)}-id`,
          username: recordName(number),
          firstName: recordName(number),
          email: `${recordName(number)}@example.com`,
        }),
      ),
    }),
    search: {
      placeholder: () => m.usersSearch(),
      query: '(t.firstName LIKE :term OR t.lastName LIKE :term)',
      parameter: 'term',
    },
    sortColumn: () => m.mainUsername(),
    sortKey: 't.username',
  },
  groupsVariant('user groups', '/user-groups', 'users'),
  {
    kind: 'clients',
    path: '/clients',
    queryPath: '/proxy/clients/api/v1/query',
    type: 'Client',
    seed: (numbers) => ({
      clients: numbers.map((number) => aClient({ id: `${recordName(number)}-id`, name: recordName(number) })),
    }),
    search: { placeholder: () => m.clientsSearchByName(), query: 't.name LIKE :term', parameter: 'term' },
    sortColumn: () => m.mainName(),
    sortKey: 't.name',
  },
  groupsVariant('client groups', '/client-groups', 'clients'),
  {
    kind: 'client secrets',
    path: `/clients/${billing.id}/secrets`,
    queryPath: '/proxy/clients/api/v1/query',
    type: 'Secret',
    seed: (numbers) => ({
      clients: [billing],
      secrets: {
        [billing.id]: numbers.map((number) =>
          aSecret({
            id: `${recordName(number)}-id`,
            passwordHint: recordName(number),
            expirationDateTime: `2027-01-${pad(number)} 00:00:00`,
          }),
        ),
      },
    }),
    sortColumn: () => m.clientSecretsTableExpiresAt(),
    sortKey: 't.expirationDateTime',
  },
]

// The records in the table, in the order shown.
const listedRecords = () =>
  [...document.querySelectorAll('.ant-table-tbody tr')].flatMap(
    (row) => row.textContent?.match(/record-\d\d/)?.[0] ?? [],
  )

const previousButton = () => screen.getByRole('button', { name: m.mainPrevious() })
const nextButton = () => screen.getByRole('button', { name: m.mainNext() })

// The search box applies its empty term 300ms after the page opens, which
// also goes back to the first page. A page change before then is undone.
const waitForInitialSearch = () => new Promise((resolve) => setTimeout(resolve, 350))

describe.each(variants)('$kind list', (variant) => {
  const renderListPage = async (numbers: number[]) => {
    const bff = setupFakeBff(variant.seed(numbers))
    const user = userEvent.setup()
    renderRoute(variant.path)
    await waitFor(() => expect(listedRecords()).not.toHaveLength(0))

    // The requests for the list itself, leaving out lookups of single records.
    const listRequests = () =>
      bff.requests
        .filter((request) => request.path === variant.queryPath)
        .map((request) => request.body as QueryPayload)
        .filter((payload) => payload.type === variant.type && payload.limit === DEFAULT_PAGE_SIZE)
    const lastListRequest = () => listRequests().at(-1)!

    return { bff, user, listRequests, lastListRequest }
  }

  const goToNextPage = async (user: ReturnType<typeof userEvent.setup>) => {
    const firstPage = listedRecords()
    await waitForInitialSearch()
    await user.click(nextButton())
    await waitFor(() => expect(listedRecords()).not.toEqual(firstPage))
  }

  describe('paging', () => {
    it('shows one page at a time and moves between pages', async () => {
      const numbers = numbersUpTo(DEFAULT_PAGE_SIZE + 2)
      const { user, lastListRequest } = await renderListPage(numbers)

      const firstPage = listedRecords()
      expect(firstPage).toHaveLength(DEFAULT_PAGE_SIZE)
      expect(lastListRequest()).toMatchObject({ offset: 0, limit: DEFAULT_PAGE_SIZE })
      expect(previousButton()).toBeDisabled()
      expect(nextButton()).toBeEnabled()

      await waitForInitialSearch()
      await user.click(nextButton())

      await waitFor(() => expect(listedRecords()).toHaveLength(2))
      expect(lastListRequest()).toMatchObject({ offset: DEFAULT_PAGE_SIZE, limit: DEFAULT_PAGE_SIZE })
      expect([...firstPage, ...listedRecords()].sort()).toEqual(recordNames(...numbers))
      expect(nextButton()).toBeDisabled()
      expect(previousButton()).toBeEnabled()

      await user.click(previousButton())

      await waitFor(() => expect(listedRecords()).toEqual(firstPage))
      expect(previousButton()).toBeDisabled()
    })

    it('does not offer another page when everything fits on one', async () => {
      await renderListPage(numbersUpTo(3))

      expect(listedRecords()).toHaveLength(3)
      expect(previousButton()).toBeDisabled()
      expect(nextButton()).toBeDisabled()
    })
  })

  describe('sorting', () => {
    const clickSortColumn = async (user: ReturnType<typeof userEvent.setup>) =>
      user.click(within(document.querySelector('thead')!).getByText(variant.sortColumn()))

    it('sorts ascending, then descending, then goes back to the default order', async () => {
      const { user, lastListRequest } = await renderListPage([2, 3, 1])
      const defaultOrder = listedRecords()
      expect(lastListRequest().orderBy).toEqual(variant.defaultOrderBy)

      await clickSortColumn(user)

      await waitFor(() => expect(listedRecords()).toEqual(recordNames(1, 2, 3)))
      expect(lastListRequest().orderBy).toEqual({ [variant.sortKey]: 'ASC' })

      await clickSortColumn(user)

      await waitFor(() => expect(listedRecords()).toEqual(recordNames(3, 2, 1)))
      expect(lastListRequest().orderBy).toEqual({ [variant.sortKey]: 'DESC' })

      await clickSortColumn(user)

      await waitFor(() => expect(lastListRequest().orderBy).toEqual(variant.defaultOrderBy))
      await waitFor(() => expect(listedRecords()).toEqual(defaultOrder))
    })

    it('goes back to the first page when the order changes', async () => {
      const { user, lastListRequest } = await renderListPage(numbersUpTo(DEFAULT_PAGE_SIZE + 2))
      await goToNextPage(user)

      await clickSortColumn(user)

      await waitFor(() => expect(lastListRequest()).toMatchObject({ orderBy: { [variant.sortKey]: 'ASC' }, offset: 0 }))
      await waitFor(() => expect(listedRecords()).toEqual(recordNames(...numbersUpTo(DEFAULT_PAGE_SIZE))))
    })
  })

  const { search } = variant
  if (search) {
    describe('searching', () => {
      const searchBox = () => screen.getByPlaceholderText(search.placeholder())

      it('searches once typing stops', async () => {
        const { user, listRequests } = await renderListPage([1, 2, 3])

        await user.type(searchBox(), 'record-02')

        await waitFor(() => expect(listedRecords()).toEqual(recordNames(2)))
        // One request for the whole term, not one per keystroke.
        expect(listRequests().filter((payload) => payload.query)).toEqual([
          expect.objectContaining({
            query: search.query,
            parameters: { [search.parameter]: '%record-02%' },
            offset: 0,
          }),
        ])
      })

      it('goes back to the first page when searching', async () => {
        const { user, lastListRequest } = await renderListPage(numbersUpTo(DEFAULT_PAGE_SIZE + 2))
        await goToNextPage(user)

        await user.type(searchBox(), 'record-1')

        await waitFor(() => expect(listedRecords().sort()).toEqual(recordNames(10, 11, 12)))
        expect(lastListRequest()).toMatchObject({ query: search.query, offset: 0 })
      })

      it('lists every record again when the search is cleared', async () => {
        const { user, lastListRequest } = await renderListPage([1, 2, 3])
        await user.type(searchBox(), 'record-02')
        await waitFor(() => expect(listedRecords()).toEqual(recordNames(2)))

        await user.clear(searchBox())

        // The unfiltered list is shown from the cache, then refreshed.
        await waitFor(() => expect(listedRecords()).toHaveLength(3))
        await waitFor(() => expect(lastListRequest().query).toBeUndefined())
      })

      it('keeps the search box focused while the results load', async () => {
        const { user } = await renderListPage([1, 2, 3])

        await user.type(searchBox(), 'record-02')

        await waitFor(() => expect(listedRecords()).toEqual(recordNames(2)))
        expect(searchBox()).toHaveFocus()
      })
    })
  }
})

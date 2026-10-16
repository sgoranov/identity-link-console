import { http, HttpResponse } from 'msw'
import { BFF_BASE_URL } from '../config'
import type { AuthorizationScopes } from '../api/authorization'
import type { ClientSecretRecord } from '../api/clients/fetchClientSecrets'
import type { Group, GroupScope, QueryPayload, QueryResponse } from '../api/types'
import type { SessionInfo } from '../api/users/fetchSession'
import type { ClientRecord } from '../components/Clients/ClientTable.columns'
import type { UserRecord } from '../components/Users/UserTable.columns'
import { aClient, admin, aSession, aUser } from './fixtures'
import { server } from './server'

// URL pattern for MSW handlers, matching what buildBffUrl produces.
export const bffUrl = (path: string) => `${BFF_BASE_URL}${path}`

const queryResponse = <T>(result: T[], hasMore = false): QueryResponse<T> => ({
  response: { result, hasMore },
})

export type FakeBffData = {
  // null makes /session respond 401, as it does when the login has expired.
  session: SessionInfo | null
  users: UserRecord[]
  userGroups: Group[]
  clients: ClientRecord[]
  clientGroups: Group[]
  // Keyed by client id.
  secrets: Record<string, ClientSecretRecord[]>
  // Keyed by group id.
  userGroupScopes: Record<string, GroupScope[]>
  clientGroupScopes: Record<string, GroupScope[]>
  audiences: string[]
  authorizationScopes: Record<string, AuthorizationScopes>
}

export type RecordedRequest = {
  method: string
  // Path relative to the BFF base URL, without the query string.
  path: string
  body: unknown
}

type Method = 'get' | 'post' | 'put' | 'delete'

const field = (record: object, name: string) => (record as Record<string, unknown>)[name]

// Orders records like the payload's orderBy, e.g. { 't.name': 'ASC' }.
const compareBy = (orderBy: QueryPayload['orderBy'] = {}) => (a: object, b: object) => {
  for (const [key, direction] of Object.entries(orderBy)) {
    const name = key.replace(/^t\./, '')
    const result = String(field(a, name) ?? '').localeCompare(String(field(b, name) ?? ''))
    if (result !== 0) return direction.toUpperCase() === 'ASC' ? result : -result
  }
  return 0
}

const paginate = <T extends object>(items: T[], payload: QueryPayload): QueryResponse<T> => {
  const sorted = [...items].sort(compareBy(payload.orderBy))
  const offset = payload.offset ?? 0
  const limit = payload.limit ?? sorted.length
  return queryResponse(sorted.slice(offset, offset + limit), offset + limit < sorted.length)
}

// SQL LIKE: % matches any text and _ any single character.
const likePattern = (pattern: string) =>
  new RegExp(
    `^${[...pattern]
      .map((char) => (char === '%' ? '.*' : char === '_' ? '.' : char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      .join('')}$`,
  )

// The search filters the list pages send, such as "t.name LIKE :term" or
// "(t.firstName LIKE :term OR t.lastName LIKE :term)". Undefined for any other
// query.
const likeSearch = (query: string, parameters: QueryPayload['parameters'] = {}) => {
  const conditions = query
    .replace(/^\((.*)\)$/, '$1')
    .split(' OR ')
    .map((condition) => /^t\.(\w+) LIKE :(\w+)$/.exec(condition))
  if (!conditions.every(Boolean)) return undefined

  return (record: object) =>
    conditions.some((condition) => {
      const [, name, parameter] = condition!
      return likePattern(String(parameters[parameter])).test(String(field(record, name) ?? ''))
    })
}

// A page of records, filtered by the search if there is one.
const list = <T extends object>(items: T[], payload: QueryPayload) => {
  if (!payload.query) return paginate(items, payload)
  const matches = likeSearch(payload.query, payload.parameters)
  return matches ? paginate(items.filter(matches), payload) : undefined
}

const notFound = (what: string) => HttpResponse.json({ error: `${what} not found` }, { status: 404 })

// An in-memory BFF covering every endpoint the console calls. Mutations change
// the data, so a page that refetches after saving sees the result, and every
// request is recorded for assertions on what the page sent.
export const setupFakeBff = (seed: Partial<FakeBffData> = {}) => {
  const data: FakeBffData = structuredClone({
    session: aSession({ id: admin.id }),
    users: [admin],
    userGroups: [],
    clients: [],
    clientGroups: [],
    secrets: {},
    userGroupScopes: {},
    clientGroupScopes: {},
    audiences: [],
    authorizationScopes: {},
    ...seed,
  })
  const requests: RecordedRequest[] = []
  const basePath = new URL(bffUrl(''), window.location.origin).pathname
  let nextId = 1
  const newId = (prefix: string) => `${prefix}-${nextId++}`

  const record = async (request: Request) => {
    const text = await request.clone().text()
    const body: unknown = text ? JSON.parse(text) : undefined
    requests.push({
      method: request.method,
      path: new URL(request.url).pathname.slice(basePath.length),
      body,
    })
    return body
  }

  const queryUsersService = (payload: QueryPayload) => {
    const { type, query, parameters = {} } = payload

    if (type === 'User' && query === 't.id = :id') {
      return queryResponse(data.users.filter((user) => user.id === parameters.id))
    }
    if (type === 'User' && query === 'g.id = :groupId') {
      const members = data.users.filter((user) => user.groups.data.includes(String(parameters.groupId)))
      return paginate(members, payload)
    }
    if (type === 'Group' && query === 'u.username = :username') {
      const user = data.users.find((candidate) => candidate.username === parameters.username)
      return paginate(data.userGroups.filter((group) => user?.groups.data.includes(group.id)), payload)
    }
    if (type === 'User') return list(data.users, payload)
    if (type === 'Group') return list(data.userGroups, payload)
    return undefined
  }

  const queryClientsService = (payload: QueryPayload) => {
    const { type, query, parameters = {} } = payload

    if (type === 'Client' && query === 't.id = :id') {
      return queryResponse(data.clients.filter((client) => client.id === parameters.id))
    }
    if (type === 'Client' && query === 'g.id = :groupId') {
      const members = data.clients.filter((client) =>
        client.groups?.data.includes(String(parameters.groupId)),
      )
      return paginate(members, payload)
    }
    if (type === 'Secret' && query === 'c.id = :id') {
      return paginate(data.secrets[String(parameters.id)] ?? [], payload)
    }
    if (type === 'Client') return list(data.clients, payload)
    if (type === 'Group') return list(data.clientGroups, payload)
    return undefined
  }

  // Fails loudly on query shapes the fake does not understand, instead of
  // returning data that would let a test pass for the wrong reason.
  const queryHandler = (path: string, run: (payload: QueryPayload) => QueryResponse<unknown> | undefined) =>
    http.post(bffUrl(path), async ({ request }) => {
      const payload = (await record(request)) as QueryPayload
      const result = run(payload)
      return result
        ? HttpResponse.json(result)
        : HttpResponse.json(
            { error: `Fake BFF does not support this query: ${JSON.stringify(payload)}` },
            { status: 501 },
          )
    })

  const groupScopeHandlers = (service: 'users' | 'clients', scopes: Record<string, GroupScope[]>) => [
    http.get(bffUrl(`/proxy/${service}/api/v1/group/:groupId/scope`), async ({ request, params }) => {
      await record(request)
      return HttpResponse.json({ response: { scopes: scopes[String(params.groupId)] ?? [] } })
    }),
    http.post(bffUrl(`/proxy/${service}/api/v1/group/:groupId/scope`), async ({ request, params }) => {
      const body = (await record(request)) as Pick<GroupScope, 'audience' | 'scope'>
      const scope = { id: newId('scope'), ...body }
      const groupId = String(params.groupId)
      scopes[groupId] = [...(scopes[groupId] ?? []), scope]
      return HttpResponse.json({ response: { scope } })
    }),
    http.delete(bffUrl(`/proxy/${service}/api/v1/group/:groupId/scope/:scopeId`), async ({ request, params }) => {
      await record(request)
      const groupId = String(params.groupId)
      scopes[groupId] = (scopes[groupId] ?? []).filter((scope) => scope.id !== params.scopeId)
      return new HttpResponse(null, { status: 204 })
    }),
  ]

  const groupHandlers = (service: 'users' | 'clients', groups: () => Group[], setGroups: (groups: Group[]) => void) => [
    http.post(bffUrl(`/proxy/${service}/api/v1/group`), async ({ request }) => {
      const body = (await record(request)) as { name: string }
      const group = { id: newId('group'), name: body.name }
      setGroups([...groups(), group])
      return HttpResponse.json(group)
    }),
    http.put(bffUrl(`/proxy/${service}/api/v1/group/:id`), async ({ request, params }) => {
      const body = (await record(request)) as { name: string }
      const group = groups().find((candidate) => candidate.id === params.id)
      if (!group) return notFound('Group')
      group.name = body.name
      return HttpResponse.json(group)
    }),
    http.delete(bffUrl(`/proxy/${service}/api/v1/group/:id`), async ({ request, params }) => {
      await record(request)
      if (!groups().some((group) => group.id === params.id)) return notFound('Group')
      setGroups(groups().filter((group) => group.id !== params.id))
      return new HttpResponse(null, { status: 204 })
    }),
  ]

  server.use(
    http.get(bffUrl('/session'), async ({ request }) => {
      await record(request)
      return data.session
        ? HttpResponse.json(data.session)
        : HttpResponse.json({ loginUrl: bffUrl('/login') }, { status: 401 })
    }),

    // Users service
    queryHandler('/proxy/users/api/v1/query', queryUsersService),
    http.post(bffUrl('/proxy/users/api/v1/user'), async ({ request }) => {
      const { groups = [], password: _password, ...fields } = (await record(request)) as UserRecord & {
        groups?: string[]
        password?: string
      }
      const user = aUser({ ...fields, id: newId('user'), groups: { data: groups, hasMore: false } })
      data.users.push(user)
      return HttpResponse.json(user)
    }),
    http.put(bffUrl('/proxy/users/api/v1/user/:id'), async ({ request, params }) => {
      const { groups, password: _password, ...fields } = (await record(request)) as Partial<UserRecord> & {
        groups?: string[]
        password?: string
      }
      const user = data.users.find((candidate) => candidate.id === params.id)
      if (!user) return notFound('User')
      Object.assign(user, fields, groups ? { groups: { data: groups, hasMore: false } } : {})
      return HttpResponse.json(user)
    }),
    http.delete(bffUrl('/proxy/users/api/v1/user/:id'), async ({ request, params }) => {
      await record(request)
      if (!data.users.some((user) => user.id === params.id)) return notFound('User')
      data.users = data.users.filter((user) => user.id !== params.id)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(bffUrl('/proxy/users/api/v1/profile'), async ({ request }) => {
      const { password: _password, ...fields } = (await record(request)) as Partial<UserRecord> & {
        password?: string
      }
      const user = data.users.find((candidate) => candidate.id === data.session?.id)
      if (!user) return notFound('User')
      Object.assign(user, fields)
      return HttpResponse.json(user)
    }),
    ...groupHandlers('users', () => data.userGroups, (groups) => { data.userGroups = groups }),
    ...groupScopeHandlers('users', data.userGroupScopes),

    // Clients service
    queryHandler('/proxy/clients/api/v1/query', queryClientsService),
    http.post(bffUrl('/proxy/clients/api/v1/client'), async ({ request }) => {
      const { groups = [], isPublic, ...fields } = (await record(request)) as ClientRecord & {
        groups?: string[]
        isPublic?: boolean
      }
      const client = aClient({ ...fields, id: newId('client'), public: isPublic, groups: { data: groups, hasMore: false } })
      data.clients.push(client)
      return HttpResponse.json(client)
    }),
    http.put(bffUrl('/proxy/clients/api/v1/client/:id'), async ({ request, params }) => {
      const { groups, ...fields } = (await record(request)) as Partial<ClientRecord> & { groups?: string[] }
      const client = data.clients.find((candidate) => candidate.id === params.id)
      if (!client) return notFound('Client')
      Object.assign(client, fields, groups ? { groups: { data: groups, hasMore: false } } : {})
      return HttpResponse.json(client)
    }),
    http.delete(bffUrl('/proxy/clients/api/v1/client/:id'), async ({ request, params }) => {
      await record(request)
      if (!data.clients.some((client) => client.id === params.id)) return notFound('Client')
      data.clients = data.clients.filter((client) => client.id !== params.id)
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(bffUrl('/proxy/clients/api/v1/secret/issue'), async ({ request }) => {
      const body = (await record(request)) as { client: string; passwordHint?: string; expirationPeriod: string }
      const id = newId('secret')
      data.secrets[body.client] = [
        ...(data.secrets[body.client] ?? []),
        { id, passwordHint: body.passwordHint ?? null, expirationPeriod: body.expirationPeriod, expirationDateTime: null },
      ]
      return HttpResponse.json({
        response: {
          secret: {
            password: `generated-${id}`,
            passwordHint: body.passwordHint,
            expirationPeriod: body.expirationPeriod,
            expirationDateTime: null,
            client: body.client,
          },
        },
      })
    }),
    http.delete(bffUrl('/proxy/clients/api/v1/secret/:id'), async ({ request, params }) => {
      await record(request)
      const clientId = Object.keys(data.secrets).find((key) =>
        data.secrets[key].some((secret) => secret.id === params.id),
      )
      if (!clientId) return notFound('Secret')
      data.secrets[clientId] = data.secrets[clientId].filter((secret) => secret.id !== params.id)
      return new HttpResponse(null, { status: 204 })
    }),
    ...groupHandlers('clients', () => data.clientGroups, (groups) => { data.clientGroups = groups }),
    ...groupScopeHandlers('clients', data.clientGroupScopes),

    // Authorization metadata
    http.get(bffUrl('/proxy/authorization-metadata/audiences'), async ({ request }) => {
      await record(request)
      return HttpResponse.json({ audiences: data.audiences })
    }),
    http.get(bffUrl('/proxy/authorization-metadata/scopes'), async ({ request }) => {
      await record(request)
      const audience = new URL(request.url).searchParams.get('audience') ?? ''
      const scopes = data.authorizationScopes[audience]
      return scopes ? HttpResponse.json(scopes) : notFound('Audience')
    }),
  )

  return {
    data,
    requests,
    // Requests that change data, i.e. everything except reads and queries.
    mutations: () =>
      requests.filter((request) => request.method !== 'GET' && !request.path.endsWith('/query')),
    // Makes the endpoint respond with an error, like the BFF does when a call fails.
    fail: (method: Method, path: string, error = 'Internal server error', status = 500) => {
      server.use(http[method](bffUrl(path), () => HttpResponse.json({ error }, { status })))
    },
  }
}

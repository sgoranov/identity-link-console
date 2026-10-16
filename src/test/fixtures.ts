import type { ClientSecretRecord } from '../api/clients/fetchClientSecrets'
import type { Group } from '../api/types'
import type { SessionInfo } from '../api/users/fetchSession'
import type { ClientRecord } from '../components/Clients/ClientTable.columns'
import type { UserRecord } from '../components/Users/UserTable.columns'
import { ROLES, type Role } from '../auth/roles'

// Sample records for tests. Each builder returns a valid record; pass only the
// fields the test cares about.

export const allRolesExcept = (...excluded: Role[]): Role[] =>
  ROLES.filter((role) => !excluded.includes(role))

export const aSession = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
  id: 'admin-id',
  access_token_present: true,
  refresh_token_present: true,
  roles: [...ROLES],
  name: 'Admin',
  ...overrides,
})

export const aUser = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: 'user-id',
  username: 'jdoe',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  groups: { data: [], hasMore: false },
  grantTypes: ['password'],
  twoFaEnabled: false,
  ...overrides,
})

// The signed-in user in the default session.
export const admin = aUser({
  id: 'admin-id',
  username: 'admin',
  firstName: 'Ada',
  lastName: 'Admin',
  email: 'admin@example.com',
})

export const aGroup = (overrides: Partial<Group> = {}): Group => ({
  id: 'group-id',
  name: 'operators',
  ...overrides,
})

export const aClient = (overrides: Partial<ClientRecord> = {}): ClientRecord => ({
  id: 'client-id',
  name: 'billing',
  description: 'Billing service',
  audience: 'https://billing.example.com',
  redirectUri: ['https://billing.example.com/callback'],
  groups: { data: [], hasMore: false },
  grantTypes: ['client_credentials'],
  public: false,
  consentRequired: false,
  applicationUrl: '',
  termsOfServiceUrl: '',
  privacyPolicyUrl: '',
  logoUrl: '',
  ...overrides,
})

export const aSecret = (overrides: Partial<ClientSecretRecord> = {}): ClientSecretRecord => ({
  id: 'secret-id',
  passwordHint: 'deploy key',
  expirationDateTime: '2027-01-01 00:00:00',
  expirationPeriod: '3m',
  ...overrides,
})

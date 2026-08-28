export const ROLES = [
  'users.read', 'users.write', 'users.delete', 'users.auth', 'users.query',
  'users.self.update', 'users.groups.read', 'users.groups.write', 'users.groups.delete',
  'clients.read', 'clients.write', 'clients.delete', 'clients.auth', 'clients.query',
  'clients.groups.read', 'clients.groups.write', 'clients.groups.delete',
  'clients.secrets.read', 'clients.secrets.write', 'clients.secrets.delete',
  '2fa.read', '2fa.write', '2fa.reset',
] as const

export type Role = (typeof ROLES)[number]

export const hasRole = (roles: readonly string[] | undefined, role: Role) =>
  roles?.includes(role) ?? false


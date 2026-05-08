# Identity Link Console

Identity Link Console is the administrative UI for managing users, clients, groups, and secrets in the Identity Link platform. It provides a single place to configure access, review assignments, and manage client credentials.

## Features

- Users and user groups management
- Clients and client groups management
- Client secrets generation and rotation workflows
- Search, sort, and pagination across listings

## Configuration

The console reads runtime configuration from Vite environment variables:

- `VITE_BFF_BASE_URL` - Base URL for the BFF proxy (default: `/bff`)
- `VITE_DEFAULT_PAGE_SIZE` - Default page size for list views
- `VITE_MAX_USER_GROUPS` - Max groups per user selection
- `VITE_MAX_CLIENT_GROUPS` - Max groups per client selection

## Development

```bash
npm install
npm run dev
```

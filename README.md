# Identity Link Console

Identity Link Console is the administrative UI for managing users, clients, groups, and secrets in the
Identity Link platform. It provides a single place to configure access, review assignments,
and manage client credentials.

## Features

- **Users**: create, edit and delete users, and assign them to groups.
- **User groups and client groups**: create, edit and delete groups, and assign scopes to them per
  audience. Before a group is deleted, the console shows how many users or clients are still in it.
- **Clients**: manage OAuth clients, including their audience, redirect URIs, grant types, public
  client and consent settings, application, terms of service, privacy policy and logo URLs, and groups.
- **Client secrets**: generate a secret, which is shown once and can be copied, and delete old ones.
- **Profile**: every signed-in user can see their account. With `users.self.update` they can also
  change their name, email, password and two-factor authentication setting.
- Search, sort and pagination on every list.
- Pages and actions follow the signed-in user's roles (see [Access control](#access-control)).
- English and Bulgarian.

## How it works

The console is a single-page app (React, Ant Design, TanStack Router and TanStack Query) served under
`/admin-console/`. It talks only to the Identity Link BFF (backend for frontend), never to the
identity services directly, and holds no tokens: requests carry the BFF's session cookie.

- `GET {BFF}/session` tells the console who is signed in and which roles they have.
- `{BFF}/login` and `{BFF}/logout` sign the user in and out. Whenever the BFF answers `401`, the
  console sends the browser to the login URL in the BFF's response.
- `{BFF}/proxy/users/…`, `{BFF}/proxy/clients/…` and `{BFF}/proxy/authorization-metadata/…` reach the
  users service, the clients service and the authorization metadata (audiences and scopes).

`{BFF}` is the base URL from `VITE_BFF_BASE_URL`, `/bff` on the console's own origin by default.

## Access control

The console shows a page or an action only when the session has the role for it. It only hides what
the user cannot do; the backend services are what enforce access.

| Page           | Path                     | View                   | Create and edit         | Delete                   |
|----------------|--------------------------|------------------------|-------------------------|--------------------------|
| Profile        | `/profile`               | any signed-in user     | `users.self.update`     | –                        |
| Users          | `/users`                 | `users.read`           | `users.write`           | `users.delete`           |
| User groups    | `/user-groups`           | `users.groups.read`    | `users.groups.write`    | `users.groups.delete`    |
| Clients        | `/clients`               | `clients.read`         | `clients.write`         | `clients.delete`         |
| Client groups  | `/client-groups`         | `clients.groups.read`  | `clients.groups.write`  | `clients.groups.delete`  |
| Client secrets | `/clients/{id}/secrets`  | `clients.secrets.read` | `clients.secrets.write` | `clients.secrets.delete` |

Paths are relative to `/admin-console`. Opening a page without its role leads back to the profile.

## Getting started

Requirements:

- Node.js 24 (the exact version is in [`.nvmrc`](.nvmrc)) and npm
- A running Identity Link BFF

```sh
npm ci
npm run dev
```

The dev server runs at <http://localhost:9005/admin-console/>.

By default the console calls the BFF at `/bff` on the same origin as the page, so it is meant to run
behind a reverse proxy that forwards `/admin-console/` to the console and `/bff` to the BFF. To point it
at a BFF elsewhere, set `VITE_BFF_BASE_URL`, for example in a `.env.local` file, which git ignores:

```sh
VITE_BFF_BASE_URL=https://identity.example.com/bff
```

The dev server only accepts requests addressed to `localhost`, `127.0.0.1` or the host in
`VITE_BFF_BASE_URL`, so a reverse proxy on the BFF's host can forward to it. A BFF on another origin
must also allow credentialed cross-origin requests from the console.

## Configuration

| Variable                 | Default | Description                                                     |
|--------------------------|---------|-----------------------------------------------------------------|
| `VITE_BFF_BASE_URL`      | `/bff`  | Base URL of the BFF, either relative to the console's origin or absolute. |
| `VITE_DEFAULT_PAGE_SIZE` | `10`    | Rows per page in every list.                                    |
| `VITE_MAX_USER_GROUPS`   | `20`    | Most groups one user can be assigned to.                        |
| `VITE_MAX_CLIENT_GROUPS` | `20`    | Most groups one client can be assigned to.                      |

Each setting can be given at build time or at runtime:

- **Build time**: Vite reads `VITE_*` variables from the environment and from `.env` files when
  running `npm run dev` or `npm run build`.
- **Runtime**: the Docker image writes the container's environment variables into
  `runtime-config.js` when it starts, so one image can be configured per environment.

A runtime value takes precedence over a build-time one. A setting that is unset or empty falls back to
the build-time value and then to the default, and a number setting that is not a positive number uses
the default.

## Docker

The [`Dockerfile`](Dockerfile) has two targets:

- `prod`: builds the app and serves it with nginx at `/admin-console/` on port 9005.
- `dev`: runs the Vite dev server on port 9005.

```sh
docker build --target prod -t identity-link-console .
docker run --rm -p 9005:9005 -e VITE_BFF_BASE_URL=/bff identity-link-console
```

nginx serves only the console. The BFF has to be routed by a reverse proxy in front of it.

Images are published to the GitHub Container Registry:

- `ghcr.io/sgoranov/identity-link-console:develop`, built from every push to `develop`
- `ghcr.io/sgoranov/identity-link-console:<version>` and `:latest`, built from every version tag such as `1.2.3`

## Scripts

| Command                     | Description                                                       |
|-----------------------------|-------------------------------------------------------------------|
| `npm run dev`               | Start the dev server with hot reloading.                          |
| `npm run build`             | Compile the translations, type-check and build into `dist/`.      |
| `npm run preview`           | Serve the build from `dist/` on port 9005.                        |
| `npm run lint`              | Lint with [oxlint](https://oxc.rs/).                              |
| `npm test`                  | Run the tests once.                                               |
| `npm run test:watch`        | Run the tests in watch mode.                                      |
| `npm run test:coverage`     | Run the tests and write a coverage report to `coverage/`.         |
| `npm run paraglide:compile` | Compile the translations into `src/paraglide/`.                   |

## Testing

The tests use [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/) in jsdom.
Every request goes to an in-memory fake BFF built with [MSW](https://mswjs.io/)
([`src/test/bff.ts`](src/test/bff.ts)), so the tests need no backend. Page tests click through the real
forms and drawers, so the whole suite takes a minute or two.

## Translations

Messages live in [`messages/en.json`](messages/en.json) and [`messages/bg.json`](messages/bg.json), with
English as the base language. [Paraglide JS](https://paraglidejs.com/) compiles them into
`src/paraglide/`, which is generated and not committed. To add a message, add its key to both files and
use it in code as `m.yourMessageKey()`. Users switch the language in the header, or in the menu on
small screens.

## Project structure

```
src/
  api/          BFF calls, one file per operation (users/, clients/)
  auth/         roles and the BFF login and logout URLs
  components/   tables, forms and drawers (Users/, Clients/) and the page layout
  pages/        one component per page
  test/         test setup, the fake BFF, fixtures and helpers
  config.ts     the settings described in Configuration
  router.tsx    routes, and the session and role checks
messages/       translations
docker/         nginx config and the container entrypoint
```

## License

Identity Link is open source software licensed under the [MIT License](LICENSE), which permits reuse,
modification, and distribution with minimal restrictions.

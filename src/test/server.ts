import { setupServer } from 'msw/node'

// No default handlers: each test declares the BFF responses it relies on, and
// any request without a handler fails the test (see setup.ts).
export const server = setupServer()

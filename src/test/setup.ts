import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { cleanup, configure, waitFor } from '@testing-library/react'
import { ConfigProvider, notification } from 'antd'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { server } from './server'
import { matchMedia, resetViewport } from './viewport'

// The first render in a test file loads antd and the lazily imported route,
// which can take longer than the default 1s when test files run in parallel.
configure({ asyncUtilTimeout: 5000 })

// jsdom does not implement matchMedia or ResizeObserver, which antd uses for
// responsive layout and measuring tables, selects and drawers.
Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMedia })

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// The router restores the scroll position on navigation.
window.scrollTo = () => {}

// antd measures the scrollbar via getComputedStyle(el, '::-webkit-scrollbar'),
// which jsdom does not support and reports as "Not implemented".
const getComputedStyle = window.getComputedStyle.bind(window)
window.getComputedStyle = (element) => getComputedStyle(element)

// Notifications animate out, and jsdom never finishes the animation, so a
// destroyed notification would stay in the DOM and leak into the next test.
ConfigProvider.config({
  holderRender: (children) =>
    createElement(ConfigProvider, { theme: { token: { motion: false } } }, children),
})

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

// Errors and warnings logged during a test, such as React and antd warnings,
// fail it. A test that expects one stubs the console method itself, which
// replaces the recording.
let unexpectedLogs: string[] = []

beforeEach(() => {
  unexpectedLogs = []
  for (const method of ['error', 'warn'] as const) {
    const log = console[method]
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      unexpectedLogs.push(`console.${method}: ${args.map(String).join(' ')}`)
      log(...args)
    })
  }
})

afterEach(async () => {
  cleanup()
  // Notifications render outside the test's container, so cleanup() misses
  // them. Only destroy when one is open: destroy() otherwise renders antd's
  // notification holder, and that render can outlive the test environment.
  if (document.querySelector('.ant-notification-notice')) {
    notification.destroy()
    await waitFor(() => {
      if (document.querySelector('.ant-notification-notice')) throw new Error('Notifications still open')
    })
  }
  server.resetHandlers()
  resetViewport()

  // Checked last, as unmounting can log too.
  if (unexpectedLogs.length > 0) {
    throw new Error(`The test logged unexpected errors or warnings:\n${unexpectedLogs.join('\n')}`)
  }
})

afterAll(() => server.close())

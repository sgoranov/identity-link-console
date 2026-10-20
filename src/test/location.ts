import { vi } from 'vitest'

// jsdom cannot load another page, and window.location.assign cannot be spied
// on, so tests replace window.location to see where the app sends the browser.
export const stubLocationAssign = () => {
  const assign = vi.fn()
  vi.stubGlobal('location', { origin: window.location.origin, href: window.location.href, assign })
  return assign
}

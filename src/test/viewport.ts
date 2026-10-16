// jsdom has no layout, so it does not implement matchMedia. antd's responsive
// layout (Grid.useBreakpoint) asks media queries such as "(min-width: 768px)".
// Tests get a phone-sized viewport unless they set another width before
// rendering.
const PHONE_WIDTH = 375

let viewportWidth = PHONE_WIDTH

export const setViewportWidth = (width: number) => {
  viewportWidth = width
}

export const resetViewport = () => {
  viewportWidth = PHONE_WIDTH
}

// Matches queries made of min-width and max-width conditions; any other
// query, such as prefers-color-scheme, never matches.
const matchesViewport = (query: string) => {
  const conditions = [...query.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)]
  return (
    conditions.length > 0 &&
    conditions.every(([, kind, width]) =>
      kind === 'min' ? viewportWidth >= Number(width) : viewportWidth <= Number(width),
    )
  )
}

export const matchMedia = (query: string) => ({
  matches: matchesViewport(query),
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})

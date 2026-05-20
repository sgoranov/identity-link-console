import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ConfigProvider } from 'antd'
import { routeTree, type RouterContext } from './router'
import { buildBffUrl } from './api/bff'
import { fetchJson } from './api/http'
import './index.css'
import 'antd/dist/reset.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      queryFn: async ({ queryKey }) => {
        const [path, params] = queryKey as [string, Record<string, string | number | boolean | undefined>?]
        const url = buildBffUrl(path, params)
        return fetchJson(url)
      },
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient } satisfies RouterContext,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, ''),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV ? (
          <TanStackRouterDevtools router={router} position="bottom-right" />
        ) : null}
      </QueryClientProvider>
    </ConfigProvider>
  </StrictMode>,
)

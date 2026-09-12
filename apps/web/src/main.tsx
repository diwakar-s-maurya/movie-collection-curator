import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html is missing <div id="root">')

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

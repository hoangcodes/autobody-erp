import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/router'
import { Toaster } from '@/components/ui/Toaster'
import { initTheme } from '@/features/theme/themeStore'
import './index.css'

// Apply persisted / prefers-color-scheme theme before first paint.
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>,
)

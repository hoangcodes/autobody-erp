import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { KanbanBoard } from '@/features/workflow/KanbanBoard'
import { CompletedPage } from '@/features/workflow/CompletedPage'
import { BacklogPage } from '@/features/backlog/BacklogPage'
import { OrderEditor } from '@/features/orders/OrderEditor'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { MessagesPage } from '@/features/messaging/MessagesPage'
import { CustomersListPage } from '@/features/customers/CustomersListPage'
import { CustomerProfilePage } from '@/features/customers/CustomerProfilePage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

/** Single source of route truth. The AppShell layout wraps all authenticated
 * pages; /login sits outside the shell. Auth is dev-bypassed in this build,
 * so there is no hard guard yet — wire one here when production auth lands. */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/workflow" replace /> },
      { path: 'backlog', element: <BacklogPage /> },
      { path: 'workflow', element: <KanbanBoard /> },
      { path: 'workflow/completed', element: <CompletedPage /> },
      { path: 'orders/:id', element: <OrderEditor /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'customers', element: <CustomersListPage /> },
      { path: 'customers/:id', element: <CustomerProfilePage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/workflow" replace /> },
])

import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LedgerPage } from './pages/LedgerPage'
import { PayoutsPage } from './pages/PayoutsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'ledger', element: <LedgerPage /> },
      { path: 'payouts', element: <PayoutsPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App

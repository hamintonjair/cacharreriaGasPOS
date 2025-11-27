import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/Login.jsx'
import POS from './pages/POS.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Reports from './pages/Reports.jsx'
import Layout from './components/Layout.jsx'
import Inventory from './pages/Inventory.jsx'
import Users from './pages/Users.jsx'
import Categories from './pages/Categories.jsx'
import Clients from './pages/Clients.jsx'
import Company from './pages/Company.jsx'
import WashingMachines from './pages/WashingMachines.jsx'
import RentalReport from './pages/RentalReport.jsx'
import AccountsReceivable from './pages/AccountsReceivable.jsx'
import Toasts from './components/Toasts.jsx'

function App() {
  const [auth, setAuth] = useState({ token: null, user: null })

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const user = localStorage.getItem('auth_user')
    if (token) setAuth({ token, user: user ? JSON.parse(user) : null })
  }, [])

  // Hook de vista debe declararse antes de cualquier return condicional
  const [view, setView] = useState('DASHBOARD') // 'POS' | 'DASHBOARD' | 'REPORTS' | 'INVENTORY' | 'USERS'

  const handleLoginSuccess = (data) => {
    setAuth({ token: data.token, user: data.user })
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setAuth({ token: null, user: null })
  }

  if (!auth.token) {
    return <Login onSuccess={handleLoginSuccess} />
  }
  const isAdmin = auth.user?.role === 'ADMIN'

  const renderView = () => {
   // Para usuarios no-admin, permitir POS y CLIENTS
  if (!isAdmin) {
    if (view === 'CLIENTS' && auth.user?.role === 'VENDEDOR') {
      return <Clients />
    }
    return <POS />
  }
  
  // Para otras vistas protegidas, solo ADMIN puede acceder
  
  // Si es ADMIN, renderizar la vista correspondiente
  switch(view) {
    case 'POS':
      return <POS />
    case 'DASHBOARD':
      return <Dashboard />
    case 'REPORTS':
      return <Reports />
    case 'INVENTORY':
      return <Inventory />
    case 'CATEGORIES':
      return <Categories />
    case 'USERS':
      return <Users />
    case 'CLIENTS':
      return <Clients /> // Este caso ahora es accesible para ADMIN y VENDEDOR
    case 'COMPANY':
      return <Company />
    case 'WASHING_MACHINES':
      return <WashingMachines />
    case 'RENTAL_REPORT':  // <-- AGREGAR ESTO
      return <RentalReport />
    case 'ACCOUNTS_RECEIVABLE':
      return <AccountsReceivable />
    default:
      return <POS />
  }
}

  return (
    <Router>
      <>
        <Toasts />
        <Routes>
          <Route path="/login" element={<Login onSuccess={handleLoginSuccess} />} />
          <Route path="/*" element={
            auth.token ? (
              <Layout
                user={auth.user}
                isAdmin={isAdmin}
                view={view}
                setView={setView}
                onLogout={handleLogout}
              >
                {renderView()}
              </Layout>
            ) : (
              <Login onSuccess={handleLoginSuccess} />
            )
          } />
          <Route path="/reports/rentals-history" element={
            auth.token && isAdmin ? (
              <Layout
                user={auth.user}
                isAdmin={isAdmin}
                view="REPORTS"
                setView={setView}
                onLogout={handleLogout}
              >
                <RentalReport />
              </Layout>
            ) : (
              <Login onSuccess={handleLoginSuccess} />
            )
          } />
        </Routes>
      </>
    </Router>
  )
}

export default App

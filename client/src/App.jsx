import React, { useEffect, useState } from 'react'
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
    default:
      return <POS />
  }
}

  return (
    <>
      <Toasts />
      <Layout
        user={auth.user}
        isAdmin={isAdmin}
        view={view}
        setView={setView}
        onLogout={handleLogout}
      >
        {renderView()}
      </Layout>
    </>
  )
}

export default App

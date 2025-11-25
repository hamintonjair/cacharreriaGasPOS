import React, { useEffect, useState, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Company() {
  const token = localStorage.getItem('auth_token')
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [company, setCompany] = useState({
    name: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    logo_url: ''
  })

  // Load company data
  const loadCompany = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/company`, { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error cargando datos de la empresa')
      setCompany(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save company data
  const saveCompany = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const res = await fetch(`${API_URL}/company`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(company)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error guardando datos de la empresa')
      setCompany(data)
      setSuccess('Datos de la empresa actualizados correctamente')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar 2MB')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch(`${API_URL}/company/logo`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error subiendo logo')
      
      setCompany(prev => ({ ...prev, logo_url: data.logo_url }))
      setSuccess('Logo actualizado correctamente')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompany()
  }, [loadCompany])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Datos de la Empresa</h1>
        <p className="text-gray-600 mt-1">Gestiona la información de tu empresa para facturas y reportes</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={saveCompany} className="space-y-6">
        {/* Logo Section */}
        <div className="bg-white p-6 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Logo de la Empresa</h2>
          
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {company.logo_url ? (
                <img 
                  src={`${API_URL.replace('/api', '')}${company.logo_url}`} 
                  alt="Logo de la empresa" 
                  className="w-24 h-24 object-contain border rounded-lg"
                />
              ) : (
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Sin logo</span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cambiar Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={loading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos: JPG, PNG. Máximo 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white p-6 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Información Básica</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={company.name}
                onChange={(e) => setCompany(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={loading}
                className="w-full h-10 border rounded-lg px-3"
                placeholder="Mi Empresa S.A."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RUC/NIT *
              </label>
              <input
                type="text"
                value={company.tax_id}
                onChange={(e) => setCompany(prev => ({ ...prev, tax_id: e.target.value }))}
                required
                disabled={loading}
                className="w-full h-10 border rounded-lg px-3"
                placeholder="1234567890"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección *
            </label>
            <input
              type="text"
              value={company.address}
              onChange={(e) => setCompany(prev => ({ ...prev, address: e.target.value }))}
              required
              disabled={loading}
              className="w-full h-10 border rounded-lg px-3"
              placeholder="Calle Principal #123"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                type="tel"
                value={company.phone}
                onChange={(e) => setCompany(prev => ({ ...prev, phone: e.target.value }))}
                required
                disabled={loading}
                className="w-full h-10 border rounded-lg px-3"
                placeholder="+593 123 456 789"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={company.email}
                onChange={(e) => setCompany(prev => ({ ...prev, email: e.target.value }))}
                disabled={loading}
                className="w-full h-10 border rounded-lg px-3"
                placeholder="empresa@ejemplo.com"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={loadCompany}
            disabled={loading}
            className="h-10 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

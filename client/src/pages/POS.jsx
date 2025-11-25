import React, { useEffect, useMemo, useState } from 'react'
import Invoice from '../components/Invoice.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function POS() {
  const token = localStorage.getItem('auth_token')
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }), [token])

  const [activeTab, setActiveTab] = useState('CACHARRERIA') // or 'GAS'
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Paginación
  const [productsPage, setProductsPage] = useState(1)
  const [gasPage, setGasPage] = useState(1)
  const itemsPerPage = 20

  const [products, setProducts] = useState([])
  const [gasTypes, setGasTypes] = useState([])
  const [clients, setClients] = useState([])

  const [cart, setCart] = useState([]) // { key, type: 'product'|'gas', id, nombre, precio, cantidad, recibio_envase?, precio_base?, precio_envase? }
  const [selectedClient, setSelectedClient] = useState(null) // { id, nombre, identificacion }

  // Modals state
  const [gasModal, setGasModal] = useState({ open: false, item: null })
  const [payModal, setPayModal] = useState({ open: false, method: null })
  const [paying, setPaying] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  
  // Invoice state
  const [showInvoice, setShowInvoice] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [company, setCompany] = useState(null)

  // Print invoice function
  const handlePrintInvoice = () => {
    // Close modal immediately
    setShowInvoice(false)
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    
    if (!printWindow) {
      toast('No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes.', 'error')
      return
    }
    
    // Generate the HTML content for the invoice
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura #${lastSale.id}</title>
          <style>
            @page {
              margin: 20px;
              size: auto;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              margin: 0;
              padding: 20px;
              line-height: 1.4;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }
            .company-info {
              flex: 1;
            }
            .company-info h1 {
              margin: 0 0 10px 0;
              font-size: 18px;
            }
            .company-info .details {
              font-size: 11px;
              color: #666;
              line-height: 1.2;
            }
            .invoice-number {
              text-align: right;
            }
            .invoice-number h2 {
              margin: 0;
              font-size: 16px;
            }
            .invoice-number .number {
              font-size: 12px;
              color: #666;
            }
            .sale-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 20px;
              font-size: 11px;
            }
            .sale-info div {
              margin-bottom: 5px;
            }
            .sale-info .label {
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 10px;
            }
            th, td {
              padding: 5px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              font-weight: bold;
              background-color: #f5f5f5;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .totals {
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-bottom: 20px;
            }
            .totals .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 12px;
            }
            .totals .total-row.grand-total {
              font-weight: bold;
              font-size: 14px;
            }
            .totals .total-row.change {
              color: #28a745;
            }
            .footer {
              text-align: center;
              font-size: 10px;
              color: #666;
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              ${company.logo_url ? `<img src="http://localhost:5000${company.logo_url}" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
              <h1>${company.name}</h1>
              <div class="details">
                <div>RUC/NIT: ${company.tax_id}</div>
                <div>${company.address}</div>
                <div>Tel: ${company.phone}</div>
                ${company.email ? `<div>Email: ${company.email}</div>` : ''}
              </div>
            </div>
            <div class="invoice-number">
              <h2>FACTURA</h2>
              <div class="number">No. #${String(lastSale.id).padStart(6, '0')}</div>
            </div>
          </div>
          
          <div class="sale-info">
            <div>
              <div class="label">Fecha:</div>
              <div>${new Date(lastSale.fecha).toLocaleString('es-EC')}</div>
            </div>
            <div>
              <div class="label">Método de Pago:</div>
              <div>${lastSale.metodo_pago}</div>
            </div>
            ${selectedClient ? `
              <div>
                <div class="label">Cliente:</div>
                <div>${selectedClient.nombre}</div>
                ${selectedClient.identificacion ? `<div style="font-size: 10px; color: #666;">CI/RUC: ${selectedClient.identificacion}</div>` : ''}
              </div>
            ` : ''}
            <div>
              <div class="label">Vendedor:</div>
              <div>${lastSale.user?.nombre || 'N/A'}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-center">Cant.</th>
                <th class="text-right">P. Unit.</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${lastSale.items?.map(item => `
                <tr>
                  <td>
                    <div>${item.product?.nombre || item.gasType?.nombre}</div>
                    ${item.gasType ? `<div style="font-size: 9px; color: #666;">${item.recibio_envase ? 'Con intercambio' : 'Sin intercambio'}</div>` : ''}
                  </td>
                  <td class="text-center">${item.cantidad}</td>
                  <td class="text-right">$${Number(item.precio_unit).toLocaleString('es-EC')}</td>
                  <td class="text-right font-bold">$${Number(item.subtotal).toLocaleString('es-EC')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>$${Number(lastSale.total).toLocaleString('es-EC')}</span>
            </div>
            
            ${lastSale.metodo_pago === 'Efectivo' && lastSale.amountReceived ? `
              <div class="total-row">
                <span>Paga con:</span>
                <span>$${Number(lastSale.amountReceived).toLocaleString('es-EC')}</span>
              </div>
              <div class="total-row change">
                <span>Cambio:</span>
                <span>$${Number(lastSale.amountReceived - lastSale.total).toLocaleString('es-EC')}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <div>¡Gracias por su compra!</div>
            <div style="margin-top: 5px;">Este documento no tiene validez fiscal</div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
                // Fallback for browsers that don't support onafterprint
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            };
          </script>
        </body>
      </html>
    `
    
    // Write the HTML to the new window
    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
  }

  // Toast helper
  const toast = (message, type = 'info', duration = 3000) => {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type, duration } }))
  }

  // Fetch helpers
  const fetchProducts = async () => {
    setLoading(true); setError('')
    try {
      let url, data
      if (query) {
        // Si hay query, usar el endpoint de búsqueda
        url = `${API_URL}/products/search?q=${encodeURIComponent(query)}`
        const res = await fetch(url, { headers: authHeaders })
        data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Error buscando productos')
      } else {
        // Si no hay query, cargar todos los productos
        url = `${API_URL}/products`
        const res = await fetch(url, { headers: authHeaders })
        data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Error cargando productos')
      }
      setProducts(data)
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const fetchGasTypes = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/gastypes`, { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error cargando gas')
      setGasTypes(data)
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`, { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error cargando clientes')
      setClients(data)
      // Set default client (Cliente Genérico)
      const defaultClient = data.find(c => c.id === 1)
      if (defaultClient) {
        setSelectedClient(defaultClient)
      }
    } catch (e) {
      console.error('Error loading clients:', e)
    }
  }

  const fetchCompany = async () => {
    try {
      const res = await fetch(`${API_URL}/company`, { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error cargando datos de la empresa')
      setCompany(data)
    } catch (e) {
      console.error('Error loading company:', e)
    }
  }

  // Reset page when changing tab
  useEffect(() => {
    setProductsPage(1)
    setGasPage(1)
  }, [activeTab])

  // Reset page when searching
  useEffect(() => {
    setProductsPage(1)
  }, [query])

  // Reset amount received when modal closes
  useEffect(() => {
    if (!payModal.open) {
      setAmountReceived('')
    }
  }, [payModal.open])

  // Initial loads
  useEffect(() => {
    if (activeTab === 'CACHARRERIA') fetchProducts()
    if (activeTab === 'GAS') fetchGasTypes()
    fetchClients() // Load clients on component mount
    fetchCompany() // Load company data on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Search handler for products
  useEffect(() => {
    const id = setTimeout(() => {
      if (activeTab === 'CACHARRERIA') fetchProducts()
    }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTab])

  // Cart helpers
  const addToCart = (item) => {
    const key = `${item.type}-${item.id}`
    if (item.type === 'gas') {
      // Abrir modal de gas para definir intercambio/depósito
      const gasInfo = gasTypes.find((g) => g.id === item.id)
      setGasModal({
        open: true,
        item: {
          ...item,
          key,
          cantidad: 1,
          precio_base: item.precio,
          precio_envase: gasInfo?.precio_envase ?? 0,
          recibio_envase: true, // default
        },
      })
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) return prev.map((i) => i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { ...item, key, cantidad: 1 }]
    })
  }

  const inc = (key) => setCart((prev) => prev.map((i) => i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i))
  const dec = (key) => setCart((prev) => prev
    .map((i) => i.key === key ? { ...i, cantidad: Math.max(0, i.cantidad - 1) } : i)
    .filter((i) => i.cantidad > 0)
  )
  const removeItem = (key) => setCart((prev) => prev.filter((i) => i.key !== key))

  const total = cart.reduce((sum, i) => sum + Number(i.precio) * i.cantidad, 0)
  
  // Calcular cambio
  const change = Number(amountReceived) - total
  const canConfirmPayment = payModal.method === 'Efectivo' ? Number(amountReceived) >= total : true

  // Persist cart in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pos_cart')
      if (stored) setCart(JSON.parse(stored))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('pos_cart', JSON.stringify(cart))
    } catch {}
  }, [cart])

  const clearCart = () => setCart([])

  // Pagination calculations
  const productsTotalPages = Math.max(1, Math.ceil(products.length / itemsPerPage))
  const productsPageItems = products.slice(
    (productsPage - 1) * itemsPerPage,
    productsPage * itemsPerPage
  )

  const gasTotalPages = Math.max(1, Math.ceil(gasTypes.length / itemsPerPage))
  const gasPageItems = gasTypes.slice(
    (gasPage - 1) * itemsPerPage,
    gasPage * itemsPerPage
  )

  // Submit sale
  const submitSale = async (metodo) => {
    if (!cart.length) { setPayModal({ open: false }); return }
    try {
      setPaying(true)
      const data = await submitSaleWithApi({ cart, authHeaders, metodo_pago: metodo, selectedClient })
      
      // Add amount received for cash payments
      if (metodo === 'Efectivo' && amountReceived) {
        data.amountReceived = Number(amountReceived)
      }
      
      clearCart()
      setPayModal({ open: false })
      setAmountReceived('')
      
      // Show invoice
      setLastSale(data)
      setShowInvoice(true)
      
      toast(`Venta realizada (#${data.id || ''})`, 'success', 4000)
    } catch (e) {
      toast(e.message, 'error', 4000)
    } finally {
      setPaying(false)
    }
  }

  // UI building blocks
  const CatalogHeader = (
    <div className="p-3 sm:p-4 border-b bg-white">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar o escanear código de barras"
          className="flex-1 border rounded-lg px-4 h-12 text-lg"
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab('CACHARRERIA')}
          className={`h-12 rounded-lg font-semibold ${activeTab === 'CACHARRERIA' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >CACHARRERÍA</button>
        <button
          onClick={() => setActiveTab('GAS')}
          className={`h-12 rounded-lg font-semibold ${activeTab === 'GAS' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >GAS</button>
      </div>
    </div>
  )

  const CatalogBody = (
    <div className="p-3 sm:p-4 overflow-auto">
      {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
      {activeTab === 'CACHARRERIA' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {productsPageItems.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart({ type: 'product', id: p.id, nombre: p.nombre, precio: p.precio_venta })}
                className="border rounded-xl p-3 text-left bg-white hover:bg-gray-50 active:scale-95 transition shadow-sm"
              >
                <div className="font-semibold text-base sm:text-lg">{p.nombre}</div>
                <div className="mt-1 text-blue-600 font-bold text-lg sm:text-xl">${Number(p.precio_venta).toLocaleString()}</div>
                <div className="mt-1 text-xs text-gray-500">Stock: {p.stock}</div>
              </button>
            ))}
          </div>
          
          {/* Paginación de productos */}
          {productsTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {(productsPage - 1) * itemsPerPage + 1} a {Math.min(productsPage * itemsPerPage, products.length)} de {products.length} productos
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                  disabled={productsPage === 1}
                  className="h-8 px-3 border rounded text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setProductsPage(p => Math.min(productsTotalPages, p + 1))}
                  disabled={productsPage === productsTotalPages}
                  className="h-8 px-3 border rounded text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'GAS' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {gasPageItems.map((g) => (
              <button
                key={g.id}
                onClick={() => addToCart({ type: 'gas', id: g.id, nombre: g.nombre, precio: g.precio_venta })}
                className="border rounded-xl p-3 text-left bg-white hover:bg-gray-50 active:scale-95 transition shadow-sm"
              >
                <div className="font-semibold text-base sm:text-lg">{g.nombre}</div>
                <div className="mt-1 text-blue-600 font-bold text-lg sm:text-xl">${Number(g.precio_venta).toLocaleString()}</div>
                <div className="mt-1 text-xs text-gray-500">Llenos: {g.stock_llenos} · Vacíos: {g.stock_vacios}</div>
              </button>
            ))}
          </div>
          
          {/* Paginación de gas */}
          {gasTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {(gasPage - 1) * itemsPerPage + 1} a {Math.min(gasPage * itemsPerPage, gasTypes.length)} de {gasTypes.length} tipos de gas
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setGasPage(p => Math.max(1, p - 1))}
                  disabled={gasPage === 1}
                  className="h-8 px-3 border rounded text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setGasPage(p => Math.min(gasTotalPages, p + 1))}
                  disabled={gasPage === gasTotalPages}
                  className="h-8 px-3 border rounded text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {loading && <div className="mt-3 text-sm text-gray-500">Cargando…</div>}
    </div>
  )

  const CartPanel = (
    <div className="h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b bg-white">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">Carrito</h2>
          <button onClick={clearCart} className="h-10 px-4 rounded-lg bg-red-50 text-red-700 font-semibold">Limpiar Carrito</button>
        </div>
        {/* Client Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Cliente:</label>
          <select
            value={selectedClient?.id || ''}
            onChange={(e) => {
              const client = clients.find(c => c.id === Number(e.target.value))
              setSelectedClient(client || null)
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar cliente...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.nombre} {client.identificacion ? `(${client.identificacion})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
        {cart.length === 0 && (
          <div className="text-sm text-gray-500">No hay ítems. Toca productos o gas para agregarlos.</div>
        )}
        {cart.map((i) => (
          <div key={i.key} className="border rounded-xl p-3 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{i.nombre}</div>
                <div className="text-sm text-gray-500">${Number(i.precio).toLocaleString()} · {i.type === 'gas' ? 'Gas' : 'Producto'}</div>
                {i.type === 'gas' && (
                  <div className="text-xs text-gray-500">{i.recibio_envase ? 'Con intercambio (sin depósito)' : 'Sin intercambio (incluye depósito)'}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {i.type === 'gas' && (
                  <button onClick={() => setGasModal({ open: true, item: i })} className="text-blue-600 text-sm">Editar</button>
                )}
                <button onClick={() => removeItem(i.key)} className="text-red-600 text-sm">Quitar</button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={() => dec(i.key)} className="h-12 w-12 rounded-full bg-gray-100 text-2xl font-bold">-</button>
              <div className="min-w-[3rem] text-center text-xl font-semibold">{i.cantidad}</div>
              <button onClick={() => inc(i.key)} className="h-12 w-12 rounded-full bg-gray-100 text-2xl font-bold">+</button>
              <div className="ml-auto text-lg font-bold">${(Number(i.precio) * i.cantidad).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t bg-white p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="text-base text-gray-600">TOTAL</div>
          <div className="text-2xl font-extrabold text-gray-900">${total.toLocaleString()}</div>
        </div>
        <button
          className="mt-3 w-full h-14 rounded-xl bg-green-600 text-white text-lg font-bold hover:bg-green-700 active:scale-[.99]"
          onClick={() => setPayModal({ open: true, method: null })}
        >
          PROCESAR PAGO
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-0">
        {/* Left 70% */}
        <div className="lg:col-span-7 border-r bg-gray-25 min-h-[50vh]">
          {CatalogHeader}
          {CatalogBody}
        </div>
        {/* Right 30% */}
        <div className="lg:col-span-3 min-h-[50vh]">
          {CartPanel}
        </div>
      </div>

      {/* Gas Modal */}
      {gasModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">{gasModal.item?.nombre}</h3>
              <p className="text-sm text-gray-500 mt-1">¿El cliente entrega cilindro vacío (Intercambio)?</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                className="w-full h-14 rounded-xl bg-blue-600 text-white text-lg font-bold"
                onClick={() => {
                  const it = gasModal.item
                  const updated = { ...it, recibio_envase: true, precio: it.precio_base }
                  setCart((prev) => {
                    const exists = prev.find((p) => p.key === it.key)
                    if (exists) return prev.map((p) => p.key === it.key ? { ...p, ...updated } : p)
                    return [...prev, updated]
                  })
                  setGasModal({ open: false, item: null })
                }}
              >
                SÍ (Intercambio)
              </button>
              <button
                className="w-full h-14 rounded-xl bg-amber-500 text-white text-lg font-bold"
                onClick={() => {
                  const it = gasModal.item
                  const precio = Number(it.precio_base) + Number(it.precio_envase || 0)
                  const updated = { ...it, recibio_envase: false, precio }
                  setCart((prev) => {
                    const exists = prev.find((p) => p.key === it.key)
                    if (exists) return prev.map((p) => p.key === it.key ? { ...p, ...updated } : p)
                    return [...prev, updated]
                  })
                  setGasModal({ open: false, item: null })
                }}
              >
                NO (Cobrar Depósito)
              </button>
              <button
                className="w-full h-12 rounded-xl bg-gray-100 text-gray-700"
                onClick={() => setGasModal({ open: false, item: null })}
              >
                Cancelar
              </button>
              <div className="text-xs text-gray-500">Depósito (envase): ${Number(gasModal.item?.precio_envase || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Payment Modal */}
      {payModal.open && payModal.method === 'Efectivo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">Pago en Efectivo</h3>
              <p className="text-sm text-gray-500 mt-1">Total: ${total.toLocaleString()}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paga con:
                </label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-12 border rounded-lg px-4 text-lg font-semibold"
                  autoFocus
                />
              </div>
              
              {amountReceived && Number(amountReceived) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">Cambio:</span>
                    <span className="text-lg font-bold text-green-700">
                      ${change >= 0 ? change.toLocaleString() : '0.00'}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="h-12 rounded-xl bg-gray-100 text-gray-700 font-semibold"
                  onClick={() => {
                    setPayModal({ open: false, method: null })
                    setAmountReceived('')
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="h-12 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
                  disabled={!canConfirmPayment || paying}
                  onClick={async () => {
                    await submitSale('Efectivo')
                    setAmountReceived('')
                  }}
                >
                  {paying ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal.open && payModal.method !== 'Efectivo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">Confirmar Pago</h3>
              <p className="text-sm text-gray-500 mt-1">Total: ${total.toLocaleString()}</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="h-14 rounded-xl bg-green-600 text-white text-lg font-bold"
                  disabled={paying}
                  onClick={() => setPayModal({ open: true, method: 'Efectivo' })}
                >Efectivo</button>
                <button
                  className="h-14 rounded-xl bg-blue-600 text-white text-lg font-bold"
                  disabled={paying}
                  onClick={async () => {
                    await submitSale('Transferencia')
                  }}
                >Transferencia</button>
              </div>
              <button
                className="w-full h-12 rounded-xl bg-gray-100 text-gray-700"
                disabled={paying}
                onClick={() => setPayModal({ open: false })}
              >Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && lastSale && company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">Factura de Venta</h3>
              <button
                onClick={() => setShowInvoice(false)}
                className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              <Invoice 
                sale={lastSale} 
                company={company} 
                client={selectedClient}
                showPrint={true}
              />
            </div>
            
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-center gap-3">
              <button
                onClick={() => setShowInvoice(false)}
                className="h-10 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              <button
                onClick={handlePrintInvoice}
                className="h-10 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                🖨️ Imprimir y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

async function submitSaleWithApi({ cart, authHeaders, metodo_pago, selectedClient }) {
  const userStr = localStorage.getItem('auth_user')
  const user = userStr ? JSON.parse(userStr) : null
  if (!user?.id) throw new Error('Usuario no autenticado')

  const items = cart.map((i) => ({
    ...(i.type === 'product' ? { productId: i.id } : {}),
    ...(i.type === 'gas' ? { gasTypeId: i.id, recibio_envase: Boolean(i.recibio_envase) } : {}),
    cantidad: i.cantidad,
    precio_unit: i.precio,
  }))

  const body = { 
    userId: user.id, 
    clientId: selectedClient?.id || 1, // Default to client 1 if no client selected
    metodo_pago, 
    items 
  }

  const res = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Error procesando venta')
  return data
}

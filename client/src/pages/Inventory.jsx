import React, { useEffect, useMemo, useState } from 'react'
import ModalConfirmacion from '../components/ModalConfirmación'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export default function Inventory() {
  const token = localStorage.getItem('auth_token')
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }), [token])

  const [activeTab, setActiveTab] = useState('PRODUCTS') // 'PRODUCTS' | 'GAS'

  const [products, setProducts] = useState([])
  const [productsTotal, setProductsTotal] = useState(0)
  const [gasTypes, setGasTypes] = useState([])
  const [gasTotal, setGasTotal] = useState(0)
  const [categories, setCategories] = useState([])
  const categoriesMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Search/Sort/Pagination state
  const [pQuery, setPQuery] = useState('')
  const [pSort, setPSort] = useState({ key: 'nombre', dir: 'asc' })
  const [pPage, setPPage] = useState(1)
  const pPageSize = 10
  const [pCategoryFilter, setPCategoryFilter] = useState('all')

  const [gQuery, setGQuery] = useState('')
  const [gSort, setGSort] = useState({ key: 'nombre', dir: 'asc' })
  const [gPage, setGPage] = useState(1)
  const gPageSize = 10

// Modals
const [productModal, setProductModal] = useState({ open: false, mode: 'create', record: null })
const [gasModal, setGasModal] = useState({ open: false, mode: 'create', record: null })

// Después de los modales existentes, agrega:
const [showDeleteProductModal, setShowDeleteProductModal] = useState(false)
const [productToDelete, setProductToDelete] = useState(null)

const [showDeleteGasModal, setShowDeleteGasModal] = useState(false)
const [gasToDelete, setGasToDelete] = useState(null)

  // Product form
  const [pForm, setPForm] = useState({ nombre: '', codigo_barras: '', categoryId: '', precio_venta: '', costo: '', taxRate: '', stock: 0, stock_minimo: 5 })
  // Gas form
  const [gForm, setGForm] = useState({ nombre: '', precio_venta: '', precio_envase: '', stock_llenos: 0, stock_vacios: 0 })

  // Toast helper
  const toast = (message, type = 'info', duration = 3000) => {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type, duration } }))
  }

  const fetchJson = async (url) => {
    const res = await fetch(url, { headers })
    const ct = res.headers.get('content-type') || ''
    let data
    try {
      data = ct.includes('application/json') ? await res.json() : await res.text()
    } catch (_) {
      data = await res.text()
    }
    if (!res.ok) {
      const msg = typeof data === 'string' ? data : (data?.error || 'Error de servidor')
      throw new Error(msg)
    }
    return data
  }

  const loadProducts = async () => {
    const qs = new URLSearchParams({
      page: String(pPage),
      pageSize: String(pPageSize),
      q: pQuery,
      orderBy: pSort.key,
      orderDir: pSort.dir,
      categoryId: pCategoryFilter,
    })
    const data = await fetchJson(`${API_URL}/products?${qs.toString()}`)
    if (Array.isArray(data)) {
      setProducts(data); setProductsTotal(data.length)
    } else {
      setProducts(data.items || []); setProductsTotal(Number(data.total || 0))
    }
  }

  const loadGas = async () => {
    const qs = new URLSearchParams({
      page: String(gPage),
      pageSize: String(gPageSize),
      q: gQuery,
      orderBy: gSort.key,
      orderDir: gSort.dir,
    })
    const data = await fetchJson(`${API_URL}/gastypes?${qs.toString()}`)
    if (Array.isArray(data)) {
      setGasTypes(data); setGasTotal(data.length)
    } else {
      setGasTypes(data.items || []); setGasTotal(Number(data.total || 0))
    }
  }

  const loadCategories = async () => {
    const data = await fetchJson(`${API_URL}/categories`)
    setCategories(Array.isArray(data) ? data : (data.items || []))
  }

  const loadData = async () => {
    setLoading(true); setError('')
    try {
      await Promise.all([loadProducts(), loadGas(), loadCategories()])
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadProducts() }, [pPage, pPageSize, pQuery, pSort, pCategoryFilter])
  useEffect(() => { loadGas() }, [gPage, gPageSize, gQuery, gSort])

  // Helpers for sorting
  const sortBy = (list, { key, dir }) => {
    const sorted = [...list].sort((a,b) => {
      const va = (a[key] ?? '').toString().toLowerCase()
      const vb = (b[key] ?? '').toString().toLowerCase()
      if (va < vb) return -1
      if (va > vb) return 1
      return 0
    })
    return dir === 'asc' ? sorted : sorted.reverse()
  }

  // Filter + sort + paginate Products
  const pTotalPages = Math.max(1, Math.ceil(productsTotal / pPageSize))
  const pPageItems = products

  // Filter + sort + paginate Gas
  const gTotalPages = Math.max(1, Math.ceil(gasTotal / gPageSize))
  const gPageItems = gasTypes

  const handleCreateProduct = async () => {
    try {
      if (!pForm.nombre || pForm.precio_venta === '' || pForm.costo === '') throw new Error('Completa nombre, precio y costo')
      
      // Convertir IVA de porcentaje a decimal antes de enviar
      // Manejar valores vacíos, null, undefined y convertir a string decimal válido
      let taxRateDecimal = '0'
      if (pForm.taxRate !== null && pForm.taxRate !== undefined && pForm.taxRate !== '') {
        const taxRateNum = Number(pForm.taxRate)
        if (!isNaN(taxRateNum) && taxRateNum >= 0) {
          // Convertir de porcentaje (ej: 19) a decimal (ej: 0.19)
          taxRateDecimal = (taxRateNum / 100).toFixed(4)
        }
      }
      
      const body = { 
        ...pForm, 
        taxRate: taxRateDecimal, // Enviar como string decimal (ej: "0.19")
        categoryId: pForm.categoryId ? Number(pForm.categoryId) : undefined 
      }
      
      const res = await fetch(`${API_URL}/products`, { method: 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error creando producto')
      setProductModal({ open: false, mode: 'create', record: null })
      setPForm({ nombre: '', codigo_barras: '', categoryId: '', precio_venta: '', costo: '', taxRate: '', stock: 0, stock_minimo: 5 })
      await loadData()
      toast('Producto creado', 'success')
    } catch (e) {
      toast(e.message || 'Error creando producto', 'error')
    }
  }

  const handleUpdateProduct = async () => {
    try {
      if (!productModal.record) return
      if (!pForm.nombre || pForm.precio_venta === '' || pForm.costo === '') throw new Error('Completa nombre, precio y costo')
      const id = productModal.record.id
      
      // Convertir IVA de porcentaje a decimal antes de enviar
      // Manejar valores vacíos, null, undefined y convertir a string decimal válido
      let taxRateDecimal = '0'
      if (pForm.taxRate !== null && pForm.taxRate !== undefined && pForm.taxRate !== '') {
        const taxRateNum = Number(pForm.taxRate)
        if (!isNaN(taxRateNum) && taxRateNum >= 0) {
          // Convertir de porcentaje (ej: 19) a decimal (ej: 0.19)
          taxRateDecimal = (taxRateNum / 100).toFixed(4)
        }
      }
      
      const body = { 
        ...pForm, 
        taxRate: taxRateDecimal, // Enviar como string decimal (ej: "0.19")
        categoryId: pForm.categoryId ? Number(pForm.categoryId) : undefined 
      }
      
      const res = await fetch(`${API_URL}/products/${id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error actualizando producto')
      setProductModal({ open: false, mode: 'edit', record: null })
      await loadData()
      toast('Producto actualizado', 'success')
    } catch (e) {
      toast(e.message || 'Error actualizando producto', 'error')
    }
  }

// DESPUÉS:
const handleDeleteProduct = async (record) => {
  try {
    if (!record) return
    // Eliminar el confirm() antiguo
    setProductToDelete(record)
    setShowDeleteProductModal(true)
  } catch (e) {
    toast(e.message || 'Error eliminando producto', 'error')
  }
}

// AGREGAR esta nueva función:
const confirmDeleteProduct = async () => {
  try {
    if (!productToDelete) return
    const res = await fetch(`${API_URL}/products/${productToDelete.id}`, { 
      method: 'DELETE', 
      headers 
    })
    const data = await res.json()
    
    if (!res.ok) {
      // Mostrará el error específico del backend
      throw new Error(data.error || 'Error eliminando producto')
    }
    
    await loadData()
    toast('Producto eliminado', 'success')
    setShowDeleteProductModal(false)
    setProductToDelete(null)
  } catch (e) {
    // El toast mostrará el mensaje amigable del backend
    toast(e.message || 'Error eliminando producto', 'error')
  }
}

  const handleCreateGas = async () => {
    try {
      if (!gForm.nombre || gForm.precio_venta === '' || gForm.precio_envase === '') throw new Error('Completa tipo, precio y precio de envase')
      const res = await fetch(`${API_URL}/gastypes`, { method: 'POST', headers, body: JSON.stringify(gForm) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error creando tipo de gas')
      setGasModal({ open: false, mode: 'create', record: null })
      setGForm({ nombre: '', precio_venta: '', precio_envase: '', stock_llenos: 0, stock_vacios: 0 })
      await loadData()
      toast('Tipo de gas creado', 'success')
    } catch (e) {
      toast(e.message || 'Error creando tipo de gas', 'error')
    }
  }

  const handleUpdateGas = async () => {
    try {
      if (!gasModal.record) return
      if (!gForm.nombre || gForm.precio_venta === '' || gForm.precio_envase === '') throw new Error('Completa tipo, precio y precio de envase')
      const id = gasModal.record.id
      const res = await fetch(`${API_URL}/gastypes/${id}`, { method: 'PUT', headers, body: JSON.stringify(gForm) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error actualizando tipo de gas')
      setGasModal({ open: false, mode: 'edit', record: null })
      await loadData()
      toast('Tipo de gas actualizado', 'success')
    } catch (e) {
      toast(e.message || 'Error actualizando tipo de gas', 'error')
    }
  }

  // DESPUÉS:
const handleDeleteGas = async (record) => {
  try {
    if (!record) return
    // Eliminar el confirm() antiguo
    setGasToDelete(record)
    setShowDeleteGasModal(true)
  } catch (e) {
    toast(e.message || 'Error eliminando tipo de gas', 'error')
  }
}

// AGREGAR esta nueva función:
const confirmDeleteGas = async () => {
  try {
    if (!gasToDelete) return
    const res = await fetch(`${API_URL}/gastypes/${gasToDelete.id}`, { 
      method: 'DELETE', 
      headers 
    })
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || 'Error eliminando tipo de gas')
    }
    
    await loadData()
    toast('Tipo de gas eliminado', 'success')
    setShowDeleteGasModal(false)
    setGasToDelete(null)
  } catch (e) {
    toast(e.message || 'Error eliminando tipo de gas', 'error')
  }
}

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`h-12 px-4 rounded-lg font-semibold ${activeTab==='PRODUCTS' ? 'bg-gray-900 text-white' : 'bg-white border'}`}
          onClick={()=>setActiveTab('PRODUCTS')}
        >Gestionar Productos</button>
        <button
          className={`h-12 px-4 rounded-lg font-semibold ${activeTab==='GAS' ? 'bg-gray-900 text-white' : 'bg-white border'}`}
          onClick={()=>setActiveTab('GAS')}
        >Gestionar Gas</button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Productos */}
      {activeTab === 'PRODUCTS' && (
        <section className="relative p-4 border rounded-xl bg-white">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Productos de Cacharrería</h2>
            
            {/* Filtros y búsqueda - Responsive */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={pCategoryFilter} 
                onChange={(e)=>{setPCategoryFilter(e.target.value); setPPage(1)}} 
                className="h-10 border rounded-lg px-2 w-full sm:w-auto"
              >
                <option value="all">Todas</option>
                {categories.map(c => (<option key={c.id} value={String(c.id)}>{c.nombre}</option>))}
              </select>
              <div className="flex gap-2 flex-1">
                <input 
                  value={pQuery} 
                  onChange={(e)=>{setPQuery(e.target.value); setPPage(1)}} 
                  placeholder="Buscar..." 
                  className="h-10 border rounded-lg px-3 flex-1 min-w-0"
                />
                <button
                  className="h-10 px-4 rounded-lg bg-emerald-600 text-white font-semibold whitespace-nowrap"
                  onClick={()=>setProductModal({open:true,mode:'create'})}
                >Nuevo</button>
              </div>
            </div>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left border">Nombre</th>
                  <th className="p-2 text-left border">Código Barras</th>
                  <th className="p-2 text-left border">Categoría</th>
                  <th className="p-2 text-right border">Precio Venta</th>
                  <th className="p-2 text-right border">Costo</th>
                  <th className="p-2 text-right border">IVA</th>
                  <th className="p-2 text-right border">Stock</th>
                  <th className="p-2 text-right border">Stock Mínimo</th>
                  <th className="p-2 text-center border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pPageItems.map(p => (
                  <tr key={p.id}>
                    <td className="p-2 border">{p.nombre}</td>
                    <td className="p-2 border">{p.codigo_barras || '-'}</td>
                    <td className="p-2 border">{categoriesMap[p.categoryId]?.nombre || '-'}</td>
                    <td className="p-2 border text-right">${Number(p.precio_venta).toLocaleString()}</td>
                    <td className="p-2 border text-right">${Number(p.costo).toLocaleString()}</td>
                    <td className="p-2 border text-right">{p.taxRate ? `${(Number(p.taxRate) * 100).toFixed(1)}%` : '0%'}</td>
                    <td className="p-2 border text-right">{p.stock}</td>
                    <td className="p-2 border text-right">{p.stock_minimo}</td>
                    <td className="p-2 border text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="h-9 px-3 rounded bg-indigo-600 text-white"
                          onClick={()=>{ setProductModal({open:true,mode:'edit',record:p}); setPForm({ nombre:p.nombre, codigo_barras:p.codigo_barras||'', categoryId:String(p.categoryId||''), precio_venta:p.precio_venta, costo:p.costo, taxRate: p.taxRate ? (Number(p.taxRate) * 100).toString() : '', stock:p.stock, stock_minimo:p.stock_minimo }) }}
                        >📝 </button>
                        <button
                          className="h-9 px-3 rounded bg-red-600 text-white"
                          onClick={()=>handleDeleteProduct(p)}
                        >🗑️ </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-500">Página {pPage} de {pTotalPages} — {productsTotal} elementos</div>
            <div className="flex gap-2">
              <button disabled={pPage===1} onClick={()=>setPPage(p=>Math.max(1,p-1))} className="h-9 px-3 border rounded disabled:opacity-50">Anterior</button>
              <button disabled={pPage===pTotalPages} onClick={()=>setPPage(p=>Math.min(pTotalPages,p+1))} className="h-9 px-3 border rounded disabled:opacity-50">Siguiente</button>
            </div>
          </div>
          

          {/* Modal Añadir Producto */}
          {(productModal.open && productModal.mode==='create') && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-4">
                <div className="text-lg font-bold mb-3">Añadir Producto</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="h-10 border rounded px-3" placeholder="Nombre" value={pForm.nombre} onChange={e=>setPForm({...pForm, nombre:e.target.value})}/>
                  <input className="h-10 border rounded px-3" placeholder="Código Barras" value={pForm.codigo_barras} onChange={e=>setPForm({...pForm, codigo_barras:e.target.value})}/>
                  <select className="h-10 border rounded px-3" value={pForm.categoryId} onChange={e=>setPForm({...pForm, categoryId:e.target.value})}>
                    <option value="">Selecciona categoría</option>
                    {categories.map(c => (<option key={c.id} value={String(c.id)}>{c.nombre}</option>))}
                  </select>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Precio Venta" value={pForm.precio_venta} onChange={e=>setPForm({...pForm, precio_venta:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Costo" value={pForm.costo} onChange={e=>setPForm({...pForm, costo:e.target.value})}/>
                  <input type="number" step="0.1" min="0" max="100" className="h-10 border rounded px-3" placeholder="IVA (%)" value={pForm.taxRate} onChange={e=>setPForm({...pForm, taxRate:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Stock" value={pForm.stock} onChange={e=>setPForm({...pForm, stock:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Stock Mínimo" value={pForm.stock_minimo} onChange={e=>setPForm({...pForm, stock_minimo:e.target.value})}/>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="h-10 px-4 rounded bg-gray-100" onClick={()=>{
                  setProductModal({open:false,mode:'create'});
                  setPForm({ nombre: '', codigo_barras: '', categoryId: '', precio_venta: '', costo: '', taxRate: '', stock: 0, stock_minimo: 5 });
                }}>Cancelar</button>
                  <button className="h-10 px-4 rounded bg-gray-900 text-white" onClick={handleCreateProduct}>Guardar</button>
                </div>
              </div>
            </div>
          )}
          {(productModal.open && productModal.mode==='edit') && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-4">
                <div className="text-lg font-bold mb-3">Editar Producto</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="h-10 border rounded px-3" placeholder="Nombre" value={pForm.nombre} onChange={e=>setPForm({...pForm, nombre:e.target.value})}/>
                  <input className="h-10 border rounded px-3" placeholder="Código Barras" value={pForm.codigo_barras} onChange={e=>setPForm({...pForm, codigo_barras:e.target.value})}/>
                  <select className="h-10 border rounded px-3" value={pForm.categoryId} onChange={e=>setPForm({...pForm, categoryId:e.target.value})}>
                    <option value="">Selecciona categoría</option>
                    {categories.map(c => (<option key={c.id} value={String(c.id)}>{c.nombre}</option>))}
                  </select>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Precio Venta" value={pForm.precio_venta} onChange={e=>setPForm({...pForm, precio_venta:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Costo" value={pForm.costo} onChange={e=>setPForm({...pForm, costo:e.target.value})}/>
                  <input type="number" step="0.1" min="0" max="100" className="h-10 border rounded px-3" placeholder="IVA (%)" value={pForm.taxRate} onChange={e=>setPForm({...pForm, taxRate:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Stock" value={pForm.stock} onChange={e=>setPForm({...pForm, stock:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Stock Mínimo" value={pForm.stock_minimo} onChange={e=>setPForm({...pForm, stock_minimo:e.target.value})}/>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="h-10 px-4 rounded bg-gray-100" onClick={()=>{
                  setProductModal({open:false,mode:'edit',record:null});
                  setPForm({ nombre: '', codigo_barras: '', categoryId: '', precio_venta: '', costo: '', taxRate: '', stock: 0, stock_minimo: 5 });
                }}>Cancelar</button>
                  <button className="h-10 px-4 rounded bg-gray-900 text-white" onClick={handleUpdateProduct}>Guardar</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Gas */}
      {activeTab === 'GAS' && (
        <section className="relative p-4 border rounded-xl bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <h2 className="text-lg font-semibold">Inventario de Gas</h2>
            <div className="flex items-center gap-2">
              <input value={gQuery} onChange={(e)=>{setGQuery(e.target.value); setGPage(1)}} placeholder="Buscar..." className="h-10 border rounded-lg px-3"/>
              
              <button
                className="h-10 px-4 rounded-lg bg-emerald-600 text-white font-semibold"
                onClick={()=>setGasModal({open:true,mode:'create'})}
              >Nuevo</button>
            </div>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left border">Tipo</th>
                  <th className="p-2 text-right border">Precio Venta</th>
                  <th className="p-2 text-right border">Precio Envase</th>
                  <th className="p-2 text-right border">LLENOS</th>
                  <th className="p-2 text-right border">VACÍOS</th>
                  <th className="p-2 text-center border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gPageItems.map(g => (
                  <tr key={g.id}>
                    <td className="p-2 border">{g.nombre}</td>
                    <td className="p-2 border text-right">${Number(g.precio_venta).toLocaleString()}</td>
                    <td className="p-2 border text-right">${Number(g.precio_envase).toLocaleString()}</td>
                    <td className="p-2 border text-right">{g.stock_llenos}</td>
                    <td className="p-2 border text-right">{g.stock_vacios}</td>
                    <td className="p-2 border text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="h-9 px-3 rounded bg-indigo-600 text-white"
                          onClick={()=>{ setGasModal({open:true,mode:'edit',record:g}); setGForm({ nombre:g.nombre, precio_venta:g.precio_venta, precio_envase:g.precio_envase, stock_llenos:g.stock_llenos, stock_vacios:g.stock_vacios }) }}
                        >📝 </button>
                        <button
                          className="h-9 px-3 rounded bg-red-600 text-white"
                          onClick={()=>handleDeleteGas(g)}
                        >🗑️ </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-500">Página {gPage} de {gTotalPages} — {gasTotal} elementos</div>
            <div className="flex gap-2">
              <button disabled={gPage===1} onClick={()=>setGPage(p=>Math.max(1,p-1))} className="h-9 px-3 border rounded disabled:opacity-50">Anterior</button>
              <button disabled={gPage===gTotalPages} onClick={()=>setGPage(p=>Math.min(gTotalPages,p+1))} className="h-9 px-3 border rounded disabled:opacity-50">Siguiente</button>
            </div>
          </div>
          

          {/* Modal Añadir Tipo de Gas */}
          {(gasModal.open && gasModal.mode==='create') && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-4">
                <div className="text-lg font-bold mb-3">Añadir Tipo de Gas</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="h-10 border rounded px-3" placeholder="Tipo (ej: 40lb)" value={gForm.nombre} onChange={e=>setGForm({...gForm, nombre:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Precio Venta" value={gForm.precio_venta} onChange={e=>setGForm({...gForm, precio_venta:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Precio Envase" value={gForm.precio_envase} onChange={e=>setGForm({...gForm, precio_envase:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Stock Inicial Llenos" value={gForm.stock_llenos} onChange={e=>setGForm({...gForm, stock_llenos:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Stock Inicial Vacíos" value={gForm.stock_vacios} onChange={e=>setGForm({...gForm, stock_vacios:e.target.value})}/>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="h-10 px-4 rounded bg-gray-100" onClick={()=>{
                  setGasModal({open:false,mode:'create'});
                  setGForm({ nombre: '', precio_venta: '', precio_envase: '', stock_llenos: 0, stock_vacios: 0 });
                }}>Cancelar</button>
                  <button className="h-10 px-4 rounded bg-gray-900 text-white" onClick={handleCreateGas}>Guardar</button>
                </div>
              </div>
            </div>
          )}
          {(gasModal.open && gasModal.mode==='edit') && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-4">
                <div className="text-lg font-bold mb-3">Editar Tipo de Gas</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="h-10 border rounded px-3" placeholder="Tipo (ej: 40lb)" value={gForm.nombre} onChange={e=>setGForm({...gForm, nombre:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Precio Venta" value={gForm.precio_venta} onChange={e=>setGForm({...gForm, precio_venta:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Precio Envase" value={gForm.precio_envase} onChange={e=>setGForm({...gForm, precio_envase:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Stock Llenos" value={gForm.stock_llenos} onChange={e=>setGForm({...gForm, stock_llenos:e.target.value})}/>
                  <input type="number" className="h-10 border rounded px-3" placeholder="Stock Vacíos" value={gForm.stock_vacios} onChange={e=>setGForm({...gForm, stock_vacios:e.target.value})}/>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="h-10 px-4 rounded bg-gray-100" onClick={()=>{
                  setGasModal({open:false,mode:'edit',record:null});
                  setGForm({ nombre: '', precio_venta: '', precio_envase: '', stock_llenos: 0, stock_vacios: 0 });
                }}>Cancelar</button>
                  <button className="h-10 px-4 rounded bg-gray-900 text-white" onClick={handleUpdateGas}>Guardar</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Modal de Confirmación de Eliminación - Producto */}
<ModalConfirmacion
  isOpen={showDeleteProductModal}
  onClose={() => {
    setShowDeleteProductModal(false)
    setProductToDelete(null)
  }}
  onConfirm={confirmDeleteProduct}
  title="Eliminar Producto"
  message={`¿Está seguro de que desea eliminar el producto "${productToDelete?.nombre}"? Esta acción no se puede deshacer.`}
  confirmText="Eliminar"
  cancelText="Cancelar"
/>

{/* Modal de Confirmación de Eliminación - Gas */}
<ModalConfirmacion
  isOpen={showDeleteGasModal}
  onClose={() => {
    setShowDeleteGasModal(false)
    setGasToDelete(null)
  }}
  onConfirm={confirmDeleteGas}
  title="Eliminar Tipo de Gas"
  message={`¿Está seguro de que desea eliminar el tipo de gas "${gasToDelete?.nombre}"? Esta acción no se puede deshacer.`}
  confirmText="Eliminar"
  cancelText="Cancelar"
/>
    </div>
  )
}

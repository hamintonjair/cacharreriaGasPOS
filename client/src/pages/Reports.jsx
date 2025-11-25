import React, { useEffect, useState, useCallback } from 'react';

// Card component for report sections
const ReportCard = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 mb-6 ${className}`}>
    <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
    {children}
  </div>
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Reports() {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'ADMIN';

  // Sales state
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [errorSales, setErrorSales] = useState('');
  const [salesPage, setSalesPage] = useState(1);
  const salesPageSize = 10;
  
  // Invoice reprint state
  const [showReprintInvoice, setShowReprintInvoice] = useState(false);
  const [reprintSale, setReprintSale] = useState(null);
  const [company, setCompany] = useState(null);
  
  // Filter states - fecha actual por defecto (calculada dinámicamente con zona horaria local)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Establecer fechas actuales al montar el componente
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    console.log('Fecha calculada:', dateStr, 'Fecha local:', now.toLocaleDateString());
    setStartDate(dateStr);
    setEndDate(dateStr);
  }, []);
  
  const [metodoPago, setMetodoPago] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [users, setUsers] = useState([]);

  // Pagination for sales
  const salesTotalPages = Math.max(1, Math.ceil(sales.length / salesPageSize));
  const salesPageItems = sales.slice(
    (salesPage - 1) * salesPageSize,
    salesPage * salesPageSize
  );

  // Load users (sellers)
  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API_URL}/users`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, [isAdmin, token]);

  // Validate date range
  const validateDates = useCallback(() => {
    if (!startDate || !endDate) {
      setErrorSales('Las fechas de inicio y fin son obligatorias');
      return false;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setErrorSales('La fecha de inicio no puede ser mayor a la fecha de fin');
      return false;
    }
    
    return true;
  }, [startDate, endDate]);

  // Load company data
  const loadCompany = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/company`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCompany(data);
      }
    } catch (error) {
      console.error('Error loading company:', error);
    }
  }, [token]);

  // Handle invoice reprint
  const handleReprintInvoice = async (saleId) => {
    try {
      const res = await fetch(`${API_URL}/sales/${saleId}`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error cargando venta');
      
      setReprintSale(data);
      setShowReprintInvoice(true);
    } catch (error) {
      console.error('Error loading sale for reprint:', error);
      alert('Error al cargar los datos de la venta');
    }
  };

  // Print function for reprint (same as POS)
  const handlePrintReprintInvoice = () => {
    if (!reprintSale || !company) return;
    
    // Close modal immediately
    setShowReprintInvoice(false);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes.');
      return;
    }
    
    // Generate the HTML content for the invoice
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura #${reprintSale.id}</title>
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
              <div class="number">No. #${String(reprintSale.id).padStart(6, '0')}</div>
            </div>
          </div>
          
          <div class="sale-info">
            <div>
              <div class="label">Fecha:</div>
              <div>${new Date(reprintSale.fecha).toLocaleString('es-EC')}</div>
            </div>
            <div>
              <div class="label">Método de Pago:</div>
              <div>${reprintSale.metodo_pago}</div>
            </div>
            ${reprintSale.cliente ? `
              <div>
                <div class="label">Cliente:</div>
                <div>${reprintSale.cliente.nombre}</div>
                ${reprintSale.cliente.identificacion ? `<div style="font-size: 10px; color: #666;">CI/RUC: ${reprintSale.cliente.identificacion}</div>` : ''}
              </div>
            ` : ''}
            <div>
              <div class="label">Vendedor:</div>
              <div>${reprintSale.user?.nombre || 'N/A'}</div>
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
              ${reprintSale.items?.map(item => `
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
              <span>$${Number(reprintSale.total).toLocaleString('es-EC')}</span>
            </div>
            
            ${reprintSale.metodo_pago === 'Efectivo' && reprintSale.amountReceived ? `
              <div class="total-row">
                <span>Paga con:</span>
                <span>$${Number(reprintSale.amountReceived).toLocaleString('es-EC')}</span>
              </div>
              <div class="total-row change">
                <span>Cambio:</span>
                <span>$${Number(reprintSale.amountReceived - reprintSale.total).toLocaleString('es-EC')}</span>
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
    `;
    
    // Write the HTML to the new window
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  // Load sales data
  const loadSales = useCallback(async () => {
    if (!isAdmin) return;
    
    if (!validateDates()) {
      return;
    }
    
    setLoadingSales(true);
    setErrorSales('');
    setSalesPage(1); // Reset page when loading new data
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        ...(metodoPago && { metodo_pago: metodoPago }),
        ...(sellerId && { user_id: sellerId })
      });
      
      const res = await fetch(`${API_URL}/reports/sales?${params}`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.error || 'Error al cargar las ventas');
      }
      
      const data = await res.json();
      setSales(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Error loading sales:', error);
      setErrorSales(error.message);
    } finally {
      setLoadingSales(false);
    }
  }, [isAdmin, startDate, endDate, metodoPago, sellerId, token, validateDates]);

  // Aplicar filtros automáticamente cuando cambie cualquier valor
  useEffect(() => {
    if (!isAdmin || !validateDates()) return;
    loadSales();
  }, [startDate, endDate, metodoPago, sellerId, isAdmin, validateDates, loadSales]);

  // Load initial data
  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadCompany();
    // Cargar ventas automáticamente con las fechas por defecto (hoy)
    loadSales();
  }, [isAdmin, loadUsers, loadCompany]);

  // Handle export to Excel
  const handleExportExcel = useCallback(async () => {
    if (!validateDates()) {
      return;
    }
    
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        ...(metodoPago && { metodo_pago: metodoPago }),
        ...(sellerId && { user_id: sellerId })
      });
      
      const res = await fetch(`${API_URL}/reports/sales/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.error || 'Error al exportar las ventas');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ventas_${startDate}_a_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setErrorSales(error.message || 'Error al exportar el archivo Excel');
    }
  }, [startDate, endDate, metodoPago, sellerId, token, validateDates]);

  // Show loading state
  if (loadingSales) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="p-4">
        <div className="max-w-3xl mx-auto">
          <div className="p-4 border rounded-xl bg-white text-center text-red-500">
            Acceso denegado. Solo los administradores pueden ver los reportes.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Reportes de Ventas</h1>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Sales Report Section */}
        <ReportCard title="Reporte de Ventas Detallado">
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select 
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm text-gray-900"
                  style={{ color: '#111827' }}
                >
                  <option value="" style={{ color: '#111827' }}>Todos</option>
                  <option value="EFECTIVO" style={{ color: '#111827' }}>Efectivo</option>
                  <option value="TRANSFERENCIA" style={{ color: '#111827' }}>Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                <select 
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  className="w-full border rounded-md p-2 text-sm text-gray-900"
                  style={{ color: '#111827' }}
                >
                  <option value="" style={{ color: '#111827' }}>Todos</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id} style={{ color: '#111827' }}>
                      {user.nombre || user.name || `Usuario ${user.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              
              <button
                onClick={handleExportExcel}
                disabled={loadingSales}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar a Excel
              </button>
            </div>
          </div>

          {errorSales && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p className="font-bold">Error</p>
              <p>{errorSales}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            {sales.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas</h3>
                <p className="mt-1 text-sm text-gray-500">No se encontraron ventas con los filtros seleccionados.</p>
              </div>
            ) : (
              <div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Productos
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pago
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendedor
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesPageItems.flatMap((sale, saleIndex) => [
                      // Main sale row
                      <tr key={sale.id} className="bg-gray-50">
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.fechaFormatted || 'N/A'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                          {sale.cliente?.nombre || 'Cliente no especificado'}
                        </td>
                        <td colSpan="3" className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.items?.length || 0} {sale.items?.length === 1 ? 'producto' : 'productos'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                          ${sale.total || '0.00'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            sale.metodo_pago === 'EFECTIVO' 
                              ? 'bg-green-100 text-green-800' 
                              : sale.metodo_pago === 'TARJETA' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                          }`}>
                            {sale.metodo_pago || 'OTRO'}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                          {sale.vendedor?.nombre || 'N/A'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleReprintInvoice(sale.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 mx-auto"
                            title="Reimprimir factura"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Reimprimir
                          </button>
                        </td>
                      </tr>,
                      // Item rows
                      ...(sale.items?.map((item, itemIndex) => (
                        <tr key={`${sale.id}-${itemIndex}`} className="border-t border-gray-200">
                          <td colSpan="2" className="px-6 py-2 text-xs text-gray-500">
                            {/* Empty for alignment */}
                          </td>
                          <td className="px-6 py-2 text-sm text-gray-900">
                            {item.nombre}
                          </td>
                          <td className="px-6 py-2 text-sm text-gray-900 text-right">
                            {item.cantidad}
                          </td>
                          <td className="px-6 py-2 text-sm text-gray-900 text-right">
                            ${item.precio_unitario || '0.00'}
                          </td>
                          <td className="px-6 py-2 text-sm text-gray-900 text-right">
                            ${item.subtotal || '0.00'}
                          </td>
                          <td colSpan="3" className="px-6 py-2 text-xs text-gray-500">
                            {/* Empty for alignment */}
                          </td>
                        </tr>
                      )) || [])
                    ])}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="6" className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                        Total:
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                        ${sales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0).toLocaleString()}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
                
                {/* Paginación */}
                {salesTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Mostrando {(salesPage - 1) * salesPageSize + 1} a {Math.min(salesPage * salesPageSize, sales.length)} de {sales.length} ventas
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                        disabled={salesPage === 1}
                        className="h-9 px-3 border rounded disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setSalesPage(p => Math.min(salesTotalPages, p + 1))}
                        disabled={salesPage === salesTotalPages}
                        className="h-9 px-3 border rounded disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ReportCard>

        {/* Reprint Invoice Modal */}
        {showReprintInvoice && reprintSale && company && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h3 className="text-lg font-bold">Reimprimir Factura #{String(reprintSale.id).padStart(6, '0')}</h3>
                <button
                  onClick={() => setShowReprintInvoice(false)}
                  className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Resumen de Venta</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Fecha:</span>
                      <div className="font-medium">{new Date(reprintSale.fecha).toLocaleString('es-EC')}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Cliente:</span>
                      <div className="font-medium">{reprintSale.cliente?.nombre || 'Cliente no especificado'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Método de Pago:</span>
                      <div className="font-medium">{reprintSale.metodo_pago}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Vendedor:</span>
                      <div className="font-medium">{reprintSale.user?.nombre || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-lg font-bold text-blue-600">${Number(reprintSale.total).toLocaleString('es-EC')}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white border-t p-4 flex justify-center gap-3">
                <button
                  onClick={() => setShowReprintInvoice(false)}
                  className="h-10 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePrintReprintInvoice}
                  className="h-10 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🖨️ Imprimir Factura
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

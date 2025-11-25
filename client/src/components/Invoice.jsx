import React from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Invoice({ sale, company, client, showPrint = true }) {
  if (!sale || !company) return null

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return Number(amount).toLocaleString('es-EC', {
      style: 'currency',
      currency: 'USD'
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-2xl mx-auto bg-white" id="invoice-print">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {company.logo_url && (
              <img 
             src={`https://cacharreriagaspos.onrender.com/api${company.logo_url}`}
                alt="Logo" 
                className="h-16 mb-2"
              />
            )}
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <div className="text-sm text-gray-600 space-y-1">
              <div>RUC/NIT: {company.tax_id}</div>
              <div>{company.address}</div>
              <div>Tel: {company.phone}</div>
              {company.email && <div>Email: {company.email}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">FACTURA</div>
            <div className="text-sm text-gray-600">No. #{String(sale.id).padStart(6, '0')}</div>
          </div>
        </div>
      </div>

      {/* Sale Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="font-semibold">Fecha:</div>
          <div>{formatDate(sale.fecha)}</div>
        </div>
        <div>
          <div className="font-semibold">Método de Pago:</div>
          <div>{sale.metodo_pago}</div>
        </div>
        {client && (
          <div>
            <div className="font-semibold">Cliente:</div>
            <div>{client.nombre}</div>
            {client.identificacion && <div className="text-xs text-gray-600">CI/RUC: {client.identificacion}</div>}
          </div>
        )}
        <div>
          <div className="font-semibold">Vendedor:</div>
          <div>{sale.user?.nombre || 'N/A'}</div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-4">
        <table className="w-full text-sm">
          <thead className="border-t border-b">
            <tr>
              <th className="text-left py-2">Producto</th>
              <th className="text-center py-2">Cant.</th>
              <th className="text-right py-2">P. Unit.</th>
              <th className="text-right py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-2">
                  <div className="font-medium">{item.product?.nombre || item.gasType?.nombre}</div>
                  {item.gasType && (
                    <div className="text-xs text-gray-600">
                      {item.recibio_envase ? 'Con intercambio' : 'Sin intercambio'}
                    </div>
                  )}
                </td>
                <td className="text-center py-2">{item.cantidad}</td>
                <td className="text-right py-2">{formatCurrency(item.precio_unit)}</td>
                <td className="text-right py-2 font-semibold">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t-2 border-gray-900 pt-2">
        <div className="flex justify-between text-lg font-bold">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
        
        {sale.metodo_pago === 'Efectivo' && sale.amountReceived && (
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Paga con:</span>
              <span>{formatCurrency(sale.amountReceived)}</span>
            </div>
            <div className="flex justify-between font-semibold text-green-600">
              <span>Cambio:</span>
              <span>{formatCurrency(sale.amountReceived - sale.total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t text-center text-xs text-gray-600">
        <div>¡Gracias por su compra!</div>
        <div className="mt-1">Este documento no tiene validez fiscal</div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          #invoice-print {
            margin: 0;
            padding: 20px;
            font-size: 12px;
          }
          
          #invoice-print h1 {
            font-size: 18px;
          }
          
          #invoice-print table {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  )
}

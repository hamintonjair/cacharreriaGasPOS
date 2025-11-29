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

  // Calcular totales de IVA - usando valores del servidor si están disponibles
// Calcular totales de IVA - cálculo independiente por producto
const calculateTotals = () => {
  // 🔥 Si el servidor envió los valores, usarlos directamente (son más precisos)
  if (sale.subtotalNeto !== undefined && sale.ivaTotal !== undefined) {
    return {
      subtotalSinIVA: Number(sale.subtotalNeto),
      totalIVA: Number(sale.ivaTotal),
      totalConIVA: Number(sale.subtotalNeto) + Number(sale.ivaTotal),
      // 🔥 NUEVO: Desglose de IVA por producto
      ivaPorProducto: sale.items?.map(item => {
        const precioUnit = Number(item.precio_unit) || 0
        const cantidad = Number(item.cantidad) || 0
        const taxRate = Number(item.taxRateApplied) || 0
        
        // 🔥 CÁLCULO INDEPENDIENTE DE IVA POR PRODUCTO
        const ivaUnitario = precioUnit * taxRate
        const ivaTotalProducto = ivaUnitario * cantidad
        const subtotalNetoProducto = precioUnit * cantidad - ivaTotalProducto
        
        return {
          nombre: item.product?.nombre || item.gasType?.nombre || 'Producto',
          precioUnit,
          cantidad,
          taxRate,
          ivaUnitario,
          ivaTotalProducto,
          subtotalNetoProducto,
          totalProducto: precioUnit * cantidad
        }
      }) || []
    }
  }

  // Fallback: calcular localmente con desglose por producto
  let subtotalSinIVA = 0
  let totalIVA = 0
  let ivaPorProducto = []

  sale.items?.forEach(item => {
    const precioUnit = Number(item.precio_unit) || 0
    const cantidad = Number(item.cantidad) || 0
    const taxRate = Number(item.taxRateApplied) || 0
    
    // 🔥 CÁLCULO INDEPENDIENTE DE IVA POR PRODUCTO
    const ivaUnitario = precioUnit * taxRate
    const ivaTotalProducto = ivaUnitario * cantidad
    const subtotalNetoProducto = precioUnit * cantidad - ivaTotalProducto
    
    // Acumular totales
    subtotalSinIVA += subtotalNetoProducto
    totalIVA += ivaTotalProducto
    
    // Guardar desglose de este producto
    ivaPorProducto.push({
      nombre: item.product?.nombre || item.gasType?.nombre || 'Producto',
      precioUnit,
      cantidad,
      taxRate,
      ivaUnitario,
      ivaTotalProducto,
      subtotalNetoProducto,
      totalProducto: precioUnit * cantidad
    })
  })

  const totalConIVA = subtotalSinIVA + totalIVA

  return { 
    subtotalSinIVA, 
    totalIVA, 
    totalConIVA,
    ivaPorProducto
  }
}

  const { subtotalSinIVA, totalIVA, totalConIVA } = calculateTotals()

  // Calcular información de crédito - usando valores del servidor si están disponibles
  const getCreditInfo = () => {
    const creditPayment = sale.payments?.find(p => p.paymentMethod === 'CREDIT')
    if (!creditPayment) return null

    // 🔥 CORRECCIÓN: El saldo pendiente es el monto total que se financia a crédito
    // = Total de la venta - Pagos en efectivo/tarjeta/transferencia
    const cashPayments = sale.payments?.filter(p => p.paymentMethod !== 'CREDIT') || []
    const totalCash = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    
    // El saldo pendiente es lo que se financia (incluye IVA)
    // Se calcula como: Total de la venta - Pagos en efectivo
    const pendingBalance = Number(sale.total) - totalCash
    
    // 🔥 Usar creditInterestAmount del servidor
    // Este es el interés capturado, NO es lo que hay que recalcular
    const interestAmount = Number(sale.creditInterestAmount || 0)
    
    // El total crédito es lo que se envía como amount en el payment CREDIT
    // O se puede calcular como: saldo pendiente + interés
    const totalCredit = pendingBalance + interestAmount
    
    console.log("🔍 DESGLOSE DE CRÉDITO EN INVOICE:", {
      pendingBalance: pendingBalance.toFixed(2),
      interestAmount: interestAmount.toFixed(2),
      interestType: sale.creditInterestType,
      totalCredit: totalCredit.toFixed(2),
      installments: sale.creditInstallments?.length,
      payments: sale.payments?.map(p => ({ method: p.paymentMethod, amount: p.amount }))
    })

    return {
      pendingBalance,
      interestAmount,
      interestType: sale.creditInterestType, // PORCENTAJE o VALOR
      totalCredit,
      installments: sale.creditInstallments || []
    }
  }

  const creditInfo = getCreditInfo()

  console.log("🔍 DESGLOSE DE CRÉDITO EN INVOICE:", creditInfo)
  return (
    <div className="max-w-2xl mx-auto bg-white" id="invoice-print">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {company.logo_url && (
              <img 
                src={`http://localhost:5000${company.logo_url}`} 
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
            <div className="text-sm text-gray-600 mb-2">FACTURA</div>
            <div className="text-lg font-bold">#{sale.id}</div>
            <div className="text-sm text-gray-600 mt-2">
              <div>Fecha: {formatDate(sale.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cliente */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-1">CLIENTE:</div>
        <div className="text-sm">
          {client ? (
            <>
              <div className="font-medium">{client.nombre}</div>
              {client.identificacion && <div className="text-gray-600">CI/RUC: {client.identificacion}</div>}
              {client.direccion && <div className="text-gray-600">Dirección: {client.direccion}</div>}
              {client.telefono && <div className="text-gray-600">Tel: {client.telefono}</div>}
            </>
          ) : (
            <div className="text-gray-600">Cliente general</div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2">Producto</th>
              <th className="text-center py-2">Cant.</th>
              <th className="text-right py-2">P. Unit.</th>
              <th className="text-right py-2">IVA</th>
              <th className="text-right py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-2">
                  <div className="font-medium">
                    {item.product?.nombre || item.gasType?.nombre || 'Producto'}
                  </div>
                  {item.recibio_envase && (
                    <div className="text-xs text-green-600">Envase recibido</div>
                  )}
                </td>
                <td className="text-center py-2">{item.cantidad}</td>
                <td className="text-right py-2">{formatCurrency(item.precio_unit)}</td>
                <td className="text-right py-2">
                  {Number(item.taxRateApplied) > 0 
                    ? `${(Number(item.taxRateApplied) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </td>
                <td className="text-right py-2 font-medium">
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="mb-4">
        <div className="flex justify-end">
          <div className="w-72">
            {/* Desglose de IVA */}
            <div className="bg-gray-50 p-3 rounded mb-2">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-700">Subtotal sin IVA:</span>
                <span className="font-semibold">{formatCurrency(subtotalSinIVA)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-700">IVA Total:</span>
                <span className="font-semibold text-orange-600">+{formatCurrency(totalIVA)}</span>
              </div>
              
              <div className="flex justify-between py-3 border-t-2 border-gray-300 font-bold text-lg">
                <span>TOTAL:</span>
                <span className="text-green-700">{formatCurrency(totalConIVA)}</span>
              </div>
            </div>
            
            {/* Información de crédito */}
            {creditInfo && (
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm font-semibold text-blue-700 mb-3">DETALLE DE CRÉDITO:</div>
                
                {/* Saldo pendiente */}
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-700">Saldo pendiente:</span>
                  <span className="font-semibold">{formatCurrency(creditInfo.pendingBalance)}</span>
                </div>
                
                {/* Interés */}
                {creditInfo.interestAmount > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-700">
                      {creditInfo.interestType === 'PORCENTAJE' 
                        ? `Interés (${creditInfo.interestAmount}%):` 
                        : 'Interés:'
                      }
                    </span>
                    <span className="font-semibold text-orange-600">
                      +{formatCurrency(creditInfo.interestAmount)}
                    </span>
                  </div>
                )}
        
                {/* Total crédito */}
                <div className="flex justify-between py-2 border-t border-blue-200 font-bold text-blue-700">
                  <span>Total crédito:</span>
                  <span>{formatCurrency(creditInfo.totalCredit)}</span>
                </div>
                
                {/* Plan de pagos */}
                {creditInfo.installments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="text-xs font-semibold text-blue-600 mb-2">Plan de pagos ({creditInfo.installments.length} cuotas):</div>
                    <div className="space-y-1">
                      {creditInfo.installments.map((installment, index) => (
                        <div key={index} className="flex justify-between text-xs text-gray-600">
                          <span>Cuota {installment.installmentNumber} ({formatDate(installment.dueDate)}):</span>
                          <span className="font-semibold">{formatCurrency(installment.amountDue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagos */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">FORMA DE PAGO:</div>
        <div className="text-sm space-y-1">
          {sale.payments?.map((payment, index) => (
            <div key={index} className="flex justify-between">
              <span>{payment.paymentMethod === 'CASH' ? 'Efectivo' : payment.paymentMethod === 'CREDIT_CARD' ? 'Tarjeta' : payment.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Crédito'}:</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-300 pt-4 mt-4 text-center text-xs text-gray-600">
        <div>Gracias por su compra</div>
        <div className="mt-1">Esta factura es un documento válido para fines fiscales</div>
      </div>

     
    </div>
  )
}
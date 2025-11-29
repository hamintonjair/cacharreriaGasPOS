import React, { useEffect, useMemo, useState, useRef } from "react";
import Invoice from "../components/Invoice.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function POS() {
  const token = localStorage.getItem("auth_token");
  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }),
    [token]
  );
  const [creditModal, setCreditModal] = useState({
    open: false,
    installments: [],
    numInstallments: 1,
    paymentFrequency: "MENSUAL", // DIARIO, SEMANAL, QUINCENAL, MENSUAL
    firstDueDate: new Date(),
    interestType: null, // "PORCENTAJE" o "VALOR" o null
    interestValue: 0, // Valor del interés (porcentaje o monto fijo)
  });
  const [creditInterestInput, setCreditInterestInput] = useState("");
  const interestInputRef = useRef(null);

  // Estado para el modal de ingreso de interés
  const [interestValueModal, setInterestValueModal] = useState({
    open: false,
    type: null, // "PORCENTAJE" o "VALOR"
    value: "",
  });
  const [activeTab, setActiveTab] = useState("CACHARRERIA"); // or 'GAS' or 'LAVADORAS'
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados para alquiler por amanecida
  const [rentalType, setRentalType] = useState('HOUR'); // 'HOUR' o 'OVERNIGHT'
  const [overnightAdditionalPrice, setOvernightAdditionalPrice] = useState(0)
  const [deliveryDateTime, setDeliveryDateTime] = useState('')

  // Paginación
  const [productsPage, setProductsPage] = useState(1);
  const [gasPage, setGasPage] = useState(1);
  const itemsPerPage = 20;

  const [products, setProducts] = useState([]);
  const [gasTypes, setGasTypes] = useState([]);
  const [washingMachines, setWashingMachines] = useState([]);
  const [clients, setClients] = useState([]);

  const [cart, setCart] = useState([]); // { key, type: 'product'|'gas', id, nombre, precio, cantidad, recibio_envase?, precio_base?, precio_envase? }
  const [selectedClient, setSelectedClient] = useState(null); // { id, nombre, identificacion }

  // Estado para pagos múltiples
  const [payments, setPayments] = useState([{ method: "CASH", amount: 0 }]);

  // Estado para errores de pago
  const [paymentError, setPaymentError] = useState("");

  // Estados para alquiler de lavadoras
  const [rentalForm, setRentalForm] = useState({
    washingMachineId: "",
    hoursRented: 1,
    rentalPrice: 0,
    scheduledReturnDate: "",
  });
  const [rentalLoading, setRentalLoading] = useState(false);

  // Modals state
  const [gasModal, setGasModal] = useState({ open: false, item: null });
  const [paying, setPaying] = useState(false);

  // Invoice state
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [company, setCompany] = useState(null);

  // Print invoice function
  const handlePrintInvoice = () => {
    // Close modal immediately
    setShowInvoice(false);

    // Create a new window for printing
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast(
        "No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes.",
        "error"
      );
      return;
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
              ${
                company.logo_url
                  ? `<img src="http://localhost:5000${company.logo_url}" style="max-height: 60px; margin-bottom: 10px;" />`
                  : ""
              }
              <h1>${company.name}</h1>
              <div class="details">
                <div>RUC/NIT: ${company.tax_id}</div>
                <div>${company.address}</div>
                <div>Tel: ${company.phone}</div>
                ${company.email ? `<div>Email: ${company.email}</div>` : ""}
              </div>
            </div>
            <div class="invoice-number">
              <h2>FACTURA</h2>
              <div class="number">No. #${String(lastSale.id).padStart(
                6,
                "0"
              )}</div>
            </div>
          </div>
          
          <div class="sale-info">
            <div>
              <div class="label">Fecha:</div>
              <div>${new Date(lastSale.fecha).toLocaleString("es-EC")}</div>
            </div>
            <div>
              <div class="label">Estado de Pago:</div>
              <div>${
                lastSale.paymentStatus === "PAID"
                  ? "PAGADO"
                  : lastSale.paymentStatus === "PENDING"
                  ? "CRÉDITO"
                  : "PARCIAL"
              }</div>
            </div>
            ${
              selectedClient
                ? `
              <div>
                <div class="label">Cliente:</div>
                <div>${selectedClient.nombre}</div>
                ${
                  selectedClient.identificacion
                    ? `<div style="font-size: 10px; color: #666;">CI/RUC: ${selectedClient.identificacion}</div>`
                    : ""
                }
              </div>
            `
                : ""
            }
            <div>
              <div class="label">Vendedor:</div>
              <div>${lastSale.user?.nombre || "N/A"}</div>
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
              ${lastSale.items
                ?.map(
                  (item) => `
                <tr>
                  <td>
                    <div>${item.product?.nombre || item.gasType?.nombre}</div>
                    ${
                      item.gasType
                        ? `<div style="font-size: 9px; color: #666;">${
                            item.recibio_envase
                              ? "Con intercambio"
                              : "Sin intercambio"
                          }</div>`
                        : ""
                    }
                  </td>
                  <td class="text-center">${item.cantidad}</td>
                  <td class="text-right">$${Number(
                    item.precio_unit
                  ).toLocaleString("es-EC")}</td>
                  <td class="text-right font-bold">$${Number(
                    item.subtotal
                  ).toLocaleString("es-EC")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          ${
            lastSale.creditInstallments &&
            lastSale.creditInstallments.length > 0
              ? `
<div style="margin-bottom: 20px; border-top: 1px solid #ddd; padding-top: 15px;">
  <div style="text-align: center; font-weight: bold; margin-bottom: 10px; background-color: #f5f5f5; padding: 8px;">
    CUOTAS DE CRÉDITO
  </div>
  ${lastSale.creditInstallments
    .map(
      (installment) => `
    <div style="display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; border-bottom: 1px solid #eee;">
      <span style="flex: 1;">
        Cuota ${installment.installmentNumber} - 
        ${new Date(installment.dueDate).toLocaleDateString("es-EC", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })}
      </span>
      <span style="font-weight: bold; text-align: right; min-width: 80px;">
        $${Number(installment.amountDue).toLocaleString("es-EC")}
      </span>
    </div>
  `
    )
    .join("")}
  <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
    <span>Total Crédito:</span>
    <span>
      $${lastSale.creditInstallments
        .reduce((sum, installment) => sum + Number(installment.amountDue), 0)
        .toLocaleString("es-EC")}
    </span>
  </div>
</div>
`
              : ""
          }

          <div class="totals">
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>$${Number(lastSale.total).toLocaleString("es-EC")}</span>
            </div>
            

            
            
${
  lastSale.payments && lastSale.payments.length > 0
    ? lastSale.payments
        .map(
          (payment, index) => `
          <div class="total-row">
            <span>Pago ${index + 1} (${payment.paymentMethod}):</span>
            <span>$${Number(payment.amount).toLocaleString("es-EC")}</span>
          </div>
        `
        )
        .join("")
    : ""
}

${
  lastSale.paymentStatus === "PAID"
    ? ""
    : `
        <div class="total-row" style="color: #dc2626;">
          <span>Saldo Pendiente:</span>
          <span>$${Number(lastSale.total - lastSale.totalPaid).toLocaleString(
            "es-EC"
          )}</span>
        </div>
      `
}
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

  // Toast helper
  const toast = (message, type = "info", duration = 3000) => {
    window.dispatchEvent(
      new CustomEvent("app:toast", { detail: { message, type, duration } })
    );
  };

  // Fetch helpers
  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      let url, data;
      if (query) {
        // Si hay query, usar el endpoint de búsqueda
        url = `${API_URL}/products/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: authHeaders });
        data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error buscando productos");
      } else {
        // Si no hay query, cargar todos los productos
        url = `${API_URL}/products`;
        const res = await fetch(url, { headers: authHeaders });
        data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error cargando productos");
      }
      setProducts(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGasTypes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/gastypes`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error cargando gas");
      setGasTypes(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error cargando clientes");
      setClients(data);
      // Set default client (Cliente Genérico)
      const defaultClient = data.find((c) => c.id === 1);
      if (defaultClient) {
        setSelectedClient(defaultClient);
      }
    } catch (e) {
      console.error("Error loading clients:", e);
    }
  };

  const fetchCompany = async () => {
    try {
      const res = await fetch(`${API_URL}/company`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Error cargando datos de la empresa");
      setCompany(data);
    } catch (e) {
      console.error("Error loading company:", e);
    }
  };

  const fetchWashingMachines = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/washing-machines`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error cargando lavadoras");
      // Solo mostrar lavadoras disponibles
      setWashingMachines(
        data.data?.filter((machine) => machine.availableQuantity > 0) || []
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular fecha de entrega
  const calculateReturnDate = (hours) => {
    const now = new Date();
    const returnDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return returnDate.toISOString();
  };

  // Función para manejar el envío del alquiler (MÉTODO ORIGINAL)
  const handleRentalSubmit = async () => {
    if (!selectedClient) {
      toast("Debes seleccionar un cliente", "error");
      return;
    }
    if (!rentalForm.washingMachineId) {
      toast("Debes seleccionar una lavadora", "error");
      return;
    }
    if (rentalType === 'HOUR' && rentalForm.hoursRented < 1) {
      toast("Las horas deben ser mayor a 0", "error");
      return;
    }
    if (rentalType === 'OVERNIGHT' && !deliveryDateTime) {
      toast("Debes especificar la fecha y hora de entrega para alquiler por amanecida", "error");
      return;
    }

    setRentalLoading(true);
    try {
      // 🔥 CORRECCIÓN: Para OVERNIGHT, enviar hoursRented = 1 para evitar cálculo incorrecto
      const hoursToSend = rentalType === 'OVERNIGHT' ? 1 : rentalForm.hoursRented;
      const scheduledReturnToSend = rentalType === 'OVERNIGHT' ? deliveryDateTime : rentalForm.scheduledReturnDate;

      // 🔥 NUEVO: Calcular el precio final correcto según el tipo de alquiler
      const machine = washingMachines.find(m => m.id === Number(rentalForm.washingMachineId));
      let finalPrice = 0;
      
      if (rentalType === 'HOUR') {
        // Por Hora: precio base × horas
        finalPrice = machine ? Number(machine.pricePerHour) * rentalForm.hoursRented : 0;
      } else {
        // Por Amanecida: precio base + adicional
        finalPrice = machine ? Number(machine.pricePerHour) + overnightAdditionalPrice : 0;
      }

      const rentalData = {
        washingMachineId: Number(rentalForm.washingMachineId),
        clientId: selectedClient.id,
        hoursRented: hoursToSend,
        scheduledReturnDate: scheduledReturnToSend,
        // 🔥 NUEVO: Enviar el precio final calculado correctamente
        totalPrice: finalPrice,
        // 🔥 NUEVO: Agregar campos especiales para identificar alquiler por amanecida
        rentalType: rentalType,
        ...(rentalType === 'OVERNIGHT' && {
          overnightAdditionalPrice: overnightAdditionalPrice,
          baseHourlyPrice: washingMachines.find(m => m.id === Number(rentalForm.washingMachineId))?.pricePerHour
        })
      };

      // 🔥 DEBUG: Mostrar qué se está enviando al backend
      console.log('🚀 ENVIANDO ALQUILER:', {
        rentalType,
        hoursToSend,
        finalPrice,
        rentalData
      });

      const res = await fetch(`${API_URL}/rentals`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(rentalData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al crear alquiler");

      // Mostrar confirmación
      toast(
        `✅ Alquiler creado exitosamente! Valor total: $${rentalForm.rentalPrice.toLocaleString()}`,
        "success",
        5000
      );

      // Resetear formulario
      setRentalForm({
        washingMachineId: "",
        hoursRented: 1,
        rentalPrice: 0,
        scheduledReturnDate: calculateReturnDate(1),
      });
      setRentalType('HOUR');
      setOvernightAdditionalPrice(0);
      setDeliveryDateTime('');

      // Recargar lavadoras disponibles
      await fetchWashingMachines();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setRentalLoading(false);
    }
  };

  // Función helper para recalcular cuotas con ajuste de redondeo
  const recalculateInstallments = (modalState) => {
    const cashPayments = payments.filter((p) => p.method !== "CREDIT");
    const totalPaidCash = cashPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
    const pendingBalance = total - totalPaidCash;

    const { installments: generatedInstallments, totalWithInterest } =
      generateInstallments(
        pendingBalance,
        modalState.numInstallments,
        modalState.firstDueDate,
        modalState.paymentFrequency,
        modalState.interestType,
        modalState.interestValue
      );

    // Asegurar que el total de cuotas coincida exactamente con el monto con interés
    let installments = [...generatedInstallments];
    const totalInstallments = installments.reduce(
      (sum, inst) => sum + inst.amountDue,
      0
    );
    const difference = totalWithInterest - totalInstallments;

    // Ajustar la última cuota si hay diferencia por redondeo
    if (Math.abs(difference) > 0.01 && installments.length > 0) {
      installments[installments.length - 1] = {
        ...installments[installments.length - 1],
        amountDue: Number(
          (
            installments[installments.length - 1].amountDue + difference
          ).toFixed(2)
        ),
      };
    }

    return { installments, totalWithInterest };
  };

  // Agrega después de las otras funciones
  const handleCreditModal = (open = true) => {
    if (open) {
      const { installments, totalWithInterest } =
        recalculateInstallments(creditModal);
      setCreditModal((prev) => {
        return { ...prev, open: true, installments, totalWithInterest };
      });
    } else {
      setCreditModal((prev) => ({
        ...prev,
        open: false,
        installments: [],
        totalWithInterest: 0,
      }));
    }
  };
  const generateInstallments = (
    amount,
    numInstallments,
    firstDueDate,
    paymentFrequency = "MENSUAL",
    interestType = null,
    interestValue = 0
  ) => {
    // Asegurar que los valores sean números válidos
    const numAmount = Number(amount) || 0;
    const numInstallmentsValue = Number(numInstallments) || 1;
    const numInterestValue = Number(interestValue) || 0;

    // Calcular monto con interés
    let amountWithInterest = numAmount;
    if (interestType === "PORCENTAJE" && numInterestValue > 0) {
      // Si es porcentaje, aumentar el monto
      amountWithInterest = numAmount * (1 + numInterestValue / 100);
    } else if (interestType === "VALOR" && numInterestValue > 0) {
      // Si es valor fijo, sumarlo
      amountWithInterest = numAmount + numInterestValue;
    }

    // Calcular valor base de cada cuota
    const baseInstallmentAmount = amountWithInterest / numInstallmentsValue;
    const installments = [];

    // Calcular días según frecuencia
    const getDaysForFrequency = (frequency) => {
      switch (frequency) {
        case "DIARIO":
          return 1;
        case "SEMANAL":
          return 7;
        case "QUINCENAL":
          return 15;
        case "MENSUAL":
          return 30;
        default:
          return 30;
      }
    };

    const daysInterval = getDaysForFrequency(paymentFrequency);

    // Calcular cuotas distribuyendo el monto equitativamente
    let remainingAmount = amountWithInterest;
    for (let i = 0; i < numInstallmentsValue; i++) {
      const dueDate = new Date(firstDueDate);
      dueDate.setDate(dueDate.getDate() + daysInterval * i);

      // Para la última cuota, usar el monto restante para evitar diferencias por redondeo
      const isLastInstallment = i === numInstallmentsValue - 1;
      const installmentAmount = isLastInstallment
        ? Number(remainingAmount.toFixed(2))
        : Number(baseInstallmentAmount.toFixed(2));

      installments.push({
        installmentNumber: i + 1,
        amountDue: installmentAmount,
        dueDate: dueDate.toISOString(),
      });

      remainingAmount -= installmentAmount;
    }

    return { installments, totalWithInterest: amountWithInterest };
  };

  // Actualiza la función confirmCreditInstallments
  const confirmCreditInstallments = async () => {
    console.log("🔍 CUOTAS ANTES DE PROCESAR:", creditModal.installments);
    console.log("🔍 NÚMERO DE CUOTAS:", creditModal.installments.length);

    if (creditModal.installments.length === 0) {
      toast("Debes definir las cuotas", "error");
      return;
    }

    handleCreditModal(false);
    await processSale(creditModal.installments); // ✅ AGREGAR await
  };
  // Reset page when changing tab
  useEffect(() => {
    setProductsPage(1);
    setGasPage(1);
  }, [activeTab]);

  // Reset page when searching
  useEffect(() => {
    setProductsPage(1);
  }, [query]);

  // Initial loads
  useEffect(() => {
    if (activeTab === "CACHARRERIA") fetchProducts();
    if (activeTab === "GAS") fetchGasTypes();
    if (activeTab === "LAVADORAS") fetchWashingMachines();
    fetchClients(); // Load clients on component mount
    fetchCompany(); // Load company data on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Search handler for products
  useEffect(() => {
    const id = setTimeout(() => {
      if (activeTab === "CACHARRERIA") fetchProducts();
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTab]);

  // Cart helpers
  const addToCart = (item) => {
    const key = `${item.type}-${item.id}`;
    if (item.type === "gas") {
      // Abrir modal de gas para definir intercambio/depósito
      const gasInfo = gasTypes.find((g) => g.id === item.id);
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
      });
      return;
    }
    // Para productos, buscar el taxRate del producto original
    const productInfo = products.find((p) => p.id === item.id);
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing)
        return prev.map((i) =>
          i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      return [
        ...prev,
        {
          ...item,
          key,
          cantidad: 1,
          taxRate: productInfo?.taxRate || 0, // Incluir taxRate del producto
        },
      ];
    });
  };

  const inc = (key) =>
    setCart((prev) =>
      prev.map((i) => (i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i))
    );
  const dec = (key) =>
    setCart((prev) =>
      prev
        .map((i) =>
          i.key === key ? { ...i, cantidad: Math.max(0, i.cantidad - 1) } : i
        )
        .filter((i) => i.cantidad > 0)
    );
  const removeItem = (key) =>
    setCart((prev) => prev.filter((i) => i.key !== key));

  // Función para calcular el desglose de IVA
  const calculateTaxBreakdown = () => {
    let subtotalNeto = 0;
    let ivaTotal = 0;

    cart.forEach((item) => {
      // Precio de venta (base sin IVA)
      const precioVenta = Number(item.precio);
      const cantidad = item.cantidad;
      const baseImponible = precioVenta * cantidad;

      if (item.type === "product") {
        // Para productos: calcular IVA sobre la base imponible
        const taxRate = Number(item.taxRate || 0);
        if (taxRate > 0) {
          // IVA = Base Imponible × Tasa IVA
          const taxAmount = baseImponible * taxRate;
          subtotalNeto += baseImponible;
          ivaTotal += taxAmount;
        } else {
          // Sin IVA: solo la base imponible
          subtotalNeto += baseImponible;
        }
      } else if (item.type === "gas" || item.type === "washing_machine") {
        // Para Gas y Lavadoras: Subtotal Neto = Total Ítem y Monto IVA = 0
        subtotalNeto += baseImponible;
      }
    });

    const totalFinal = subtotalNeto + ivaTotal;

    return {
      subtotalNeto: Number(subtotalNeto.toFixed(2)),
      ivaTotal: Number(ivaTotal.toFixed(2)),
      totalFinal: Number(totalFinal.toFixed(2)),
    };
  };

  const taxBreakdown = calculateTaxBreakdown();
  const total = taxBreakdown.totalFinal; // Usar el total final calculado con IVA

  // Persist cart in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pos_cart");
      if (stored) setCart(JSON.parse(stored));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("pos_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const clearCart = () => setCart([]);

  // Pagination calculations
  const productsTotalPages = Math.max(
    1,
    Math.ceil(products.length / itemsPerPage)
  );
  const productsPageItems = products.slice(
    (productsPage - 1) * itemsPerPage,
    productsPage * itemsPerPage
  );

  const gasTotalPages = Math.max(1, Math.ceil(gasTypes.length / itemsPerPage));
  const gasPageItems = gasTypes.slice(
    (gasPage - 1) * itemsPerPage,
    gasPage * itemsPerPage
  );

  const handleCheckout = async () => {
    if (!cart.length) {
      toast("El carrito está vacío", "error");
      return;
    }

    // 🔥 CORRECCIÓN: Calcular pagos en efectivo/tarjeta/transferencia
    const cashPayments = payments.filter((p) => p.method !== "CREDIT");
    const totalPaidCash = cashPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
    const hasPendingBalance = totalPaidCash < total;

    // ✅ Verificar correctamente si hay pagos de crédito
    const hasCreditPayment = payments.some((p) => p.method === "CREDIT");

    // Validar cliente solo si hay crédito o saldo pendiente
    if ((hasPendingBalance || hasCreditPayment) && !selectedClient) {
      setPaymentError("Debe seleccionar un cliente para ventas a crédito");
      return;
    }

    // ✅ Solo configurar cuotas si hay crédito o saldo pendiente
    if (hasPendingBalance || hasCreditPayment) {
      if (creditModal.installments.length === 0) {
        setPaymentError("Debe configurar las cuotas de crédito");
        handleCreditModal(true);
        return;
      }
      await processSale(creditModal.installments);
    } else {
      // ✅ Pago completo en efectivo/tarjeta/transferencia
      await processSale();
    }
  };

  const processSale = async (installments = []) => {
    setPaymentError("");
    setPaying(true);

    try {
      const userStr = localStorage.getItem("auth_user");
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user?.id) throw new Error("Usuario no autenticado");

      // 🔥 NUEVO: Calcular IVA por producto en el frontend
      const itemsConIVA = cart.map((i) => {
        const precioUnit = Number(i.precio) || 0;
        const cantidad = Number(i.cantidad) || 0;
        const taxRate = i.type === "product" ? Number(i.taxRate || 0) : 0; // Gas y lavadoras no tienen IVA

        // 🔥 CÁLCULO INDEPENDIENTE DE IVA POR PRODUCTO
        const ivaUnitario = precioUnit * taxRate;
        const ivaTotalProducto = ivaUnitario * cantidad;
        const totalProducto = precioUnit * cantidad;

        const itemBase = {
          ...(i.type === "product" ? { productId: i.id } : {}),
          ...(i.type === "gas"
            ? { gasTypeId: i.id, recibio_envase: Boolean(i.recibio_envase) }
            : {}),
          ...(i.type === "washing_machine"
            ? { 
                washingMachineId: i.id,
                horasAlquiler: i.horasAlquiler,
                rentalType: i.rentalType,
                scheduledReturnDate: i.scheduledReturnDate,
                ...(i.overnightAdditionalPrice && { overnightAdditionalPrice: i.overnightAdditionalPrice })
              }
            : {}),
          cantidad: i.cantidad,
          precio_unit: i.precio,
          // 🔥 NUEVO: Enviar desglose de IVA calculado en frontend
          taxRateApplied: String(taxRate),
          taxAmount: String(ivaTotalProducto.toFixed(2)),
          totalProducto: String(totalProducto.toFixed(2)),
        };

        return itemBase;
      });

      // 🔥 NUEVO: Calcular totales de IVA en frontend
      let subtotalNetoFrontend = 0;
      let ivaTotalFrontend = 0;
      let totalFrontend = 0;

      itemsConIVA.forEach((item) => {
        const subtotalNeto = Number(item.subtotalNeto) || 0;
        const taxAmount = Number(item.taxAmount) || 0;
        const total = Number(item.totalProducto) || 0;

        subtotalNetoFrontend += subtotalNeto;
        ivaTotalFrontend += taxAmount;
        totalFrontend += total;
      });

      // Calcular saldo pendiente correctamente
      const cashPayments = payments.filter((p) => p.method !== "CREDIT");
      const totalPaidCash = cashPayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );
      const pendingBalance = total - totalPaidCash;

      // Calcular monto con interés para el pago CREDIT
      let creditAmount = pendingBalance;
      if (
        creditModal.interestType === "PORCENTAJE" &&
        creditModal.interestValue > 0
      ) {
        creditAmount =
          pendingBalance * (1 + Number(creditModal.interestValue) / 100);
      } else if (
        creditModal.interestType === "VALOR" &&
        creditModal.interestValue > 0
      ) {
        creditAmount = pendingBalance + Number(creditModal.interestValue);
      }

      // Preparar pagos: si hay CREDIT, usar el saldo pendiente con interés
      const processedPayments = payments.map((p) => {
        if (p.method === "CREDIT") {
          return {
            amount: creditAmount, // Usar el saldo pendiente con interés
            paymentMethod: p.method,
            interestType: creditModal.interestType, // 🔥 NUEVO: Incluir tipo de interés
            interestValue: creditModal.interestValue, // 🔥 NUEVO: Incluir valor de interés
          };
        }
        return {
          amount: p.amount,
          paymentMethod: p.method,
        };
      });

      const body = {
        userId: user.id,
        clientId: selectedClient?.id || 1,
        items: itemsConIVA, // 🔥 Enviar items con IVA calculado
        ivaTotal: ivaTotalFrontend,
        subtotalNeto: totalFrontend,
        total: pendingBalance,
        payments: processedPayments,
        ...(installments.length > 0 && { creditInstallments: installments }),
      };

      const res = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Error procesando venta");

      // Resetear estados
      clearCart();
      setPayments([{ method: "CASH", amount: 0 }]);
      setPaymentError("");
      setCreditModal((prev) => ({ ...prev, open: false, installments: [] }));

      // Mostrar factura
      setLastSale(data);
      setShowInvoice(true);

      toast(`Venta realizada (#${data.id || ""})`, "success", 4000);
    } catch (error) {
      toast(error.message, "error", 4000);
    } finally {
      setPaying(false);
    }
  };

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
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => setActiveTab("CACHARRERIA")}
          className={`h-12 rounded-lg font-semibold ${
            activeTab === "CACHARRERIA"
              ? "bg-blue-600 text-white"
              : "bg-gray-100"
          }`}
        >
          CACHARRERÍA
        </button>
        <button
          onClick={() => setActiveTab("GAS")}
          className={`h-12 rounded-lg font-semibold ${
            activeTab === "GAS" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          GAS
        </button>
        <button
          onClick={() => setActiveTab("LAVADORAS")}
          className={`h-12 rounded-lg font-semibold ${
            activeTab === "LAVADORAS" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          LAVADORAS
        </button>
      </div>
    </div>
  );

  const CatalogBody = (
    <div className="p-3 sm:p-4 overflow-auto">
      {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
      {activeTab === "CACHARRERIA" && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {productsPageItems.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  addToCart({
                    type: "product",
                    id: p.id,
                    nombre: p.nombre,
                    precio: p.precio_venta,
                    taxRate: p.taxRate || 0, // Incluir taxRate del producto
                  })
                }
                className="border rounded-xl p-3 text-left bg-white hover:bg-gray-50 active:scale-95 transition shadow-sm"
              >
                <div className="font-semibold text-base sm:text-lg">
                  {p.nombre}
                </div>
                <div className="mt-1 text-blue-600 font-bold text-lg sm:text-xl">
                  ${Number(p.precio_venta).toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Stock: {p.stock}
                </div>
              </button>
            ))}
          </div>

          {/* Paginación de productos */}
          {productsTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {(productsPage - 1) * itemsPerPage + 1} a{" "}
                {Math.min(productsPage * itemsPerPage, products.length)} de{" "}
                {products.length} productos
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                  disabled={productsPage === 1}
                  className="h-8 px-3 border rounded text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setProductsPage((p) => Math.min(productsTotalPages, p + 1))
                  }
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
      {activeTab === "GAS" && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {gasPageItems.map((g) => (
              <button
                key={g.id}
                onClick={() =>
                  addToCart({
                    type: "gas",
                    id: g.id,
                    nombre: g.nombre,
                    precio: g.precio_venta,
                  })
                }
                className="border rounded-xl p-3 text-left bg-white hover:bg-gray-50 active:scale-95 transition shadow-sm"
              >
                <div className="font-semibold text-base sm:text-lg">
                  {g.nombre}
                </div>
                <div className="mt-1 text-blue-600 font-bold text-lg sm:text-xl">
                  ${Number(g.precio_venta).toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Llenos: {g.stock_llenos} · Vacíos: {g.stock_vacios}
                </div>
              </button>
            ))}
          </div>

          {/* Paginación de gas */}
          {gasTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {(gasPage - 1) * itemsPerPage + 1} a{" "}
                {Math.min(gasPage * itemsPerPage, gasTypes.length)} de{" "}
                {gasTypes.length} tipos de gas
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setGasPage((p) => Math.max(1, p - 1))}
                  disabled={gasPage === 1}
                  className="h-8 px-3 border rounded text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setGasPage((p) => Math.min(gasTotalPages, p + 1))
                  }
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
      {activeTab === "LAVADORAS" && (
        <div className="space-y-4">
          {/* Formulario de Alquiler */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">
              Formulario de Alquiler
            </h3>

            {/* 🔥 NUEVO: Selector de Tipo de Alquiler */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Alquiler:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setRentalType('HOUR');
                    // Resetear a valores por defecto para alquiler por hora
                    setRentalForm(prev => ({
                      ...prev,
                      hoursRented: 1,
                      scheduledReturnDate: calculateReturnDate(1)
                    }));
                  }}
                  className={`p-3 border-2 rounded-lg transition-colors ${
                    rentalType === 'HOUR'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm font-bold">Por Hora</div>
                    <div className="text-xs text-gray-500">Precio por hora</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setRentalType('OVERNIGHT');
                    // Resetear para alquiler por amanecida
                    setRentalForm(prev => ({
                      ...prev,
                      hoursRented: 999, // 🔥 Indicador especial
                      scheduledReturnDate: deliveryDateTime || ''
                    }));
                  }}
                  className={`p-3 border-2 rounded-lg transition-colors ${
                    rentalType === 'OVERNIGHT'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm font-bold">Por Amanecida</div>
                    <div className="text-xs text-gray-500">Tarifa especial</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Selección de Lavadora */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lavadora:
              </label>
              <select
                value={rentalForm.washingMachineId}
                onChange={(e) => {
                  const machine = washingMachines.find(
                    (m) => m.id === Number(e.target.value)
                  );
                  
                  let newRentalPrice = 0;
                  
                  if (rentalType === 'HOUR') {
                    newRentalPrice = machine
                      ? Number(machine.pricePerHour) * rentalForm.hoursRented
                      : 0;
                  } else {
                    // 🔥 OVERNIGHT: precio base + adicional
                    newRentalPrice = machine
                      ? Number(machine.pricePerHour) + overnightAdditionalPrice
                      : 0;
                  }
                  
                  setRentalForm({
                    ...rentalForm,
                    washingMachineId: e.target.value,
                    rentalPrice: newRentalPrice,
                    scheduledReturnDate: rentalType === 'HOUR' 
                      ? calculateReturnDate(rentalForm.hoursRented)
                      : deliveryDateTime,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar lavadora...</option>
                {washingMachines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.description} - ${machine.pricePerHour}/h (
                    {machine.availableQuantity} disponibles)
                  </option>
                ))}
              </select>
            </div>

            {/* 🕐 Horas a Alquilar (solo para HOUR) */}
            {rentalType === 'HOUR' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horas a Alquilar:
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={rentalForm.hoursRented}
                  onChange={(e) => {
                    const hours = parseInt(e.target.value) || 1;
                    const machine = washingMachines.find(
                      (m) => m.id === Number(rentalForm.washingMachineId)
                    );
                    setRentalForm({
                      ...rentalForm,
                      hoursRented: hours,
                      rentalPrice: machine
                        ? Number(machine.pricePerHour) * hours
                        : 0,
                      scheduledReturnDate: calculateReturnDate(hours),
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* 🔥 NUEVO: Precio Adicional Amanecida (solo para OVERNIGHT) */}
            {rentalType === 'OVERNIGHT' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Amanecida (Adicional):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overnightAdditionalPrice === 0 ? "" : overnightAdditionalPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    const additionalPrice = value === "" ? 0 : parseFloat(value) || 0;
                    setOvernightAdditionalPrice(additionalPrice);
                    
                    // Recalcular precio total
                    const machine = washingMachines.find(
                      (m) => m.id === Number(rentalForm.washingMachineId)
                    );
                    const newRentalPrice = machine
                      ? Number(machine.pricePerHour) + additionalPrice
                      : 0;
                    
                    setRentalForm(prev => ({
                      ...prev,
                      rentalPrice: newRentalPrice
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Valor adicional que se suma al precio base por hora
                </p>
              </div>
            )}

            {/* 🔥 NUEVO: Fecha y Hora de Entrega (solo para OVERNIGHT) */}
            {rentalType === 'OVERNIGHT' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha y Hora de Entrega Final:
                </label>
                <input
                  type="datetime-local"
                  value={deliveryDateTime}
                  onChange={(e) => {
                    setDeliveryDateTime(e.target.value);
                    setRentalForm(prev => ({
                      ...prev,
                      scheduledReturnDate: e.target.value
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* 📊 Resumen del Cálculo */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Resumen:</h4>
              <div className="space-y-1 text-sm">
                {rentalType === 'HOUR' ? (
                  <>
                    <div className="flex justify-between">
                      <span>Precio por hora:</span>
                      <span>
                        ${washingMachines.find(m => m.id === Number(rentalForm.washingMachineId))?.pricePerHour || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Horas:</span>
                      <span>{rentalForm.hoursRented}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-600 pt-2 border-t">
                      <span>Total:</span>
                      <span>${rentalForm.rentalPrice.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>Precio base por hora:</span>
                      <span>
                        ${washingMachines.find(m => m.id === Number(rentalForm.washingMachineId))?.pricePerHour || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adicional amanecida:</span>
                      <span>${overnightAdditionalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-purple-600 pt-2 border-t">
                      <span>Precio unitario final:</span>
                      <span>${rentalForm.rentalPrice.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Botón de alquiler directo (MÉTODO ORIGINAL) */}
            <button
              onClick={handleRentalSubmit}
              disabled={
                !selectedClient || !rentalForm.washingMachineId || rentalLoading
              }
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rentalLoading ? "Procesando..." : "Alquilar Lavadora"}
            </button>

            {!selectedClient && (
              <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Debes seleccionar un cliente antes de alquilar
              </div>
            )}
          </div>
        </div>
      )}
      {loading && <div className="mt-3 text-sm text-gray-500">Cargando…</div>}
    </div>
  );

  const CartPanel = (
    <div className="h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b bg-white">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">Carrito</h2>
          <button
            onClick={clearCart}
            className="h-10 px-4 rounded-lg bg-red-50 text-red-700 font-semibold"
          >
            Limpiar Carrito
          </button>
        </div>
        {/* Client Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Cliente:</label>
          <select
            value={selectedClient?.id || ""}
            onChange={(e) => {
              const client = clients.find(
                (c) => c.id === Number(e.target.value)
              );
              setSelectedClient(client || null);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar cliente...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.nombre}{" "}
                {client.identificacion ? `(${client.identificacion})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
        {cart.length === 0 && (
          <div className="text-sm text-gray-500">
            No hay ítems. Toca productos o gas para agregarlos.
          </div>
        )}
        {cart.map((i) => (
          <div key={i.key} className="border rounded-xl p-3 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{i.nombre}</div>
                <div className="text-sm text-gray-500">
                  ${Number(i.precio).toLocaleString()} ·{" "}
                  {i.type === "gas" ? "Gas" : i.type === "washing_machine" ? "Lavadora" : "Producto"}
                </div>
                {i.type === "gas" && (
                  <div className="text-xs text-gray-500">
                    {i.recibio_envase
                      ? "Con intercambio (sin depósito)"
                      : "Sin intercambio (incluye depósito)"}
                  </div>
                )}
                {i.type === "washing_machine" && (
                  <div className="text-xs text-gray-500">
                    {i.rentalType === 'OVERNIGHT' 
                      ? 'Alquiler por Amanecida'
                      : `${i.horasAlquiler} hora(s) a $${i.pricePerHour}/hora`
                    }
                    {i.scheduledReturnDate && (
                      <div className="text-xs text-purple-600">
                        Entrega: {new Date(i.scheduledReturnDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {i.type === "gas" && (
                  <button
                    onClick={() => setGasModal({ open: true, item: i })}
                    className="text-blue-600 text-sm"
                  >
                    Editar
                  </button>
                )}
                <button
                  onClick={() => removeItem(i.key)}
                  className="text-red-600 text-sm"
                >
                  Quitar
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => dec(i.key)}
                className="h-12 w-12 rounded-full bg-gray-100 text-2xl font-bold"
              >
                -
              </button>
              <div className="min-w-[3rem] text-center text-xl font-semibold">
                {i.cantidad}
              </div>
              <button
                onClick={() => inc(i.key)}
                className="h-12 w-12 rounded-full bg-gray-100 text-2xl font-bold"
              >
                +
              </button>
              <div className="ml-auto text-lg font-bold">
                $
                {(() => {
                  const precioVenta = Number(i.precio);
                  const cantidad = i.cantidad;
                  const base = precioVenta * cantidad;

                  if (i.type === "product") {
                    const taxRate = Number(i.taxRate || 0);
                    const iva = taxRate > 0 ? base * taxRate : 0;
                    return (base + iva).toLocaleString();
                  } else if (i.type === "washing_machine") {
                    // Para lavadoras, el precio ya incluye el cálculo total
                    return (precioVenta * cantidad).toLocaleString();
                  } else {
                    // Gas: sin IVA
                    return base.toLocaleString();
                  }
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t bg-white p-3 sm:p-4">
        {/* Desglose de IVA */}
        <div className="mb-4 space-y-2 pb-4 border-b">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">Subtotal Neto:</div>
            <div className="font-semibold text-gray-700">
              ${taxBreakdown.subtotalNeto.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">IVA Total:</div>
            <div className="font-semibold text-gray-700">
              ${taxBreakdown.ivaTotal.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-base text-gray-600 font-semibold">
            TOTAL FINAL
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            ${total.toLocaleString()}
          </div>
        </div>

        {/* Sección de Pagos Mixtos */}
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Forma de Pago</h3>

          {/* Pago 1 - Obligatorio */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Método 1:
                </label>
                <select
                  value={payments[0]?.method || "CASH"}
                  onChange={(e) => {
                    const newPayments = [...payments];
                    const method = e.target.value;

                    newPayments[0] = {
                      ...newPayments[0],
                      method,
                      amount:
                        method === "CREDIT"
                          ? 0 // Para CREDIT, el amount se calculará dinámicamente al enviar
                          : newPayments[0]?.amount || 0,
                    };

                    // Si el método es CRÉDITO, agregar segundo pago si no existe
                    if (method === "CREDIT" && newPayments.length === 1) {
                      newPayments.push({
                        method: "CASH",
                        amount: 0,
                      });
                    } else if (method !== "CREDIT" && newPayments.length > 1) {
                      // Si no es crédito, eliminar segundo pago si existe
                      newPayments.splice(1);
                    }

                    setPayments(newPayments);
                    setPaymentError("");

                    // 🔥 NUEVO: Abrir modal automáticamente si se selecciona CRÉDITO
                    if (method === "CREDIT") {
                      // Validar que haya cliente seleccionado
                      if (!selectedClient) {
                        setPaymentError(
                          "Debe seleccionar un cliente para ventas a crédito"
                        );
                        return;
                      }

                      // Abrir modal de cuotas
                      handleCreditModal(true);
                    } else {
                      // Cerrar modal si se cambia a otro método
                      handleCreditModal(false);
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CREDIT_CARD">Tarjeta</option>
                  <option value="CREDIT">Crédito</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Monto 1:
                </label>
                <input
                  type="number"
                  value={
                    payments[0]?.method === "CREDIT"
                      ? (() => {
                          // Si es CREDIT, mostrar saldo pendiente calculado
                          const otherPayments = payments.filter(
                            (_, idx) => idx !== 0
                          );
                          const totalOtherPayments = otherPayments.reduce(
                            (sum, p) => sum + (p.amount || 0),
                            0
                          );
                          return total - totalOtherPayments;
                        })()
                      : payments[0]?.amount || ""
                  }
                  onChange={(e) => {
                    const amount = Number(e.target.value) || 0;
                    const newPayments = [...payments];

                    // Si el método es CREDIT, no permitir editar el amount manualmente
                    if (newPayments[0]?.method === "CREDIT") {
                      return; // No hacer nada si es CREDIT
                    }

                    newPayments[0] = { ...newPayments[0], amount };

                    // Si el monto es menor al total, agregar segundo pago
                    if (amount < total && newPayments.length === 1) {
                      newPayments.push({
                        method: "CASH",
                        amount: total - amount,
                      });
                    } else if (amount >= total && newPayments.length > 1) {
                      newPayments.splice(1); // Eliminar segundo pago si no es necesario
                    } else if (amount < total && newPayments.length > 1) {
                      newPayments[1] = {
                        ...newPayments[1],
                        amount: total - amount,
                      };
                    }

                    setPayments(newPayments);
                    setPaymentError("");
                  }}
                  readOnly={payments[0]?.method === "CREDIT"}
                  className={`w-full px-2 py-1 text-sm border border-gray-300 rounded ${
                    payments[0]?.method === "CREDIT"
                      ? "bg-gray-100 cursor-not-allowed"
                      : ""
                  }`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Pago 2 - Condicional */}
          {payments.length > 1 && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Método 2:
                  </label>
                  <select
                    value={payments[1]?.method || "CASH"}
                    onChange={(e) => {
                      const newPayments = [...payments];
                      const method = e.target.value;

                      newPayments[1] = {
                        ...newPayments[1],
                        method,
                        amount:
                          method === "CREDIT"
                            ? 0 // Para CREDIT, el amount se calculará dinámicamente al enviar
                            : newPayments[1]?.amount || 0,
                      };

                      setPayments(newPayments);

                      // 🔥 NUEVO: Abrir modal automáticamente si se selecciona CRÉDITO
                      if (method === "CREDIT") {
                        if (!selectedClient) {
                          setPaymentError(
                            "Debe seleccionar un cliente para ventas a crédito"
                          );
                          return;
                        }

                        handleCreditModal(true);
                      } else {
                        // Verificar si hay otros métodos de crédito
                        const hasOtherCredit = newPayments.some(
                          (p, index) => index !== 1 && p.method === "CREDIT"
                        );

                        if (!hasOtherCredit) {
                          handleCreditModal(false);
                        }
                      }
                    }}
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CREDIT_CARD">Tarjeta</option>
                    <option value="CREDIT">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Monto 2:
                  </label>
                  <input
                    type="number"
                    value={payments[1]?.amount || ""}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100"
                    placeholder="Saldo pendiente"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Resumen de Pagos con Devuelta */}
          <div className="bg-blue-50 rounded-lg p-3">
            {/* Cálculo de valores */}
            {(() => {
              const totalPaid = payments.reduce(
                (sum, p) => sum + (p.amount || 0),
                0
              );
              const pendingBalance = total - totalPaid;
              const change = totalPaid - total;

              return (
                <div className="space-y-2">
                  {/* Total Pagado - Resaltado */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Total Pagado:
                    </span>
                    <span className="text-lg font-bold text-green-700">
                      ${totalPaid.toLocaleString()}
                    </span>
                  </div>

                  {/* Devuelta - Solo si es mayor a cero Y método es efectivo */}
                  {change > 0 && payments[0]?.method === "CASH" && (
                    <div className="flex justify-between items-center bg-green-100 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-green-800">
                        Devuelta:
                      </span>
                      <span className="text-xl font-bold text-green-600">
                        ${change.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Saldo Pendiente - Solo si es mayor a cero */}
                  {pendingBalance > 0 && (
                    <div className="flex justify-between items-center bg-red-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-red-700">
                        Saldo Pendiente:
                      </span>
                      <span className="text-xl font-bold text-red-600">
                        ${pendingBalance.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Indicador de estado */}
                  <div className="text-center pt-2 border-t border-blue-200">
                    {change > 0 ? (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                        ✅ PAGO COMPLETO - CAMBIO GENERADO
                      </span>
                    ) : pendingBalance > 0 ? (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        ⏳ PAGO PARCIAL - SALDO PENDIENTE
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        💰 PAGO EXACTO
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Error de Validación */}
          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <div className="text-xs text-red-600">{paymentError}</div>
            </div>
          )}
        </div>

        <button
          className="mt-3 w-full h-14 rounded-xl bg-green-600 text-white text-lg font-bold hover:bg-green-700 active:scale-[.99] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCheckout}
          disabled={
            cart.length === 0 ||
            payments.some((p) => !p.amount || p.amount <= 0)
          }
        >
          PROCESAR VENTA
        </button>
      </div>
    </div>
  );

  // Agrega antes del return final del componente
  const CreditInstallmentModal = () => {
    if (!creditModal.open) return null;

    // 🔥 CORRECCIÓN: Calcular saldo pendiente correctamente
    const cashPayments = payments.filter((p) => p.method !== "CREDIT");
    const totalPaidCash = cashPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
    const pendingBalance = total - totalPaidCash;

    // Calcular monto con interés
    let amountWithInterest = pendingBalance;
    if (
      creditModal.interestType === "PORCENTAJE" &&
      creditModal.interestValue > 0
    ) {
      amountWithInterest =
        pendingBalance * (1 + creditModal.interestValue / 100);
    } else if (
      creditModal.interestType === "VALOR" &&
      creditModal.interestValue > 0
    ) {
      amountWithInterest = pendingBalance + creditModal.interestValue;
    }

    const { installments: generatedInstallments, totalWithInterest } =
      generateInstallments(
        pendingBalance,
        creditModal.numInstallments,
        creditModal.firstDueDate,
        creditModal.paymentFrequency,
        creditModal.interestType,
        creditModal.interestValue
      );

    // Asegurar que el total de cuotas coincida exactamente con el monto con interés
    let installments = [...generatedInstallments];
    const totalInstallments = installments.reduce(
      (sum, inst) => sum + inst.amountDue,
      0
    );
    const difference = totalWithInterest - totalInstallments;

    // Ajustar la última cuota si hay diferencia por redondeo (más de 1 centavo)
    if (Math.abs(difference) > 0.01 && installments.length > 0) {
      installments[installments.length - 1] = {
        ...installments[installments.length - 1],
        amountDue: Number(
          (
            installments[installments.length - 1].amountDue + difference
          ).toFixed(2)
        ),
      };
    }

    const installmentAmount =
      installments.length > 0 ? installments[0].amountDue : 0;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Configurar Cuotas de Crédito
            </h2>
            <button
              onClick={() => handleCreditModal(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            ></button>
          </div>

          {/* Información del Crédito */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Saldo a Diferir:</span>
                <div className="text-xl font-bold text-blue-600">
                  ${pendingBalance.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Número de Cuotas:</span>
                <div className="text-xl font-bold text-blue-600">
                  {creditModal.numInstallments}
                </div>
              </div>
            </div>
            {creditModal.interestType && creditModal.interestValue > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">
                    Interés (
                    {creditModal.interestType === "PORCENTAJE" ? "%" : "$"}):
                  </span>
                  <div className="text-lg font-bold text-orange-600">
                    {creditModal.interestType === "PORCENTAJE"
                      ? `${creditModal.interestValue}%`
                      : `$${creditModal.interestValue.toLocaleString()}`}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">
                    Total con Interés:
                  </span>
                  <div className="text-lg font-bold text-purple-600">
                    ${totalWithInterest.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4">
              <span className="text-sm text-gray-600">
                Valor de Cada Cuota:
              </span>
              <div className="text-2xl font-bold text-green-600">
                ${installmentAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Configuración de Cuotas */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Cuotas
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={creditModal.numInstallments}
                onChange={(e) => {
                  const numInstallments = Math.max(
                    1,
                    Number(e.target.value) || 1
                  );
                  const updatedState = { ...creditModal, numInstallments };
                  const { installments, totalWithInterest } =
                    recalculateInstallments(updatedState);
                  setCreditModal((prev) => ({
                    ...prev,
                    numInstallments,
                    installments,
                    totalWithInterest,
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frecuencia de Pago
              </label>
              <select
                value={creditModal.paymentFrequency}
                onChange={(e) => {
                  const paymentFrequency = e.target.value;
                  const updatedState = { ...creditModal, paymentFrequency };
                  const { installments, totalWithInterest } =
                    recalculateInstallments(updatedState);
                  setCreditModal((prev) => ({
                    ...prev,
                    paymentFrequency,
                    installments,
                    totalWithInterest,
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="DIARIO">Diario</option>
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primera Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={creditModal.firstDueDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  const firstDueDate = new Date(e.target.value);
                  const updatedState = { ...creditModal, firstDueDate };
                  const { installments, totalWithInterest } =
                    recalculateInstallments(updatedState);
                  setCreditModal((prev) => ({
                    ...prev,
                    firstDueDate,
                    installments,
                    totalWithInterest,
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Configuración de Interés */}
            <div className="border-t pt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Interés (Opcional)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInterestValueModal({
                      open: true,
                      type: "PORCENTAJE",
                      value:
                        creditModal.interestType === "PORCENTAJE"
                          ? creditInterestInput
                          : "",
                    });
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    creditModal.interestType === "PORCENTAJE"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  Porcentaje (%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInterestValueModal({
                      open: true,
                      type: "VALOR",
                      value:
                        creditModal.interestType === "VALOR"
                          ? creditInterestInput
                          : "",
                    });
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    creditModal.interestType === "VALOR"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  Valor Fijo ($)
                </button>
              </div>
            </div>
          </div>

          {/* Modal pequeño para ingresar valor de interés */}
          {interestValueModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-4">
                <div className="text-lg font-bold mb-3">
                  {interestValueModal.type === "PORCENTAJE"
                    ? "Porcentaje de Interés"
                    : "Valor de Interés"}
                </div>
                <input
                  type="number"
                  step={interestValueModal.type === "PORCENTAJE" ? "0.1" : "1"}
                  min="0"
                  max={
                    interestValueModal.type === "PORCENTAJE" ? "100" : "999999"
                  }
                  value={interestValueModal.value}
                  onChange={(e) => {
                    setInterestValueModal((prev) => ({
                      ...prev,
                      value: e.target.value,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                  placeholder={
                    interestValueModal.type === "PORCENTAJE"
                      ? "Ej: 5.5"
                      : "Ej: 1000"
                  }
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="h-10 px-4 rounded bg-gray-100"
                    onClick={() => {
                      setInterestValueModal({
                        open: false,
                        type: null,
                        value: "",
                      });
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="h-10 px-4 rounded bg-blue-600 text-white"
                    onClick={() => {
                      // Aplicar el valor
                      const finalValue = interestValueModal.value || "0";
                      const updatedState = {
                        ...creditModal,
                        interestType: interestValueModal.type,
                        interestValue: finalValue,
                      };
                      const { installments, totalWithInterest } =
                        recalculateInstallments(updatedState);
                      setCreditModal((prev) => ({
                        ...prev,
                        interestType: interestValueModal.type,
                        interestValue: finalValue,
                        installments,
                        totalWithInterest,
                      }));
                      setCreditInterestInput(finalValue);
                      setInterestValueModal({
                        open: false,
                        type: null,
                        value: "",
                      });
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vista Previa de Cuotas */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">
              Vista Previa de Cuotas
            </h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">
                      Cuota
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left">
                      Vencimiento
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-right">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {creditModal.installments.map((installment, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">
                        Cuota {installment.installmentNumber}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {new Date(installment.dueDate).toLocaleDateString(
                          "es-EC"
                        )}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right font-semibold">
                        ${installment.amountDue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3">
            <button
              onClick={() => handleCreditModal(false)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmCreditInstallments}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Confirmar Cuotas y Procesar Venta
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-0">
        {/* Left 70% */}
        <div className="lg:col-span-7 border-r bg-gray-25 min-h-[50vh]">
          {CatalogHeader}
          {CatalogBody}
        </div>
        {/* Right 30% */}
        <div className="lg:col-span-3 min-h-[50vh]">{CartPanel}</div>
      </div>

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
      {/* Gas Modal */}
      {gasModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">{gasModal.item?.nombre}</h3>
              <p className="text-sm text-gray-500 mt-1">
                ¿El cliente entrega cilindro vacío (Intercambio)?
              </p>
            </div>
            <div className="p-4 space-y-3">
              <button
                className="w-full h-14 rounded-xl bg-blue-600 text-white text-lg font-bold"
                onClick={() => {
                  const it = gasModal.item;
                  const updated = {
                    ...it,
                    recibio_envase: true,
                    precio: it.precio_base,
                  };
                  setCart((prev) => {
                    const exists = prev.find((p) => p.key === it.key);
                    if (exists)
                      return prev.map((p) =>
                        p.key === it.key ? { ...p, ...updated } : p
                      );
                    return [...prev, updated];
                  });
                  setGasModal({ open: false, item: null });
                }}
              >
                SÍ (Intercambio)
              </button>
              <button
                className="w-full h-14 rounded-xl bg-amber-500 text-white text-lg font-bold"
                onClick={() => {
                  const it = gasModal.item;
                  const precio =
                    Number(it.precio_base) + Number(it.precio_envase || 0);
                  const updated = { ...it, recibio_envase: false, precio };
                  setCart((prev) => {
                    const exists = prev.find((p) => p.key === it.key);
                    if (exists)
                      return prev.map((p) =>
                        p.key === it.key ? { ...p, ...updated } : p
                      );
                    return [...prev, updated];
                  });
                  setGasModal({ open: false, item: null });
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
              <div className="text-xs text-gray-500">
                Depósito (envase): $
                {Number(gasModal.item?.precio_envase || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agregar el modal aquí */}
      <CreditInstallmentModal />
    </div>
  );
}

async function submitSaleWithApi({
  cart,
  authHeaders,
  metodo_pago,
  selectedClient,
}) {
  const userStr = localStorage.getItem("auth_user");
  const user = userStr ? JSON.parse(userStr) : null;
  if (!user?.id) throw new Error("Usuario no autenticado");

  const items = cart.map((i) => ({
    ...(i.type === "product" ? { productId: i.id } : {}),
    ...(i.type === "gas"
      ? { gasTypeId: i.id, recibio_envase: Boolean(i.recibio_envase) }
      : {}),
    cantidad: i.cantidad,
    precio_unit: i.precio,
  }));

  const body = {
    userId: user.id,
    clientId: selectedClient?.id || 1, // Default to client 1 if no client selected
    metodo_pago,
    items,
  };

  const res = await fetch(`${API_URL}/sales`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error procesando venta");
  return data;
}

import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AccountsReceivable() {
  const [debts, setDebts] = useState([]);
  const [stats, setStats] = useState({
    totalDebt: 0,
    totalSales: 0,
    pendingSales: 0,
    partialSales: 0,
    averageDebtPerSale: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  const [company, setCompany] = useState({
    name: "CacharreriaGasPOS", // Valor por defecto
  });
  // Estados para filtros
  const [filters, setFilters] = useState({
    clientId: "",
    startDate: "",
    endDate: "",
  });

  // Estados para el modal de pago
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    saleId: null,
    clientName: "",
    totalAmount: 0,
    pendingBalance: 0,
  });
  const [paymentForm, setPaymentForm] = useState({
    installments: [], // ✅ Array de cuotas seleccionadas
    totalAmount: 0, // ✅ Total calculado automáticamente
    paymentMethod: "CASH",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Cargar datos de la empresa
  const loadCompany = async () => {
    try {
      const response = await fetch(`${API_URL}/company`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setCompany({
            name: data.name || "CacharrerieGasPOS",
          });
        }
      }
    } catch (err) {
      console.error("Error cargando empresa:", err);
    }
  };

  const loadReminders = async () => {
    setLoadingReminders(true);
    try {
      const response = await fetch(`${API_URL}/reminders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (err) {
      console.error("Error cargando recordatorios:", err);
    } finally {
      setLoadingReminders(false);
    }
  };

  // Cargar deudas
  const loadDebts = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.itemsPerPage,
      });

      // Agregar filtros si existen
      if (filters.clientId) params.append("clientId", filters.clientId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const url = `${API_URL}/sales/pending-payments?${params}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) throw new Error(data.error || "Error cargando deudas");

      setDebts(data.data);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Error completo:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar deudas al montar y cuando cambian filtros
  useEffect(() => {
    loadDebts();
    loadCompany(); // ✅ Agregar esta línea
    loadReminders(); // ✅ Agregar esta línea
  }, [filters]);

  // Manejar cambio de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadDebts(newPage);
    }
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilters({
      clientId: "",
      startDate: "",
      endDate: "",
    });
  };

  // Abrir modal de pago
  const openPaymentModal = (debt) => {
    setPaymentModal({
      isOpen: true,
      saleId: debt.id,
      clientName: debt.client?.nombre || "N/A",
      totalAmount: debt.total,
      pendingBalance: debt.totalDebt,
      creditInstallments: debt.creditInstallments,
    });
    setPaymentForm({
      installments: [], // ✅ Array vacío
      totalAmount: 0,
      paymentMethod: "CASH",
    });
  };

  // Cerrar modal de pago
  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      saleId: null,
      clientName: "",
      totalAmount: 0,
      pendingBalance: 0,
      creditInstallments: [],
    });
    setPaymentForm({
      installments: [],
      totalAmount: 0,
      paymentMethod: "CASH",
    });
  };

  // Registrar pago
  const handlePayment = async (e) => {
    e.preventDefault();

    if (paymentForm.installments.length === 0) {
      toast.error("Selecciona al menos una cuota para pagar");
      return;
    }

    setPaymentLoading(true);
    setError("");

    try {
      // ✅ Crear múltiples pagos, uno por cada cuota
      const paymentPromises = paymentForm.installments.map((installment) =>
        fetch(`${API_URL}/payments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            installmentId: installment.id,
            amount: Number(installment.amountDue),
            paymentMethod: paymentForm.paymentMethod,
          }),
        })
      );

      // ✅ Ejecutar todos los pagos en paralelo
      const responses = await Promise.all(paymentPromises);

      // ✅ Verificar que todos los pagos fueron exitosos
      const allSuccessful = responses.every((response) => response.ok);

      if (!allSuccessful) {
        throw new Error("Error en uno o más pagos");
      }

      // Cerrar modal y recargar deudas
      closePaymentModal();
      loadDebts();

      toast.success(
        `${paymentForm.installments.length} cuota(s) pagada(s) exitosamente`,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
    } catch (err) {
      toast.error(err.message || "Error registrando pago", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setPaymentLoading(false);
    }
  };
  const handleInstallmentToggle = (installment, isChecked) => {
    const newInstallments = isChecked
      ? [...paymentForm.installments, installment]
      : paymentForm.installments.filter((inst) => inst.id !== installment.id);

    const totalAmount = newInstallments.reduce(
      (sum, inst) => sum + Number(inst.amountDue),
      0
    );

    setPaymentForm({
      ...paymentForm,
      installments: newInstallments,
      totalAmount,
    });
  };
  // Generar enlace de WhatsApp
  const generateWhatsAppLink = (debt) => {
    if (!debt.client?.telefono) return "#";

    const message = `Hola ${
      debt.client.nombre
    }, le recordamos su saldo pendiente de $${(
      debt.totalDebt || 0
    ).toLocaleString("es-EC")} en la empresa ${
      company.name
    }. Por favor, realizar su pago. ¡Gracias!`;

    return `https://wa.me/${debt.client.telefono.replace(
      /[^\d]/g,
      ""
    )}?text=${encodeURIComponent(message)}`;
  };

  // envio d erecordatorio automatico
  const sendWhatsAppReminder = (reminder) => {
    const message = `Hola ${
      reminder.sale?.client?.nombre
    }, te recordamos que tu cuota ${reminder.installmentNumber} de $${Number(
      reminder.amountDue
    ).toLocaleString("es-EC")} vence el ${new Date(
      reminder.dueDate
    ).toLocaleDateString()}. Por favor, realiza tu pago a tiempo. ¡Gracias!`;

    const whatsappUrl = `https://wa.me/${reminder.sale?.client?.telefono?.replace(
      /[^\d]/g,
      ""
    )}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const markAsNotified = async (reminderId) => {
    try {
      setReminders(reminders.filter((r) => r.id !== reminderId));
      toast.success("Recordatorio marcado como notificado", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error("Error marcando recordatorio:", err);
    }
  };
  // Formatear fecha
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("es-EC", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Cuentas por Cobrar
        </h1>
        <p className="text-gray-600">
          Gestiona y cobra las deudas pendientes de los clientes
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Deuda</div>
          <div className="text-2xl font-bold text-red-600">
            ${(stats.totalDebt || 0).toLocaleString("es-EC")}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Ventas Pendientes</div>
          <div className="text-2xl font-bold text-orange-600">
            {stats.totalSales}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Cuotas Pendientes</div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.pendingInstallments || 0}
          </div>
        </div>
      </div>

      {/* Dashboard de Recordatorios */}
      {/* Dashboard de Recordatorios */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
          ⏰ Recordatorios de Pago
          {loadingReminders && (
            <span className="ml-2 text-sm text-yellow-600">Cargando...</span>
          )}
        </h3>

        {/* ✅ Mensaje informativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">ℹ️</span>
            <p className="text-sm text-blue-800">
              Los recordatorios se mostrarán{" "}
              <span className="font-semibold">2 días antes</span> de la fecha de
              vencimiento de cada cuota.
            </p>
          </div>
        </div>

        {reminders.length > 0 ? (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="bg-white rounded-lg p-3 border border-yellow-300"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {reminder.sale?.client?.nombre || "Cliente"}
                    </div>
                    <div className="text-sm text-gray-600">
                      Cuota {reminder.installmentNumber} - $
                      {Number(reminder.amountDue).toLocaleString("es-EC")}
                    </div>
                    <div className="text-xs text-gray-500">
                      Vence: {new Date(reminder.dueDate).toLocaleDateString()}
                      {new Date(reminder.dueDate) < new Date() && (
                        <span className="ml-2 text-red-600 font-semibold">
                          ⚠️ VENCIDA
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => sendWhatsAppReminder(reminder)}
                      className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                    >
                      💬 WhatsApp
                    </button>
                    <button
                      onClick={() => markAsNotified(reminder.id)}
                      className="px-3 py-1.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                    >
                      ✅ Notificado
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">
              ✅ No hay recordatorios pendientes
            </p>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente ID
            </label>
            <input
              type="number"
              value={filters.clientId}
              onChange={(e) =>
                setFilters({ ...filters, clientId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ID del cliente"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Tabla de Deudas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Venta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Venta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Pagado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo Pendiente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                {/* Después de la columna "Estado" */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cuotas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : debts.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No hay deudas pendientes
                  </td>
                </tr>
              ) : (
                debts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {debt.client?.nombre || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {debt.client?.identificacion || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {debt.user?.nombre || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(debt.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(debt.total || 0).toLocaleString("es-EC")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(debt.totalPaid || 0).toLocaleString("es-EC")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-red-600">
                        ${(debt.totalDebt || 0).toLocaleString("es-EC")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          debt.paymentStatus === "PENDING"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {debt.paymentStatus === "PENDING"
                          ? "CRÉDITO"
                          : "PARCIAL"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {debt.creditInstallments?.map((installment) => (
                          <div
                            key={installment.id}
                            className="flex items-center space-x-2"
                          >
                            <span className="text-xs text-gray-600">
                              Cuota {installment.installmentNumber}
                            </span>
                            {installment.status === "OVERDUE" && (
                              <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                ⚠️ Vencida
                              </span>
                            )}
                            {installment.status === "PENDING" &&
                              new Date(installment.dueDate) <=
                                new Date(
                                  Date.now() + 3 * 24 * 60 * 60 * 1000
                                ) && (
                                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  ⏰ Por vencer
                                </span>
                              )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openPaymentModal(debt)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                        >
                          💸 Pagar
                        </button>
                        {debt.client?.telefono && (
                          <a
                            href={generateWhatsAppLink(debt)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600 transition-colors"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando{" "}
                {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} a{" "}
                {Math.min(
                  pagination.currentPage * pagination.itemsPerPage,
                  pagination.totalItems
                )}{" "}
                de {pagination.totalItems} resultados
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm">
                  Página {pagination.currentPage} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pago */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Registrar Pago</h2>

            <div className="mb-4">
              <div className="text-sm text-gray-600">Cliente</div>
              <div className="font-medium">{paymentModal.clientName}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600">Total Venta</div>
              <div className="font-medium">
                ${(paymentModal.totalAmount || 0).toLocaleString("es-EC")}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Cuotas a Pagar
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {paymentModal.creditInstallments?.map((installment) => (
                  <label
                    key={installment.id}
                    className="flex items-center p-2 border rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={
                        paymentForm.installments?.some(
                          (inst) => inst.id === installment.id
                        ) || false
                      }
                      onChange={(e) =>
                        handleInstallmentToggle(installment, e.target.checked)
                      }
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Cuota {installment.installmentNumber} - $
                        {Number(installment.amountDue).toLocaleString("es-EC")}
                      </div>
                      <div className="text-xs text-gray-500">
                        Vence:{" "}
                        {new Date(installment.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600">Total a Pagar</div>
              <div className="text-xl font-bold text-blue-600">
                ${paymentForm.totalAmount.toLocaleString("es-EC")}
              </div>
            </div>

            <form onSubmit={handlePayment}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {paymentLoading ? "Procesando..." : "Registrar Pago"}
                </button>
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ ToastContainer para notificaciones */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

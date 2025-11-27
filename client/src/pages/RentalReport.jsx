import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function RentalReport() {

  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Función de navegación mejorada
  const handleBack = () => {
    console.log("handleBack llamado", { onBack, navigate });
    if (onBack && typeof onBack === "function") {
      console.log("Ejecutando onBack()");
      onBack();
    } else {
      console.log("Ejecutando navigate(/reports)");
      navigate("/reports");
    }
  };

  // Filtros
  const [filters, setFilters] = useState({
    status: "",
    clientId: "",
    startDate: "",
    endDate: "",
  });

  // Paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  // Estadísticas
  const [stats, setStats] = useState({});

  // Cargar alquileres
  const loadRentals = async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(
        `${API_URL}/reports/rentals-history?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok)
        throw new Error("Error al cargar historial de alquileres");

      const data = await response.json();
      setRentals(data.data || []);
      setPagination(data.pagination);
      setStats(data.stats || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar clientes para filtro
  const loadClients = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Error al cargar clientes");

      const data = await response.json();
      setClients(data || []);
    } catch (err) {
      console.error("Error loading clients:", err);
    }
  };

  // Exportar a Excel (como Reports.jsx)
  const exportToExcel = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Construir parámetros con filtros actuales
      const params = new URLSearchParams({
        ...(filters.status && { status: filters.status }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const res = await fetch(
        `${API_URL}/reports/rentals-history/export?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData?.error || "Error al exportar el historial de alquileres"
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `historial-alquileres-${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      setError(error.message || "Error al exportar el archivo Excel");
    }
  }, [filters]);
  // Efectos
  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadRentals(1);
  }, [filters]);

  // Funciones de paginación
  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
    loadRentals(page);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      clientId: "",
      startDate: "",
      endDate: "",
    });
  };

  // Colores para estados
  const getStatusColor = (status) => {
    switch (status) {
      case "RENTED":
        return "bg-blue-100 text-blue-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "RENTED":
        return "Alquilado";
      case "DELIVERED":
        return "Entregado";
      case "OVERDUE":
        return "Atrasado";
      default:
        return status;
    }
  };

  return (
    <div className="p-6">
      {/* Header con botón de volver */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Historial de Alquileres
          </h1>
          <p className="text-gray-600">
            Consulta el historial completo de alquileres de lavadoras
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString("es-ES", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Rentals Info Card */}
      <div className="bg-white p-6 rounded-lg border mb-6">
        <div className="space-y-4">
          <p className="text-gray-600">
            Consulta el historial completo de alquileres de lavadoras con
            filtros avanzados y estadísticas.
          </p>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <div>• Historial completo</div>
              <div>• Filtros por estado/cliente</div>
              <div>• Exportación a CSV</div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">Total Alquileres</div>
          <div className="text-2xl font-bold text-gray-900">
            {Object.values(stats).reduce((sum, stat) => sum + stat.count, 0)}
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Activos</div>
          <div className="text-2xl font-bold text-blue-900">
            {stats.RENTED?.count || 0}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Entregados</div>
          <div className="text-2xl font-bold text-green-900">
            {stats.DELIVERED?.count || 0}
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600">Atrasados</div>
          <div className="text-2xl font-bold text-red-900">
            {stats.OVERDUE?.count || 0}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Filtros</h3>
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 pointer-events-auto"
              style={{ pointerEvents: "auto" }}
            >
              Limpiar
            </button>
            <button
              onClick={exportToExcel}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="RENTED">Alquilado</option>
              <option value="DELIVERED">Entregado</option>
              <option value="OVERDUE">Atrasado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <select
              value={filters.clientId}
              onChange={(e) => handleFilterChange("clientId", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Cargando historial de alquileres...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : rentals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron alquileres con los filtros seleccionados
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lavadora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vendedor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha Alquiler
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Entrega Programada
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Horas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Precio Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rentals.map((rental) => (
                    <tr key={rental.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {rental.client?.nombre || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rental.client?.identificacion || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {rental.washingMachine?.description || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          $
                          {Number(
                            rental.washingMachine?.pricePerHour || 0
                          ).toLocaleString()}
                          /h
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {rental.user?.nombre || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{rental.user?.username || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {format(
                            new Date(rental.rentalDate),
                            "dd/MM/yyyy HH:mm",
                            { locale: es }
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {format(
                            new Date(rental.scheduledReturnDate),
                            "dd/MM/yyyy HH:mm",
                            { locale: es }
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {rental.hoursRented}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          ${Number(rental.rentalPrice).toLocaleString("es-CO")}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            rental.status
                          )}`}
                        >
                          {getStatusText(rental.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando{" "}
                  {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} a{" "}
                  {Math.min(
                    pagination.currentPage * pagination.itemsPerPage,
                    pagination.totalItems
                  )}{" "}
                  de {pagination.totalItems} alquileres
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 pointer-events-auto"
                    style={{ pointerEvents: "auto" }}
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Página {pagination.currentPage} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 pointer-events-auto"
                    style={{ pointerEvents: "auto" }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

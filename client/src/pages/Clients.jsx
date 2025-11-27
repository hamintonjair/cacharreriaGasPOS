import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  User,
  Phone,
  MapPin,
  CreditCard,
} from "lucide-react";
import ModalConfirmacion from "../components/ModalConfirmación";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Clients() {
  const token = localStorage.getItem("auth_token");
  const userStr = localStorage.getItem("auth_user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === "ADMIN";

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    direccion: "",
  });
  const pageSize = 10;

  // Toast helper
  const toast = (message, type = "info", duration = 3000) => {
    window.dispatchEvent(
      new CustomEvent("app:toast", { detail: { message, type, duration } })
    );
  };
  // Después de los estados existentes, agrega:
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  // Load clients
  const loadClients = async () => {
    if (!isAdmin && user?.role !== "VENDEDOR") return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error cargando clientes");
      setClients(data);
    } catch (error) {
      console.error("Error loading clients:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin || user?.role === "VENDEDOR") {
      loadClients();
    }
  }, [isAdmin, user?.role]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError("El nombre del cliente es requerido");
      toast("El nombre del cliente es requerido", "error");
      return;
    }

    const url = editingClient
      ? `${API_URL}/clients/${editingClient.id}`
      : `${API_URL}/clients`;
    const method = editingClient ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error guardando cliente");

      await loadClients();
      setShowModal(false);
      setEditingClient(null);
      setFormData({
        nombre: "",
        identificacion: "",
        telefono: "",
        direccion: "",
      });
      setError("");

      // Toast de éxito
      if (editingClient) {
        toast("Cliente actualizado correctamente", "success");
      } else {
        toast("Cliente creado correctamente", "success");
      }
    } catch (error) {
      console.error("Error saving client:", error);
      setError(error.message);
      toast(error.message || "Error guardando cliente", "error");
    }
  };

  // Handle edit
  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      nombre: client.nombre,
      identificacion: client.identificacion || "",
      telefono: client.telefono || "",
      direccion: client.direccion || "",
    });
    setShowModal(true);
    setError("");
  };

  // Busca la función handleDelete y reemplázala:
  const handleDelete = async (client) => {
    try {
      if (!client) return;
      // Eliminar el confirm() antiguo
      setClientToDelete(client);
      setShowDeleteModal(true);
    } catch (error) {
      toast(error.message || "Error eliminando cliente", "error");
    }
  };

  // Agregar esta nueva función:
  const confirmDelete = async () => {
    try {
      if (!clientToDelete) return;
      const response = await fetch(`${API_URL}/clients/${clientToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error eliminando cliente");
      }

      await loadClients();
      toast("Cliente eliminado correctamente", "success");
      setShowDeleteModal(false);
      setClientToDelete(null);
    } catch (error) {
      toast(error.message || "Error eliminando cliente", "error");
    }
  };
  // Filter and paginate clients
  const filteredClients = clients.filter(
    (client) =>
      client.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (client.identificacion &&
        client.identificacion.toLowerCase().includes(search.toLowerCase())) ||
      (client.telefono &&
        client.telefono.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const pageItems = filteredClients.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  if (!isAdmin && user?.role !== "VENDEDOR") {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-red-600">Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }
  return (
    <section className="relative p-4 border rounded-xl bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Clientes
          </h1>
          <p className="text-gray-600 mt-2">
            Administra el registro de clientes del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar..."
            className="h-10 border rounded-lg px-3"
          />
          <button
            onClick={() => {
              setEditingClient(null);
              setFormData({
                nombre: "",
                identificacion: "",
                telefono: "",
                direccion: "",
              });
              setShowModal(true);
              setError("");
            }}
            className="h-10 px-4 rounded-lg bg-emerald-600 text-white font-semibold"
          >
            Nuevo
          </button>
        </div>
      </div>

      {error && (
        <div
          className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6"
          role="alert"
        >
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="mt-3 overflow-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left border">Cliente</th>
              <th className="p-2 text-left border">Identificación</th>
              <th className="p-2 text-left border">Teléfono</th>
              <th className="p-2 text-left border">Ventas</th>
              <th className="p-2 text-center border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Cargando...</p>
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  {search
                    ? "No se encontraron clientes"
                    : "No hay clientes registrados"}
                </td>
              </tr>
            ) : (
              pageItems.map((client) => (
                <tr key={client.id}>
                  <td className="p-2 border">
                    <div>
                      <div className="font-medium">{client.nombre}</div>
                      <div className="text-xs text-gray-500">
                        ID: {client.id}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 border">
                    {client.identificacion || "N/A"}
                  </td>
                  <td className="p-2 border">{client.telefono || "N/A"}</td>
                  <td className="p-2 border">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                      {client._count?.sales || 0}
                    </span>
                  </td>
                  <td className="p-2 border text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="h-9 px-3 rounded bg-indigo-600 text-white"
                        onClick={() => handleEdit(client)}
                      >
                        📝
                      </button>
                      <button
                        className="h-9 px-3 rounded bg-red-600 text-white"
                        onClick={() => handleDelete(client)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Página {page} de {totalPages} — {filteredClients.length} elementos
        </div>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-9 px-3 border rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-9 px-3 border rounded disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingClient ? "Editar Cliente" : "Añadir Nuevo Cliente"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identificación (Cédula/RUC)
                  </label>
                  <input
                    type="text"
                    value={formData.identificacion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        identificacion: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) =>
                      setFormData({ ...formData, direccion: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                    setFormData({
                      nombre: "",
                      identificacion: "",
                      telefono: "",
                      direccion: "",
                    });
                    setError("");
                  }}
                  className="h-10 px-4 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  {editingClient ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ModalConfirmacion
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setClientToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        message={`¿Está seguro de que desea eliminar al cliente "${clientToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </section>
  );
}

import React, { useEffect, useMemo, useState, useCallback } from "react";
import ModalConfirmacion from "../components/ModalConfirmación";
// Toast helper
const toast = (message, type = "info", duration = 3000) => {
  window.dispatchEvent(
    new CustomEvent("app:toast", { detail: { message, type, duration } })
  );
};

toast.success = (message, duration = 3000) =>
  toast(message, "success", duration);
toast.error = (message, duration = 3000) => toast(message, "error", duration);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "VENDEDOR", label: "Vendedor" },
];

export default function Users() {
  const token = localStorage.getItem("auth_token");
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }),
    [token]
  );

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modal, setModal] = useState({ open: false, mode: null, record: null });
  const [formData, setFormData] = useState({
    nombre: "",
    username: "",
    password: "",
    role: "VENDEDOR",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Después de los estados existentes, agrega:
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/users`);
      url.searchParams.append("page", currentPage);
      url.searchParams.append("limit", itemsPerPage);
      if (searchTerm) {
        url.searchParams.append("search", searchTerm);
      }

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al cargar los usuarios");
      }

      const responseData = await response.json();
      // Asegurarse de que los usuarios sean un array
      const usersData = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData.data)
        ? responseData.data
        : [];

      setUsers(usersData);

      // Actualizar la paginación si está disponible
      if (responseData.pagination) {
        setCurrentPage(responseData.pagination.page);
        // Aquí puedes guardar el total de páginas si lo necesitas
        // setTotalPages(responseData.pagination.totalPages)
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      toast.error(error.message || "Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  }, [headers, currentPage, itemsPerPage, searchTerm]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = "Nombre es requerido";
    if (!formData.username.trim()) errors.username = "Usuario es requerido";
    if (
      (!formData.password && modal.mode === "create") ||
      (formData.password && formData.password.length < 6)
    ) {
      errors.password = "La contraseña debe tener al menos 6 caracteres";
    }
    if (!formData.role) errors.role = "Rol es requerido";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Ensure ID is treated as a string for the URL
      const userId = modal.record?.id ? String(modal.record.id) : "";
      const url =
        modal.mode === "edit"
          ? `${API_URL}/users/${userId}`
          : `${API_URL}/users`;

      const method = modal.mode === "edit" ? "PUT" : "POST";

      // Prepare the request body
      const requestBody = {
        nombre: formData.nombre.trim(),
        username: formData.username.trim().toLowerCase(),
        role: formData.role,
        ...(formData.password && { password: formData.password }),
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError);
        throw new Error("Error al procesar la respuesta del servidor");
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Error al ${
              modal.mode === "edit" ? "actualizar" : "crear"
            } el usuario`
        );
      }

      toast.success(
        `Usuario ${
          modal.mode === "edit" ? "actualizado" : "creado"
        } correctamente`
      );
      loadUsers();
      setModal({ open: false, mode: null, record: null });
      setFormData({ nombre: "", username: "", password: "", role: "VENDEDOR" });
    } catch (error) {
      toast.error(error.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  // REEMPLAZAR la función handleDelete actual:
  const handleDelete = async (user) => {
    try {
      if (!user) return;

      // Evitar eliminar al usuario actual
      const currentUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
      if (user.id === currentUser.id) {
        toast.error("No puedes eliminar tu propio usuario");
        return;
      }

      setUserToDelete(user);
      setShowDeleteModal(true);
    } catch (error) {
      toast.error(error.message || "Error eliminando usuario");
    }
  };

  // AGREGAR esta nueva función:
  const confirmDelete = async () => {
    try {
      if (!userToDelete) return;

      const userId = String(userToDelete.id);
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al eliminar el usuario");
      }

      const result = await response.json();
      toast.success(result.message || "Usuario eliminado correctamente");
      loadUsers();
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      toast.error(
        error.message ||
          "Error al eliminar usuario. " +
            (error.message.includes("asociados")
              ? error.message
              : "Por favor, inténtalo de nuevo.")
      );
    }
  };

  const openModal = (mode, record = null) => {
    setModal({ open: true, mode, record });
    if (mode === "edit" && record) {
      setFormData({
        nombre: record.nombre || "",
        username: record.username || "",
        password: "", // Don't load password for security
        role: record.role || "VENDEDOR",
      });
    } else if (mode === "create") {
      setFormData({
        nombre: "",
        username: "",
        password: "",
        role: "VENDEDOR",
      });
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.nombre?.toLowerCase().includes(term) ||
          user.username?.toLowerCase().includes(term) ||
          user.role?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [users, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const currentItems = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <section className="relative p-4 border rounded-xl bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-2">
            Administra el registro de usuarios del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar..."
            className="h-10 border rounded-lg px-3"
          />
          <button
            onClick={() => openModal("create")}
            className="h-10 px-4 rounded-lg bg-emerald-600 text-white font-semibold"
          >
            Nuevo
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left border">Nombre</th>
              <th className="p-2 text-left border">Usuario</th>
              <th className="p-2 text-left border">Rol</th>
              <th className="p-2 text-center border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Cargando...</p>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  {searchTerm
                    ? "No se encontraron usuarios"
                    : "No hay usuarios registrados"}
                </td>
              </tr>
            ) : (
              currentItems.map((user) => (
                <tr key={user.id}>
                  <td className="p-2 border">
                    <div>
                      <div className="font-medium">{user.nombre}</div>
                      <div className="text-xs text-gray-500">ID: {user.id}</div>
                    </div>
                  </td>
                  <td className="p-2 border">{user.username}</td>
                  <td className="p-2 border">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.role === "ADMIN" ? "Admin" : "Vendedor"}
                    </span>
                  </td>
                  <td className="p-2 border text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="h-9 px-3 rounded bg-indigo-600 text-white"
                        onClick={() => openModal("edit", user)}
                      >
                        📝
                      </button>
                      <button
                        className="h-9 px-3 rounded bg-red-600 text-white"
                        onClick={() => handleDelete(user)}
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
          Página {currentPage} de {totalPages} — {filteredAndSortedUsers.length}{" "}
          elementos
        </div>
        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="h-9 px-3 border rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="h-9 px-3 border rounded disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {modal.open && (modal.mode === "create" || modal.mode === "edit") && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg
                        className="h-6 w-6 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {modal.mode === "create"
                          ? "Nuevo Usuario"
                          : "Editar Usuario"}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label
                            htmlFor="nombre"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Nombre Completo
                          </label>
                          <input
                            type="text"
                            name="nombre"
                            id="nombre"
                            value={formData.nombre}
                            onChange={handleInputChange}
                            className={`mt-1 block w-full border ${
                              formErrors.nombre
                                ? "border-red-500"
                                : "border-gray-300"
                            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm`}
                            placeholder="Ej: Juan Pérez"
                          />
                          {formErrors.nombre && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors.nombre}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="username"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Nombre de Usuario
                          </label>
                          <input
                            type="text"
                            name="username"
                            id="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            className={`mt-1 block w-full border ${
                              formErrors.username
                                ? "border-red-500"
                                : "border-gray-300"
                            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm`}
                            placeholder="Ej: juan.perez"
                          />
                          {formErrors.username && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors.username}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {modal.mode === "create"
                              ? "Contraseña"
                              : "Nueva Contraseña (dejar en blanco para no cambiar)"}
                          </label>
                          <input
                            type="password"
                            name="password"
                            id="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className={`mt-1 block w-full border ${
                              formErrors.password
                                ? "border-red-500"
                                : "border-gray-300"
                            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm`}
                            placeholder={
                              modal.mode === "create"
                                ? "Mínimo 6 caracteres"
                                : "Dejar en blanco para no cambiar"
                            }
                          />
                          {formErrors.password && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors.password}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="role"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Rol
                          </label>
                          <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className={`mt-1 block w-full border ${
                              formErrors.role
                                ? "border-red-500"
                                : "border-gray-300"
                            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm`}
                          >
                            {ROLES.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          {formErrors.role && (
                            <p className="mt-1 text-sm text-red-600">
                              {formErrors.role}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {modal.mode === "create"
                          ? "Creando..."
                          : "Guardando..."}
                      </>
                    ) : modal.mode === "create" ? (
                      "Crear Usuario"
                    ) : (
                      "Guardar Cambios"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setModal({ open: false, mode: null, record: null })
                    }
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmación de Eliminación */}
      <ModalConfirmacion
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        message={`¿Está seguro de que desea eliminar al usuario "${userToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </section>
  );
}

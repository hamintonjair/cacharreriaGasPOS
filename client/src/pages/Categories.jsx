import React, { useEffect, useMemo, useState } from "react";
import ModalConfirmacion from "../components/ModalConfirmación";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Categories() {
  const token = localStorage.getItem("auth_token");
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }),
    [token]
  );

  const [categories, setCategories] = useState([]);
  const [categoriesTotal, setCategoriesTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "nombre", dir: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    record: null,
  });
  const [form, setForm] = useState({ nombre: "" });

  // Después de los estados existentes, agrega:
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  // Toast helper
  const toast = (message, type = "info", duration = 3000) => {
    window.dispatchEvent(
      new CustomEvent("app:toast", { detail: { message, type, duration } })
    );
  };

  const fetchJson = async (url) => {
    const res = await fetch(url, { headers });
    const ct = res.headers.get("content-type") || "";
    let data;
    try {
      data = ct.includes("application/json")
        ? await res.json()
        : await res.text();
    } catch (_) {
      data = await res.text();
    }
    if (!res.ok) {
      const msg =
        typeof data === "string" ? data : data?.error || "Error de servidor";
      throw new Error(msg);
    }
    return data;
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: query,
        orderBy: sort.key,
        orderDir: sort.dir,
      });
      const data = await fetchJson(`${API_URL}/categories?${qs.toString()}`);
      if (Array.isArray(data)) {
        setCategories(data);
        setCategoriesTotal(data.length);
      } else {
        setCategories(data.items || []);
        setCategoriesTotal(Number(data.total || 0));
      }
    } catch (e) {
      setError(e.message);
      toast(e.message || "Error cargando categorías", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, query, sort]);

  const sortBy = (list, { key, dir }) => {
    const sorted = [...list].sort((a, b) => {
      const va = (a[key] ?? "").toString().toLowerCase();
      const vb = (b[key] ?? "").toString().toLowerCase();
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    return dir === "asc" ? sorted : sorted.reverse();
  };

  // Backend ya pagina; usamos los items actuales y mostramos la página actual
  const filtered = categories; // ya viene filtrado por backend
  const sorted = categories; // ya viene ordenado por backend
  const totalPages = Math.max(1, Math.ceil(categoriesTotal / pageSize));
  const pageItems = categories;

  const handleCreate = async () => {
    try {
      if (!form.nombre) throw new Error("Ingresa un nombre");
      const res = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error creando categoría");
      setModal({ open: false, mode: "create", record: null });
      setForm({ nombre: "" });
      await load();
      toast("Categoría creada", "success");
    } catch (e) {
      toast(e.message || "Error creando categoría", "error");
    }
  };

  const handleUpdate = async () => {
    try {
      if (!modal.record) return;
      if (!form.nombre) throw new Error("Ingresa un nombre");
      const res = await fetch(`${API_URL}/categories/${modal.record.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Error actualizando categoría");
      setModal({ open: false, mode: "edit", record: null });
      await load();
      toast("Categoría actualizada", "success");
    } catch (e) {
      toast(e.message || "Error actualizando categoría", "error");
    }
  };

const handleDelete = async (record) => {
  try {
    if (!record) return;
    setCategoryToDelete(record);
    setShowDeleteModal(true);
  } catch (e) {
    toast(e.message || 'Error eliminando categoría', 'error');
  }
};

const confirmDelete = async () => {
  try {
    if (!categoryToDelete) return;
    const res = await fetch(`${API_URL}/categories/${categoryToDelete.id}`, { 
      method: 'DELETE', 
      headers 
    });
    const data = await res.json();
    
    if (!res.ok) {
      // Mostrar el error específico del backend
      throw new Error(data.error || 'Error eliminando categoría');
    }
    
    await load();
    toast('Categoría eliminada', 'success');
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  } catch (e) {
    // El toast ahora mostrará el mensaje amigable del backend
    toast(e.message || 'Error eliminando categoría', 'error');
  }
};

  return (
    <section className="relative p-4 border rounded-xl bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Categorías
          </h1>
          <p className="text-gray-600 mt-2">
            Administra el registro de categorías del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar..."
            className="h-10 border rounded-lg px-3"
          />
          <button
            className="h-10 px-4 rounded-lg bg-emerald-600 text-white font-semibold"
            onClick={() => {
              setModal({ open: true, mode: "create", record: null });
              setForm({ nombre: "" });
            }}
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
              <th className="p-2 text-center border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => (
              <tr key={c.id}>
                <td className="p-2 border">{c.nombre}</td>
                <td className="p-2 border text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="h-9 px-3 rounded bg-indigo-600 text-white"
                      onClick={() => {
                        setModal({ open: true, mode: "edit", record: c });
                        setForm({ nombre: c.nombre });
                      }}
                    >
                      📝{" "}
                    </button>
                    <button
                      className="h-9 px-3 rounded bg-red-600 text-white"
                      onClick={() => handleDelete(c)}
                    >
                      🗑️{" "}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Página {page} de {totalPages} — {categoriesTotal} elementos
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

      {/* Modal Añadir/Editar */}
      {modal.open && modal.mode === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4">
            <div className="text-lg font-bold mb-3">Añadir Categoría</div>
            <input
              className="h-10 border rounded px-3 w-full"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ nombre: e.target.value })}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="h-10 px-4 rounded bg-gray-100"
                onClick={() =>
                  setModal({ open: false, mode: "create", record: null })
                }
              >
                Cancelar
              </button>
              <button
                className="h-10 px-4 rounded bg-gray-900 text-white"
                onClick={handleCreate}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      {modal.open && modal.mode === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4">
            <div className="text-lg font-bold mb-3">Editar Categoría</div>
            <input
              className="h-10 border rounded px-3 w-full"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ nombre: e.target.value })}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="h-10 px-4 rounded bg-gray-100"
                onClick={() =>
                  setModal({ open: false, mode: "edit", record: null })
                }
              >
                Cancelar
              </button>
              <button
                className="h-10 px-4 rounded bg-gray-900 text-white"
                onClick={handleUpdate}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ModalConfirmacion
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Categoría"
        message={`¿Está seguro de que desea eliminar la categoría "${categoryToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </section>
  );
}

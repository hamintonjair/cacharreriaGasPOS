import React from "react";

export default function Layout({
  user,
  isAdmin,
  view,
  setView,
  onLogout,
  children,
}) {
  return (
    <div className="min-h-screen grid grid-cols-12 text-gray-900">
      {/* Sidebar */}
      <aside className="hidden md:block md:col-span-2 bg-gray-900 text-white">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="text-lg font-bold">Menú</div>
          </div>
          <nav className="flex-1 p-3 space-y-2">
            {isAdmin && (
              <button
                onClick={() => setView("DASHBOARD")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "DASHBOARD"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                🏡 Dashboard
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setView("COMPANY")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "COMPANY"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                🏢 Empresa
              </button>
            )}
            <button
              onClick={() => setView("POS")}
              className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                view === "POS"
                  ? "bg-white text-gray-900"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              🛒 Venta / POS
            </button>
            {isAdmin && (
              <button
                onClick={() => setView("REPORTS")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "REPORTS"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                📈 Reportes
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setView("INVENTORY")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "INVENTORY"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                📦 Inventario
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setView("CATEGORIES")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "CATEGORIES"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                📁 Categorías
              </button>
            )}
            {(isAdmin || user?.role === "VENDEDOR") && (
              <button
                onClick={() => setView("CLIENTS")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "CLIENTS"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                👥 Clientes
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setView("USERS")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "USERS"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                👥 Usuarios
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setView("WASHING_MACHINES")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "WASHING_MACHINES"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                🧺 Lavadoras
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setView("ACCOUNTS_RECEIVABLE")}
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "ACCOUNTS_RECEIVABLE"
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                💰 Cuentas por Cobrar
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setView("RENTAL_REPORT")} // <-- CAMBIAR ESTO
                className={`w-full h-12 rounded-lg px-3 text-left font-semibold ${
                  view === "RENTAL_REPORT" // <-- Y ESTO
                    ? "bg-white text-gray-900"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                📊 Historial de Alquileres
              </button>
            )}
          </nav>
          <div className="p-3 border-t border-white/10">
            <button
              onClick={onLogout}
              className="w-full h-12 rounded-lg bg-red-600 hover:bg-red-700 font-semibold"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="col-span-12 md:col-span-10 min-h-screen bg-gray-50">
        {/* Header */}
        <header className="h-16 bg-white border-b px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold">CacharreriaGasPOS</div>
            <div className="hidden md:block text-sm text-gray-500">
              Sesión iniciada como {user?.nombre || user?.username}
            </div>
          </div>
          {/* Mobile menu (simple) */}
          <div className="md:hidden flex items-center gap-2">
            <select
              className="h-10 border rounded-lg px-2"
              value={view}
              onChange={(e) => setView(e.target.value)}
            >
              <option value="POS">Venta / POS</option>
              {isAdmin && <option value="COMPANY">Empresa</option>}
              {isAdmin && <option value="REPORTS">Reportes</option>}
              {isAdmin && <option value="INVENTORY">Inventario</option>}
              {isAdmin && <option value="CATEGORIES">Categorías</option>}
              {isAdmin && <option value="CLIENTS">Clientes</option>}
              {isAdmin && <option value="USERS">Usuarios</option>}
              {isAdmin && <option value="WASHING_MACHINES">Lavadoras</option>}
              {isAdmin && <option value="RENTAL_REPORT">Historial de Alquileres</option>}
            </select>
            <button
              onClick={onLogout}
              className="h-10 px-3 rounded-lg bg-gray-900 text-white"
            >
              Salir
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}

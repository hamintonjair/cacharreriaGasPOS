import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// Card component for report sections
const ReportCard = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 mb-6 ${className}`}>
    <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
    {children}
  </div>
);

// Bar chart component
const BarChart = ({ data, title }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-medium text-gray-800 mb-3">{title}</h3>
    <div className="h-64">
      <Bar 
        data={data} 
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }}
      />
    </div>
  </div>
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Dashboard() {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'ADMIN';

  // Stock state
  const [stock, setStock] = useState({ products: [], gasTypes: [] });
  const [loadingStock, setLoadingStock] = useState(true);
  const [errorStock, setErrorStock] = useState('');
  
  // Summary state
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

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

  // Load stock data
  const loadStock = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingStock(true);
    setErrorStock('');
    try {
      const res = await fetch(`${API_URL}/reports/current-stock`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error loading stock');
      setStock(data);
    } catch (error) {
      console.error('Error loading stock:', error);
      setErrorStock(error.message);
    } finally {
      setLoadingStock(false);
    }
  }, [isAdmin, token]);

  // Validate date range
  const validateDates = useCallback(() => {
    if (!startDate || !endDate) {
      return false;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return false;
    }
    
    return true;
  }, [startDate, endDate]);

  // Load sales summary
  const loadSummary = useCallback(async () => {
    if (!isAdmin) return;
    
    if (!validateDates()) {
      return;
    }
    
    setLoadingSummary(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      
      const res = await fetch(`${API_URL}/reports/summary?${params}`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.error || 'Error al cargar el resumen');
      }
      
      const data = await res.json();
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  }, [isAdmin, startDate, endDate, token, validateDates]);

  // Load initial data
  useEffect(() => {
    if (!isAdmin) return;
    loadStock();
    loadSummary();
  }, [isAdmin, loadStock, loadSummary]);

  // Auto-reload summary when dates change
  useEffect(() => {
    if (!isAdmin || !validateDates()) return;
    loadSummary();
  }, [startDate, endDate, isAdmin, validateDates, loadSummary]);

  // Chart data for gas stock
  const gasStockChartData = useMemo(() => {
    if (!stock.gasTypes?.length) return null;
    
    return {
      labels: stock.gasTypes.map(gas => gas.nombre),
      datasets: [
        {
          label: 'Llenos',
          data: stock.gasTypes.map(gas => gas.stock_llenos || 0),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Vacíos',
          data: stock.gasTypes.map(gas => gas.stock_vacios || 0),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [stock.gasTypes]);

  // Chart data for low stock products
  const lowStockProductsData = useMemo(() => {
    if (!stock.products?.length) return null;
    
    const sortedProducts = [...stock.products]
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 5);
    
    return {
      labels: sortedProducts.map(p => p.nombre),
      datasets: [
        {
          label: 'Stock Actual',
          data: sortedProducts.map(p => p.stock || 0),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [stock.products]);

  // Chart data for payment methods
  const paymentMethodChartData = useMemo(() => {
    if (!summary?.paymentMethods) return null;
    
    return {
      labels: Object.keys(summary.paymentMethods),
      datasets: [
        {
          data: Object.values(summary.paymentMethods),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        }
      ]
    };
  }, [summary?.paymentMethods]);

  // Show loading state
  if (loadingStock) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando dashboard...</p>
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
            Acceso denegado. Solo los administradores pueden ver el dashboard.
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
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Date Filters for Summary */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* Stock Report Section */}
        <ReportCard title="Reporte de Inventario">
          {errorStock ? (
            <div className="text-red-500 text-center py-4">{errorStock}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Stock de Gas</h3>
                {gasStockChartData ? (
                  <BarChart data={gasStockChartData} />
                ) : (
                  <div className="text-center py-8 text-gray-500">No hay datos de stock de gas</div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Productos con Stock Bajo</h3>
                {lowStockProductsData ? (
                  <BarChart data={lowStockProductsData} />
                ) : (
                  <div className="text-center py-8 text-gray-500">No hay productos con bajo stock</div>
                )}
              </div>
            </div>
          )}
        </ReportCard>


        {/* Sales Summary Section */}
        <ReportCard title="Resumen de Ventas">
          {loadingSummary ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando resumen...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Ventas Totales</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {summary?.totalSales ? `$${summary.totalSales.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Productos Vendidos</p>
                  <p className="text-2xl font-bold text-green-800">
                    {summary?.totalItems?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600">Ventas Promedio</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {summary?.averageSale ? `$${summary.averageSale.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-sm text-amber-600">Clientes Atendidos</p>
                  <p className="text-2xl font-bold text-amber-800">
                    {summary?.totalCustomers?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Métodos de Pago</h3>
                  {paymentMethodChartData ? (
                    <div className="p-4 bg-white rounded-lg shadow">
                      <Pie 
                        data={paymentMethodChartData}
                        options={{
                          responsive: true,
                          plugins: { legend: { position: 'bottom' } }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No hay datos de métodos de pago</div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Ventas por Día</h3>
                  {summary?.dailySales ? (
                    <div className="p-4 bg-white rounded-lg shadow">
                      <Bar 
                        data={{
                          labels: Object.keys(summary.dailySales),
                          datasets: [{
                            label: 'Ventas',
                            data: Object.values(summary.dailySales),
                            backgroundColor: 'rgba(79, 70, 229, 0.6)',
                            borderColor: 'rgba(79, 70, 229, 1)',
                            borderWidth: 1,
                          }]
                        }}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true } }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No hay datos de ventas diarias</div>
                  )}
                </div>
              </div>
            </>
          )}
        </ReportCard>
      </div>
    </div>
  );
}

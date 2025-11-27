# CacharreriaGasPOS

Sistema de Punto de Venta (POS) especializado para negocios de gas y cacharrería con gestión completa de inventario, ventas y reportes.

## Características Principales

- 🏪 **Sistema POS completo** para gestión de ventas
- ⛽ **Gestión especializada de gas** con control de cilindros llenos/vacíos
- 📦 **Control de inventario** con alertas de stock mínimo
- 👥 **Gestión de clientes** con historial de compras
- 📊 **Reportes y análisis** con exportación a Excel
- 🔐 **Sistema de usuarios** con roles (ADMIN/VENDEDOR)
- 💳 **Múltiples métodos de pago** (Efectivo, Nequi, Tarjeta, Transferencia)
- 🏭 **Control de envases** (cascos) en transacciones de gas
- ⏰ **Sistema de recordatorios** para pagos y devoluciones
- 🚨 **Alertas visuales** para cuotas vencidas y por vencer
- 💬 **Notificaciones WhatsApp** automáticas
- 🧺 **Gestión de alquileres** de lavadoras con control de tiempo
- 📅 **Sistema de recordatorios** para pagos y devoluciones con notificaciones automáticas
- 📊 **Análisis de ventas** con gráficos y estadísticas

## Arquitectura

### Frontend (`client/`)
- **Tecnología**: React + Vite + Tailwind CSS
- **Componentes**: Layout reutilizable, sistema de notificaciones
- **Páginas**: Dashboard, POS, Inventario, Clientes, Reportes, Usuarios, Categorías, Empresa
- **Gráficos**: Chart.js para visualización de datos
- **Exportación**: xlsx para generación de reportes

### Backend (`server/`)
- **API REST**: Node.js + Express
- **Base de datos**: PostgreSQL con Prisma ORM
- **Autenticación**: JWT con bcryptjs
- **Uploads**: Multer para manejo de archivos
- **Reportes**: exceljs para generación de documentos

## Modelo de Datos

- **User**: Administración de usuarios y roles
- **Client**: Gestión de clientes con identificación
- **Category**: Categorías de productos
- **Product**: Inventario general con control de stock
- **GasType**: Gestión de tipos de gas (cilindros llenos/vacíos)
- **Sale/SaleItem**: Sistema de ventas flexible
- **Company**: Configuración de datos de la empresa

## 🎯 Sistema de Recordatorios y Alertas

### Recordatorios de Pagos (AccountsReceivable)
- ⏰ **Alertas automáticas** 2 días antes del vencimiento de cuotas
- 🚨 **Badges visuales** en tabla de deudas:
  - ⚠️ **Rojo**: Cuotas vencidas
  - ⏰ **Amarillo**: Cuotas por vencer (3 días)
- 💬 **WhatsApp automático** con mensaje personalizado
- ✅ **Marcar como notificado** para gestión de seguimiento

### Recordatorios de Alquileres (WashingMachines)
- 🚚 **Alertas de devolución** 20 minutos antes
- 🔴 **Alquileres vencidos** visibles hasta ser devueltos
- 📱 **Notificaciones WhatsApp** para clientes
- ✅ **Botón "Devuelto"** para actualizar estado automáticamente

### Características Técnicas
- 🔄 **Actualización automática** cada 60 segundos
- 🎨 **Diseño diferenciado** por estado (vencido/próximo)
- 📊 **Dashboard informativo** con estadísticas
- 🔔 **Sistema de notificaciones** integrado

## Requisitos

- Node.js 18+
- PostgreSQL 13+
- Navegador web moderno

## Instalación y Configuración

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd CacharreriaGasPOS
   ```

2. **Configurar variables de entorno**
   ```bash
   cp server/.env.example server/.env
   # Editar server/.env con tus credenciales de base de datos
   ```

3. **Instalar dependencias**
   ```bash
   # Frontend
   cd client && npm install
   
   # Backend
   cd server && npm install
   ```

4. **Configurar base de datos**
   ```bash
   cd server
   npx prisma migrate dev
   npx prisma db seed
   ```

   **📝 Datos iniciales creados automáticamente:**
   - **Usuario Admin**: `admin` / `admin123` (rol: ADMIN)
   - **Cliente Genérico**: "Cliente Genérico" para ventas rápidas
   - **Categorías**: "Cacharrería General" y "Gas"
   - **Tipos de Gas**: Cilindros 10lb, 40lb, 100lb con stock inicial
   - **Productos**: 6 productos de ejemplo en cacharrería

5. **Ejecutar aplicación**
   ```bash
   # Backend (terminal 1)
   cd server && npm run dev
   
   # Frontend (terminal 2)
   cd client && npm run dev
   ```

## Stack Tecnológico

### Frontend
- React 18.3.1
- Vite 5.4.8
- Tailwind CSS 3.4.13
- Chart.js 4.5.1
- Lucide React 0.554.0
- xlsx 0.18.5

### Backend
- Node.js + Express
- Prisma ORM 5.19.2
- PostgreSQL
- JWT + bcryptjs
- Multer 2.0.2
- exceljs 4.4.0

## Scripts Útiles

```bash
# Backend
npm run dev          # Servidor en desarrollo
npm run start        # Servidor en producción
npm run prisma:studio # Interfaz de base de datos
npm run prisma:migrate # Migraciones
npm run seed         # Poblar base de datos

# Frontend
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run preview      # Previsualizar build
```

## Estructura de Archivos

```
CacharreriaGasPOS/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   └── utils/         # Utilidades
│   └── dist/              # Build de producción
├── server/                # Backend Node.js
│   ├── prisma/           # Esquema y migraciones
│   ├── routes/           # Rutas API
│   ├── middleware/       # Middleware personalizado
│   └── public/           # Archivos estáticos
└── respaldo.sql          # Respaldo de base de datos
```

## Funcionalidades del Sistema

### Gestión de Gas
- Control de stock de cilindros llenos y vacíos
- Registro de envases entregados por clientes
- Precios diferenciados para líquido y envase

### Punto de Venta
- Interfaz intuitiva para ventas rápidas
- Soporte para productos y gas en misma venta
- Cálculo automático de totales e impuestos

### Reportes
- Ventas por período
- Análisis de productos más vendidos
- Control de inventario
- Exportación a Excel

## Licencia

Proyecto desarrollado para gestión de negocios de gas y cacharrería.

---

## 🚀 Despliegue en Render

### Requisitos Previos
- Cuenta en [Render](https://render.com/)
- Repositorio en GitHub con el código del proyecto

### Pasos para Despliegue

1. **Preparar el Repositorio**
   ```bash
   git add .
   git commit -m "Configuración para despliegue en Render"
   git push origin main
   ```

2. **Configurar en Render**
   - Ve a [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Render detectará automáticamente el archivo `render.yaml`

3. **Configuración Automática**
   El archivo `render.yaml` creará:
   - **Backend API**: `cacharreriagaspos-api`
   - **Frontend**: `cacharreriagaspos-frontend`  
   - **Base de datos**: `cacharreria-db` (PostgreSQL)

4. **Variables de Entorno**
   Render configurará automáticamente:
   - `DATABASE_URL`: Conexión a PostgreSQL
   - `JWT_SECRET`: Token secreto para autenticación
   - `VITE_API_URL`: URL del backend para el frontend

5. **Health Checks**
   - Backend: `/api/health` endpoint
   - Frontend: Servido como sitio estático

### Estructura de Despliegue

```
Render Services:
├── cacharreriagaspos-api (Node.js)
│   ├── Build: npm install + prisma generate + migrate
│   ├── Start: npm start
│   └── Port: 5000
├── cacharreriagaspos-frontend (Static)
│   ├── Build: npm install + npm run build
│   ├── Publish: dist/
│   └── Routes: API proxy al backend
└── cacharreria-db (PostgreSQL)
    └── Plan: Free (hasta 90 días)
```

### URLs de Producción
Una vez desplegado:
- **Frontend**: `https://cacharreriagaspos-frontend.onrender.com`
- **Backend API**: `https://cacharreriagaspos-api.onrender.com`
- **Base de datos**: Acceso interno desde el backend

### Acceso Inicial
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Notas Importantes
- El plan gratuito de Render tiene límites de uso
- La base de datos free se detiene después de 90 días de inactividad
- Los servicios pueden tardar 30 segundos en iniciarse (cold start)
- Para producción, considera planes pagados para mejor rendimiento

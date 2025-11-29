import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRouter from './routes/api.js'


import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();


// INICIO DE REGISTRO POR DEFAULT //
// Crear usuario admin automáticamente al iniciar
async function ensureAdminUser() {
  try {
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await prisma.user.create({
        data: {
          nombre: 'Administrador',
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log('✅ Usuario admin creado automáticamente');
    }
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error);
  }
}

// Crear vendedor por defecto
async function ensureDefaultSeller() {
  try {
    const sellerExists = await prisma.user.findFirst({
      where: { role: 'VENDEDOR' }
    });

    if (!sellerExists) {
      const hashedPassword = await bcrypt.hash('vendedor123', 10);
      
      await prisma.user.create({
        data: {
          nombre: 'Vendedor Default',
          username: 'vendedor',
          password: hashedPassword,
          role: 'VENDEDOR'
        }
      });
      
      console.log('✅ Vendedor default creado automáticamente');
    }
  } catch (error) {
    console.error('❌ Error creando vendedor default:', error);
  }
}

// Crear cliente genérico
async function ensureGenericClient() {
  try {
    const clientExists = await prisma.client.findFirst({
      where: { nombre: 'Cliente Genérico' }
    });

    if (!clientExists) {
      await prisma.client.create({
        data: {
          nombre: 'Cliente Genérico',
          identificacion: 'N/A',
          telefono: 'N/A',
          direccion: 'N/A'
        }
      });
      
      console.log('✅ Cliente genérico creado automáticamente');
    }
  } catch (error) {
    console.error('❌ Error creando cliente genérico:', error);
  }
}

// Crear categorías por defecto
async function ensureCategories() {
  try {
    const categories = [
      { nombre: 'Cacharrería' },
      { nombre: 'Electrodomésticos' },
      { nombre: 'Hogar' },
      { nombre: 'Limpieza' },
      { nombre: 'Otros' }
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { nombre: category.nombre },
        update: {},
        create: category
      });
    }
    
    console.log('✅ Categorías por defecto creadas');
  } catch (error) {
    console.error('❌ Error creando categorías:', error);
  }
}

// Crear tipos de gas por defecto
async function ensureGasTypes() {
  try {
    const gasTypes = [
      { 
        nombre: 'Cilindro 10lb', 
        stock_llenos: 200, 
        stock_vacios: 50, 
        precio_venta: 15000, 
        precio_envase: 25000 
      },
      { 
        nombre: 'Cilindro 20lb', 
        stock_llenos: 150, 
        stock_vacios: 30, 
        precio_venta: 25000, 
        precio_envase: 40000 
      },
      { 
        nombre: 'Cilindro 40lb', 
        stock_llenos: 100, 
        stock_vacios: 20, 
        precio_venta: 45000, 
        precio_envase: 60000 
      },
      { 
        nombre: 'Balón 5lb', 
        stock_llenos: 25, 
        stock_vacios: 8, 
        precio_venta: 8000, 
        precio_envase: 12000 
      }
    ];

    for (const gasType of gasTypes) {
      await prisma.gasType.upsert({
        where: { nombre: gasType.nombre },
        update: {},
        create: gasType
      });
    }
    
    console.log('✅ Tipos de gas por defecto creados');
  } catch (error) {
    console.error('❌ Error creando tipos de gas:', error);
  }
}

// Crear productos por defecto
async function ensureProducts() {
  try {
    // Obtener la categoría "Cacharrería"
    const category = await prisma.category.findFirst({
      where: { nombre: 'Cacharrería' }
    });

    if (!category) {
      console.error('❌ No se encontró la categoría Cacharrería');
      return;
    }

    const products = [
      { 
        nombre: 'Olla de Aluminio 2L', 
        codigo_barras: '001', 
        precio_venta: 25000, 
        costo: 15000, 
        taxRate: 0,
        stock: 10, 
        stock_minimo: 5,
        categoryId: category.id 
      },
      { 
        nombre: 'Sartén Antiadherente 24cm', 
        codigo_barras: '002', 
        precio_venta: 35000, 
        costo: 20000, 
        taxRate: 0,
        stock: 8, 
        stock_minimo: 3,
        categoryId: category.id 
      },
      { 
        nombre: 'Juego de Cucharas Acero', 
        codigo_barras: '003', 
        precio_venta: 18000, 
        costo: 10000, 
        taxRate: 0,
        stock: 15, 
        stock_minimo: 8,
        categoryId: category.id 
      },
      { 
        nombre: 'Taza Cerámica 300ml', 
        codigo_barras: '004', 
        precio_venta: 8500, 
        costo: 4500, 
        taxRate: 0,
        stock: 20, 
        stock_minimo: 10,
        categoryId: category.id 
      },
      { 
        nombre: 'Plato Hondo Cerámica', 
        codigo_barras: '005', 
        precio_venta: 12000, 
        costo: 7000, 
        taxRate: 0,
        stock: 12, 
        stock_minimo: 6,
        categoryId: category.id 
      }
    ];

    for (const product of products) {
      await prisma.product.upsert({
        where: { codigo_barras: product.codigo_barras },
        update: {},
        create: product
      });
    }
    
    console.log('✅ Productos por defecto creados');
  } catch (error) {
    console.error('❌ Error creando productos:', error);
  }
}

// Crear lavadoras por defecto
async function ensureWashingMachines() {
  try {
    const machines = [
      {
        description: 'Lavadora Samsung 8kg',
        pricePerHour: 5500,
        initialQuantity: 3,
        availableQuantity: 3
      },
      {
        description: 'Lavadora LG 10kg',
        pricePerHour: 8000,
        initialQuantity: 2,
        availableQuantity: 2
      },
      {
        description: 'Lavadora Whirlpool 7kg',
        pricePerHour: 4500,
        initialQuantity: 2,
        availableQuantity: 2
      }
    ];

    for (const machine of machines) {
      const existingMachine = await prisma.washingMachine.findFirst({
        where: { description: machine.description }
      });

      if (!existingMachine) {
        await prisma.washingMachine.create({
          data: machine
        });
      }
    }
    
    console.log('✅ Lavadoras por defecto creadas');
  } catch (error) {
    console.error('❌ Error creando lavadoras:', error);
  }
}

// Crear compañía por defecto
async function ensureCompany() {
  try {
    const companyExists = await prisma.company.findFirst();

    if (!companyExists) {
      await prisma.company.create({
        data: {
          name: 'Cacharrería Gas POS',
          tax_id: '123456789-0',
          address: 'Calle Principal #123',
          phone: '+593 2 123 4567',
          email: 'info@cacharreriagas.com'
        }
      });
      
      console.log('✅ Compañía por defecto creada');
    }
  } catch (error) {
    console.error('❌ Error creando compañía:', error);
  }
}

// Función principal que inicializa todo
async function initializeDefaultData() {
  try {
    console.log('🚀 Inicializando datos por defecto...');
    
    await ensureAdminUser();
    await ensureDefaultSeller();
    await ensureGenericClient();
    await ensureCategories();
    await ensureGasTypes();
    await ensureProducts();
    await ensureWashingMachines();
    await ensureCompany();
    
    console.log('✅ Todos los datos por defecto han sido creados exitosamente');
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Llamar a la función principal
await initializeDefaultData();

// FIN DE REGISTRO POR DEFAULT //

// Llamar antes de iniciar el servidor
await ensureAdminUser();
dotenv.config()

const app = express()

// Configuración CORS
const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174',
    'https://cacharreriagaspos-1.onrender.com',
    'https://cacharreriagaspos-1.onrender.com/'
  ], // URLs permitidas
  credentials: true, // Permite enviar cookies y encabezados de autenticación
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Aplicar CORS con las opciones configuradas
app.use(cors(corsOptions))

// Manejar preflight requests
app.options('*', cors(corsOptions))

// Parsear JSON en el body de las peticiones
app.use(express.json())

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Ruta API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Rutas API
app.use('/api', apiRouter)

// Servir archivos estáticos desde la carpeta public
app.use('/uploads', express.static('public/uploads'))

// Middleware para manejar rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl 
  })
})

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error del servidor:', err.stack)
  
  // Si el error no tiene un código de estado, usar 500 por defecto
  const statusCode = err.status || 500
  
  // Enviar respuesta de error en formato JSON
  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})

// Manejar cierres inesperados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

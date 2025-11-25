import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRouter from './routes/api.js'

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

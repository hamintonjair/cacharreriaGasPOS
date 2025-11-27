import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Usuario ADMIN
  const adminUsername = 'admin'
  const adminPasswordPlain = 'admin123'
  const passwordHash = await bcrypt.hash(adminPasswordPlain, 10)

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      nombre: 'Administrador',
      username: adminUsername,
      password: passwordHash,
      role: 'ADMIN',
    },
  })

  // Cliente Genérico por defecto
  await prisma.client.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Cliente Genérico',
      identificacion: 'N/A',
      telefono: 'N/A',
      direccion: 'N/A',
    },
  })

  // Categorías
  const catCacharreria = await prisma.category.upsert({
    where: { id: 1 },
    update: { nombre: 'Cacharrería General' },
    create: { nombre: 'Cacharrería General' },
  })

  const catGas = await prisma.category.upsert({
    where: { id: 2 },
    update: { nombre: 'Gas' },
    create: { nombre: 'Gas' },
  })

  // Gas Types
  const gasTypesData = [
    { nombre: 'Cilindro 10lb', stock_llenos: 10, precio_venta: '45000', precio_envase: '120000' },
    { nombre: 'Cilindro 40lb', stock_llenos: 10, precio_venta: '150000', precio_envase: '250000' },
    { nombre: 'Cilindro 100lb', stock_llenos: 10, precio_venta: '320000', precio_envase: '400000' },
  ]

  for (const g of gasTypesData) {
    await prisma.gasType.upsert({
      where: { nombre: g.nombre },
      update: {
        stock_llenos: g.stock_llenos,
        precio_venta: g.precio_venta,
        precio_envase: g.precio_envase,
      },
      create: {
        nombre: g.nombre,
        stock_llenos: g.stock_llenos,
        // stock_vacios queda por defecto en 0
        precio_venta: g.precio_venta,
        precio_envase: g.precio_envase,
      },
    })
  }

  // Productos de ejemplo (5) bajo 'Cacharrería General'
  const products = [
    { nombre: 'Detergente 1L', codigo_barras: '770000000001', precio_venta: '8500', costo: '6000', stock: 30, stock_minimo: 5 },
    { nombre: 'Jabón en barra', codigo_barras: '770000000002', precio_venta: '2500', costo: '1500', stock: 100, stock_minimo: 10 },
    { nombre: 'Escoba', codigo_barras: '770000000003', precio_venta: '12000', costo: '8000', stock: 20, stock_minimo: 3 },
    { nombre: 'Trapeador', codigo_barras: '770000000004', precio_venta: '14000', costo: '9000', stock: 15, stock_minimo: 3 },
    { nombre: 'Ambientador', codigo_barras: '770000000005', precio_venta: '7000', costo: '4500', stock: 40, stock_minimo: 5 },
    { nombre: 'Limpieza', codigo_barras: '770000000006', precio_venta: '7000', costo: '4500', stock: 40, stock_minimo: 5 },
    

  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { codigo_barras: p.codigo_barras },
      update: {
        nombre: p.nombre,
        precio_venta: p.precio_venta,
        costo: p.costo,
        stock: p.stock,
        stock_minimo: p.stock_minimo,
        categoryId: catCacharreria.id,
      },
      create: {
        nombre: p.nombre,
        codigo_barras: p.codigo_barras,
        precio_venta: p.precio_venta,
        costo: p.costo,
        stock: p.stock,
        stock_minimo: p.stock_minimo,
        categoryId: catCacharreria.id,
      },
    })
  }

  console.log('Seed completado: admin, categorías, gas types y productos creados.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

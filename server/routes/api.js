import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import auth from "../middleware/auth.js";
import * as XLSX from "xlsx";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const prisma = new PrismaClient();

// Configuración de Multer para subida de logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "logo-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB límite
  },
  fileFilter: function (req, file, cb) {
    // Aceptar solo imágenes
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen"), false);
    }
  },
});

// AUTH: POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res
        .status(400)
        .json({ error: "username y password son requeridos" });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const secret = process.env.JWT_SECRET;
    if (!secret)
      return res.status(500).json({ error: "JWT_SECRET no configurado" });

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn: "8h" }
    );
    return res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error en login" });
  }
});

// PUT /api/gastypes/:id - actualizar tipo de gas (ADMIN)
router.put("/gastypes/:id", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const { nombre, precio_venta, precio_envase, stock_llenos, stock_vacios } =
      req.body || {};
    const updated = await prisma.gasType.update({
      where: { id },
      data: {
        ...(nombre != null ? { nombre } : {}),
        ...(precio_venta != null ? { precio_venta: String(precio_venta) } : {}),
        ...(precio_envase != null
          ? { precio_envase: String(precio_envase) }
          : {}),
        ...(stock_llenos != null ? { stock_llenos: Number(stock_llenos) } : {}),
        ...(stock_vacios != null ? { stock_vacios: Number(stock_vacios) } : {}),
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    if (err.code === "P2025")
      return res.status(404).json({ error: "GasType no encontrado" });
    return res.status(500).json({ error: "Error actualizando tipo de gas" });
  }
});

// DELETE /api/gastypes/:id - eliminar tipo de gas (ADMIN)
router.delete("/gastypes/:id", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const deleted = await prisma.gasType.delete({ where: { id } });
    return res.json({ ok: true, id: deleted.id });
  } catch (err) {
    console.error(err);
    if (err.code === "P2025")
      return res.status(404).json({ error: "GasType no encontrado" });
    return res.status(500).json({ error: "Error eliminando tipo de gas" });
  }
});

// Export Excel of sales with same filters
router.get("/reports/sales/export", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });

    const { start_date, end_date, metodo_pago, userId } = req.query;
    if (!start_date || !end_date)
      return res
        .status(400)
        .json({ error: "start_date y end_date son requeridos (YYYY-MM-DD)" });

    const start = new Date(`${start_date}T00:00:00.000Z`);
    const end = new Date(`${end_date}T23:59:59.999Z`);

    const where = {
      fecha: { gte: start, lte: end },
      ...(metodo_pago ? { metodo_pago: String(metodo_pago) } : {}),
      ...(userId ? { userId: Number(userId) } : {}),
    };

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: {
        user: { select: { id: true, nombre: true, username: true } },
        client: { select: { id: true, nombre: true, identificacion: true } },
        items: {
          include: {
            product: { select: { id: true, nombre: true } },
            gasType: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    // Importar xlsx para generar Excel

    // Formatear fecha para Colombia (DD/MM/YYYY HH:MM:SS)
    const formatDateColombian = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Preparar datos para Excel
    const header = [
      "SALE_ID",
      "FECHA",
      "TOTAL",
      "METODO_PAGO",
      "USUARIO",
      "CLIENTE_NOMBRE",
      "CLIENTE_IDENTIFICACION",
      "NOMBRE_ITEM",
      "TIPO",
      "CANTIDAD",
      "PRECIO_UNIT",
      "SUBTOTAL",
      "RECIBIO_ENVASE",
    ];

    const excelData = [header];

    for (const s of sales) {
      for (const it of s.items) {
        const tipo = it.product ? "PRODUCTO" : "GAS";
        const nombreItem = it.product
          ? it.product.nombre
          : it.gasType?.nombre || "";
        excelData.push([
          s.id, // SALE_ID
          formatDateColombian(s.fecha), // FECHA (DD/MM/YYYY HH:MM:SS)
          Number(s.total) || 0, // TOTAL (número para Excel)
          s.metodo_pago || "", // METODO_PAGO
          s.user?.nombre || s.user?.username || "", // USUARIO
          s.client?.nombre || "SIN CLIENTE", // CLIENTE_NOMBRE
          s.client?.identificacion || "", // CLIENTE_IDENTIFICACION
          nombreItem, // NOMBRE_ITEM
          tipo, // TIPO
          Number(it.cantidad) || 0, // CANTIDAD (número para Excel)
          Number(it.precio_unit) || 0, // PRECIO_UNIT (número para Excel)
          Number(it.subtotal) || 0, // SUBTOTAL (número para Excel)
          it.gasType ? (it.recibio_envase ? "SI" : "NO") : "", // RECIBIO_ENVASE
        ]);
      }
    }

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Ajustar ancho de columnas automáticamente (con seguridad para datos nulos)
    const colWidths = header.map((_, colIndex) => {
      // Calcular ancho máximo para cada columna
      let maxWidth = header[colIndex].length;
      for (let rowIndex = 1; rowIndex < excelData.length; rowIndex++) {
        // Verificar que la fila y columna existan antes de acceder
        if (
          excelData[rowIndex] &&
          excelData[rowIndex][colIndex] !== undefined &&
          excelData[rowIndex][colIndex] !== null
        ) {
          const cellValue = String(excelData[rowIndex][colIndex]);
          maxWidth = Math.max(maxWidth, cellValue.length);
        }
      }
      return { wch: Math.min(maxWidth + 2, 50) }; // Máximo 50 caracteres, mínimo el contenido + 2
    });
    ws["!cols"] = colWidths;

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Enviar archivo Excel
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales_${start_date}_to_${end_date}.xlsx"`
    );
    return res.send(excelBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error exportando CSV de ventas" });
  }
});

// GET /api/products - productos de Cacharrería General (protegido)
router.get("/products", auth, async (req, res) => {
  try {
    // Paginación y filtros
    const page = Number(req.query.page || 0);
    const pageSize = Number(req.query.pageSize || 0);
    const q = String(req.query.q || "").trim();
    const orderBy = String(req.query.orderBy || "nombre");
    const orderDir = String(req.query.orderDir || "asc");
    const categoryIdParam =
      req.query.categoryId !== undefined
        ? String(req.query.categoryId)
        : undefined;

    let where = {};
    if (categoryIdParam === "all") {
      // no category filter
    } else if (categoryIdParam) {
      const catId = Number(categoryIdParam);
      if (!catId) return res.status(400).json({ error: "categoryId inválido" });
      where = { ...where, categoryId: catId };
    } else {
      // Mostrar todos los productos sin filtro de categoría por defecto
      // No aplicamos ningún filtro de categoría cuando no se especifica
    }

    if (q) {
      where = {
        ...where,
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { codigo_barras: { contains: q } },
        ],
      };
    }

    if (page && pageSize) {
      const [items, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { [orderBy]: orderDir === "desc" ? "desc" : "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.product.count({ where }),
      ]);
      return res.json({ items, total });
    } else {
      const items = await prisma.product.findMany({
        where,
        orderBy: { [orderBy]: orderDir === "desc" ? "desc" : "asc" },
      });
      return res.json(items);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo productos" });
  }
});

// GET /api/products/search?q=texto - búsqueda rápida por nombre o código de barras (protegido)
router.get("/products/search", auth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);

    // Buscar en todas las categorías, no solo en 'Cacharrería General'
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { codigo_barras: { contains: q } },
        ],
      },
      orderBy: { nombre: "asc" },
      take: 50,
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en búsqueda de productos" });
  }
});

// POST /api/products - crear producto de cacharrería (protegido)
router.post("/products", auth, async (req, res) => {
  try {
    const {
      nombre,
      codigo_barras,
      precio_venta,
      costo,
      stock = 0,
      stock_minimo = 5,
      categoryId,
    } = req.body || {};
    if (!nombre) return res.status(400).json({ error: "nombre es requerido" });
    if (precio_venta == null || costo == null)
      return res
        .status(400)
        .json({ error: "precio_venta y costo son requeridos" });

    let category = null;
    if (categoryId) {
      category = await prisma.category.findUnique({
        where: { id: Number(categoryId) },
      });
      if (!category)
        return res.status(400).json({ error: "categoryId no válido" });
    } else {
      category = await prisma.category.findFirst({
        where: { nombre: "Cacharrería General" },
      });
      if (!category)
        return res
          .status(400)
          .json({ error: 'Categoría "Cacharrería General" no existe' });
    }

    const created = await prisma.product.create({
      data: {
        nombre,
        codigo_barras: codigo_barras || null,
        precio_venta: String(precio_venta),
        costo: String(costo),
        stock: Number(stock) || 0,
        stock_minimo: Number(stock_minimo) || 5,
        categoryId: category.id,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Duplicado: codigo_barras o nombre ya existe" });
    }
    res.status(500).json({ error: "Error creando producto" });
  }
});

// PUT /api/products/:id - actualizar producto (protegido)
router.put("/products/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const {
      nombre,
      codigo_barras,
      precio_venta,
      costo,
      stock,
      stock_minimo,
      categoryId,
    } = req.body || {};

    let dataUpdate = {
      ...(nombre != null ? { nombre } : {}),
      ...(codigo_barras !== undefined
        ? { codigo_barras: codigo_barras || null }
        : {}),
      ...(precio_venta != null ? { precio_venta: String(precio_venta) } : {}),
      ...(costo != null ? { costo: String(costo) } : {}),
      ...(stock != null ? { stock: Number(stock) } : {}),
      ...(stock_minimo != null ? { stock_minimo: Number(stock_minimo) } : {}),
    };

    if (categoryId !== undefined) {
      if (categoryId === "" || categoryId === null) {
        const defaultCat = await prisma.category.findFirst({
          where: { nombre: "Cacharrería General" },
        });
        if (!defaultCat)
          return res
            .status(400)
            .json({ error: "Categoría por defecto no existe" });
        dataUpdate = { ...dataUpdate, categoryId: defaultCat.id };
      } else {
        const catIdNum = Number(categoryId);
        if (!catIdNum)
          return res.status(400).json({ error: "categoryId no válido" });
        const cat = await prisma.category.findUnique({
          where: { id: catIdNum },
        });
        if (!cat)
          return res.status(400).json({ error: "categoryId no válido" });
        dataUpdate = { ...dataUpdate, categoryId: cat.id };
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: dataUpdate,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    if (err.code === "P2025")
      return res.status(404).json({ error: "Producto no encontrado" });
    if (err.code === "P2002")
      return res
        .status(409)
        .json({ error: "Duplicado: codigo_barras ya existe" });
    res.status(500).json({ error: "Error actualizando producto" });
  }
});

// DELETE /api/products/:id - eliminar producto (protegido)
router.delete("/products/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const deleted = await prisma.product.delete({ where: { id } });
    res.json({ ok: true, id: deleted.id });
  } catch (err) {
    console.error(err);
    if (err.code === "P2025")
      return res.status(404).json({ error: "Producto no encontrado" });
    res.status(500).json({ error: "Error eliminando producto" });
  }
});

// GET /api/gastypes - tipos de cilindros de gas
router.get("/gastypes", async (req, res) => {
  try {
    const page = Number(req.query.page || 0);
    const pageSize = Number(req.query.pageSize || 0);
    const q = String(req.query.q || "").trim();
    const orderBy = String(req.query.orderBy || "nombre");
    const orderDir = String(req.query.orderDir || "asc");

    const where = q ? { nombre: { contains: q, mode: "insensitive" } } : {};

    if (page && pageSize) {
      const [items, total] = await Promise.all([
        prisma.gasType.findMany({
          where,
          orderBy: { [orderBy]: orderDir === "desc" ? "desc" : "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.gasType.count({ where }),
      ]);
      return res.json({ items, total });
    } else {
      const items = await prisma.gasType.findMany({
        where,
        orderBy: { [orderBy]: orderDir === "desc" ? "desc" : "asc" },
      });
      return res.json(items);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo tipos de gas" });
  }
});

// GET /api/categories - listar categorías (ADMIN)
router.get("/categories", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });
    const page = Number(req.query.page || 0);
    const pageSize = Number(req.query.pageSize || 0);
    const q = String(req.query.q || "").trim();
    const orderBy = String(req.query.orderBy || "nombre");
    const orderDir = String(req.query.orderDir || "asc");

    const where = q ? { nombre: { contains: q, mode: "insensitive" } } : {};

    if (page && pageSize) {
      const [items, total] = await Promise.all([
        prisma.category.findMany({
          where,
          orderBy: { [orderBy]: orderDir === "desc" ? "desc" : "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.category.count({ where }),
      ]);
      return res.json({ items, total });
    } else {
      const items = await prisma.category.findMany({
        where,
        orderBy: { [orderBy]: orderDir === "desc" ? "desc" : "asc" },
      });
      return res.json(items);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo categorías" });
  }
});

// POST /api/categories - crear categoría (ADMIN)
router.post("/categories", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });
    const { nombre } = req.body || {};
    if (!nombre) return res.status(400).json({ error: "nombre es requerido" });
    const created = await prisma.category.create({ data: { nombre } });
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    if (err.code === "P2002")
      return res.status(409).json({ error: "Duplicado: nombre ya existe" });
    return res.status(500).json({ error: "Error creando categoría" });
  }
});

// PUT /api/categories/:id - actualizar categoría (ADMIN)
router.put("/categories/:id", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const { nombre } = req.body || {};
    if (!nombre) return res.status(400).json({ error: "nombre es requerido" });
    const updated = await prisma.category.update({
      where: { id },
      data: { nombre },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    if (err.code === "P2025")
      return res.status(404).json({ error: "Categoría no encontrada" });
    if (err.code === "P2002")
      return res.status(409).json({ error: "Duplicado: nombre ya existe" });
    return res.status(500).json({ error: "Error actualizando categoría" });
  }
});

// DELETE /api/categories/:id - eliminar categoría (ADMIN)
router.delete("/categories/:id", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const deleted = await prisma.category.delete({ where: { id } });
    return res.json({ ok: true, id: deleted.id });
  } catch (err) {
    console.error(err);
    if (err.code === "P2025")
      return res.status(404).json({ error: "Categoría no encontrada" });
    return res.status(500).json({ error: "Error eliminando categoría" });
  }
});

// POST /api/gastypes - crear tipo de gas (ADMIN)
router.post("/gastypes", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });
    const {
      nombre,
      precio_venta,
      precio_envase,
      stock_llenos = 0,
      stock_vacios = 0,
    } = req.body || {};
    if (!nombre) return res.status(400).json({ error: "nombre es requerido" });
    if (precio_venta == null || precio_envase == null)
      return res
        .status(400)
        .json({ error: "precio_venta y precio_envase son requeridos" });

    const created = await prisma.gasType.create({
      data: {
        nombre,
        precio_venta: String(precio_venta),
        precio_envase: String(precio_envase),
        stock_llenos: Number(stock_llenos) || 0,
        stock_vacios: Number(stock_vacios) || 0,
      },
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    if (err.code === "P2002")
      return res.status(409).json({ error: "Duplicado: nombre ya existe" });
    return res.status(500).json({ error: "Error creando tipo de gas" });
  }
});

// POST /api/gastypes/update-stock (protegido)
// body: { gasTypeId, vacios_salen, llenos_entran }
router.post("/gastypes/update-stock", auth, async (req, res) => {
  try {
    const { gasTypeId, vacios_salen = 0, llenos_entran = 0 } = req.body || {};
    const id = Number(gasTypeId);
    const vacios = Number(vacios_salen) || 0;
    const llenos = Number(llenos_entran) || 0;
    if (!id) return res.status(400).json({ error: "gasTypeId es requerido" });
    if (vacios < 0 || llenos < 0)
      return res
        .status(400)
        .json({ error: "Cantidades no pueden ser negativas" });

    const gas = await prisma.gasType.findUnique({ where: { id } });
    if (!gas) return res.status(404).json({ error: "GasType no encontrado" });

    const nuevo_vacios = gas.stock_vacios - vacios;
    const nuevo_llenos = gas.stock_llenos + llenos;
    if (nuevo_vacios < 0)
      return res
        .status(400)
        .json({ error: "No hay suficientes envases vacíos para entregar" });

    const updated = await prisma.gasType.update({
      where: { id },
      data: { stock_vacios: nuevo_vacios, stock_llenos: nuevo_llenos },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error actualizando inventario de gas" });
  }
});

// GET /api/users - temporal para verificar admin
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nombre: true, username: true, role: true },
      orderBy: { id: "asc" },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

// POST /api/sales - registrar venta completa (protegido)
// body: { userId, clientId?, metodo_pago, items: [ { productId?, gasTypeId?, cantidad, precio_unit, recibio_envase? } ] }
router.post("/sales", auth, async (req, res) => {
  const { userId, clientId, metodo_pago, items } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId es requerido" });
  if (!metodo_pago)
    return res.status(400).json({ error: "metodo_pago es requerido" });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items es requerido" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Validar usuario
      const user = await tx.user.findUnique({ where: { id: Number(userId) } });
      if (!user) throw { status: 400, message: "Usuario no válido" };

      let total = 0;
      const saleItemsToCreate = [];

      for (const it of items) {
        const cantidad = Number(it.cantidad);
        const precioUnit = String(it.precio_unit);
        const recibioEnvase = Boolean(it.recibio_envase);
        if (!cantidad || cantidad <= 0)
          throw { status: 400, message: "cantidad inválida en item" };
        if (precioUnit == null)
          throw { status: 400, message: "precio_unit es requerido en item" };

        // Subtotal y acumulado
        const subtotal = Number(precioUnit) * cantidad;
        total += subtotal;

        if (it.productId) {
          const product = await tx.product.findUnique({
            where: { id: Number(it.productId) },
          });
          if (!product) throw { status: 400, message: "Producto no existe" };
          const nuevoStock = product.stock - cantidad;
          if (nuevoStock < 0)
            throw {
              status: 400,
              message: `Stock insuficiente para producto ${product.nombre}`,
            };
          await tx.product.update({
            where: { id: product.id },
            data: { stock: nuevoStock },
          });
          saleItemsToCreate.push({
            productId: product.id,
            cantidad,
            precio_unit: String(precioUnit),
            subtotal: String(subtotal.toFixed(2)),
          });
        } else if (it.gasTypeId) {
          const gas = await tx.gasType.findUnique({
            where: { id: Number(it.gasTypeId) },
          });
          if (!gas) throw { status: 400, message: "GasType no existe" };
          const nuevoLlenos = gas.stock_llenos - cantidad;
          if (nuevoLlenos < 0)
            throw {
              status: 400,
              message: `Stock de gas insuficiente para ${gas.nombre}`,
            };
          const nuevoVacios = recibioEnvase
            ? gas.stock_vacios + cantidad
            : gas.stock_vacios;
          await tx.gasType.update({
            where: { id: gas.id },
            data: { stock_llenos: nuevoLlenos, stock_vacios: nuevoVacios },
          });
          saleItemsToCreate.push({
            gasTypeId: gas.id,
            cantidad,
            precio_unit: String(precioUnit),
            subtotal: String(subtotal.toFixed(2)),
            recibio_envase: recibioEnvase,
          });
        } else {
          throw {
            status: 400,
            message: "Cada item debe referenciar productId o gasTypeId",
          };
        }
      }
      // Obtener fecha local en formato YYYY-MM-DD HH:mm:ss
      const now = new Date();
      
      const fechaLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString();

      const sale = await tx.sale.create({
        data: {
          userId: Number(userId),
          clientId: clientId ? Number(clientId) : 1, // Default to client 1 (Cliente Genérico)
          metodo_pago: String(metodo_pago),
          total: String(total.toFixed(2)),
        
          items: { create: saleItemsToCreate },
        },
        include: {
          items: true,
          client: { select: { id: true, nombre: true } },
        },
      });

      return sale;
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    if (err && err.status)
      return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error registrando la venta" });
  }
});

router.get("/users", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ error: "No autorizado" });

    const { page = 1, limit = 10, search = "" } = req.query;
    const pageNumber = Math.max(1, parseInt(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    // Construir el filtro de búsqueda
    const where = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
      ];
    }

    // Obtener usuarios con paginación
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

// POST /api/users - Crear usuario (ADMIN)
router.post("/users", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ error: "No autorizado" });

    const { nombre, username, password, role } = req.body;

    // Validaciones
    if (!nombre || !username || !password || !role) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    if (!["ADMIN", "VENDEDOR"].includes(role)) {
      return res.status(400).json({ error: "Rol no válido" });
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "El nombre de usuario ya está en uso" });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        nombre: nombre.trim(),
        username: username.trim().toLowerCase(),
        password: hashedPassword,
        role: role.toUpperCase(),
      },
      select: {
        id: true,
        nombre: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// PUT /api/users/:id - Actualizar usuario (ADMIN)
router.put("/users/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ error: "No autorizado" });

    const userId = parseInt(req.params.id);
    const { nombre, username, password, role } = req.body;

    // Validaciones
    if (!nombre || !username || !role) {
      return res
        .status(400)
        .json({ error: "Nombre, usuario y rol son requeridos" });
    }

    if (password && password.length < 6) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    if (!["ADMIN", "VENDEDOR"].includes(role)) {
      return res.status(400).json({ error: "Rol no válido" });
    }

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar si el nuevo username ya está en uso por otro usuario
    if (username !== existingUser.username) {
      const usernameExists = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } },
      });
      if (usernameExists) {
        return res
          .status(400)
          .json({ error: "El nombre de usuario ya está en uso" });
      }
    }

    // Datos a actualizar
    const updateData = {
      nombre,
      username,
      role,
      ...(password && { password: await bcrypt.hash(password, 10) }),
    };

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        nombre: updateData.nombre?.trim(),
        username: updateData.username?.trim().toLowerCase(),
        role: updateData.role?.toUpperCase(),
      },
      select: {
        id: true,
        nombre: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// DELETE /api/users/:id - Eliminar usuario (ADMIN)
router.delete("/users/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ error: "No autorizado" });

    const userId = parseInt(req.params.id);

    // No permitir eliminar el propio usuario
    if (req.user.id === userId) {
      return res
        .status(400)
        .json({ error: "No puedes eliminar tu propio usuario" });
    }

    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Eliminar usuario
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);

    // Manejar error de restricción de clave foránea
    if (error.code === "P2003") {
      return res.status(400).json({
        error:
          "No se puede eliminar el usuario porque tiene registros asociados",
      });
    }

    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// ===================== CLIENTES (ADMIN) =====================
router.get("/clients", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    res.json(clients);
  } catch (err) {
    console.error("Error en /clients:", err);
    res.status(500).json({
      error: "Error obteniendo clientes",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.post("/clients", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const { nombre, identificacion, telefono, direccion } = req.body || {};
    if (!nombre) {
      return res
        .status(400)
        .json({ error: "El nombre del cliente es requerido" });
    }

    // Verificar si la identificación ya existe (si se proporciona)
    if (identificacion) {
      const existingClient = await prisma.client.findUnique({
        where: { identificacion },
      });
      if (existingClient) {
        return res
          .status(400)
          .json({ error: "Ya existe un cliente con esa identificación" });
      }
    }

    const client = await prisma.client.create({
      data: {
        nombre,
        identificacion,
        telefono,
        direccion,
      },
    });

    res.status(201).json(client);
  } catch (err) {
    console.error("Error en POST /clients:", err);
    if (err.code === "P2002") {
      return res
        .status(400)
        .json({ error: "La identificación ya está registrada" });
    }
    res.status(500).json({
      error: "Error creando cliente",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.put("/clients/:id", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const { nombre, identificacion, telefono, direccion } = req.body || {};

    // Verificar si el cliente existe
    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    // Verificar si la identificación ya existe en otro cliente (si se proporciona)
    if (identificacion && identificacion !== existingClient.identificacion) {
      const duplicateClient = await prisma.client.findUnique({
        where: { identificacion },
      });
      if (duplicateClient) {
        return res
          .status(400)
          .json({ error: "Ya existe otro cliente con esa identificación" });
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        ...(nombre != null ? { nombre } : {}),
        ...(identificacion != null ? { identificacion } : {}),
        ...(telefono != null ? { telefono } : {}),
        ...(direccion != null ? { direccion } : {}),
      },
    });

    res.json(updatedClient);
  } catch (err) {
    console.error("Error en PUT /clients:", err);
    if (err.code === "P2002") {
      return res
        .status(400)
        .json({ error: "La identificación ya está registrada" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    res.status(500).json({
      error: "Error actualizando cliente",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.delete("/clients/:id", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Verificar si el cliente existe
    const existingClient = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { sales: true } } },
    });
    if (!existingClient) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    // No permitir eliminar si tiene ventas asociadas
    if (existingClient._count.sales > 0) {
      return res.status(400).json({
        error: "No se puede eliminar el cliente porque tiene ventas asociadas",
      });
    }

    await prisma.client.delete({ where: { id } });

    res.json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
    console.error("Error en DELETE /clients:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    res.status(500).json({
      error: "Error eliminando cliente",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

export default router;

// ===================== VENTAS INDIVIDUALES =====================
router.get("/sales/:id", auth, async (req, res) => {
  try {
    const saleId = Number(req.params.id);
    if (isNaN(saleId)) {
      return res.status(400).json({ error: "ID de venta inválido" });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: {
              select: { nombre: true },
            },
            gasType: {
              select: { nombre: true },
            },
          },
        },
        client: {
          select: { id: true, nombre: true, identificacion: true },
        },
        user: {
          select: { id: true, nombre: true },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    // Formatear los datos para compatibilidad con el frontend
    const formattedSale = {
      ...sale,
      cliente: sale.client,
      items: sale.items.map((item) => ({
        ...item,
        nombre: item.product?.nombre || item.gasType?.nombre || "Producto",
        precio_unitario: item.precio_unit,
        subtotal: item.subtotal,
      })),
    };

    res.json(formattedSale);
  } catch (err) {
    console.error("Error obteniendo venta:", err);
    res.status(500).json({
      error: "Error obteniendo venta",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ===================== REPORTES (ADMIN) =====================
router.get("/reports/sales", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const { start_date, end_date, metodo_pago, userId, user_id } = req.query;

    // Validar fechas
    if (!start_date || !end_date) {
      return res.status(400).json({
        error: "Se requieren los parámetros start_date y end_date (YYYY-MM-DD)",
      });
    }

  const start = new Date(`${start_date}T00:00:00.000`)
const end = new Date(`${end_date}T23:59:59.999`)

    // Validar que las fechas sean válidas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: "Formato de fecha inválido. Use YYYY-MM-DD",
      });
    }

    // Validar que la fecha de inicio sea anterior o igual a la de fin
    if (start > end) {
      return res.status(400).json({
        error: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      });
    }

    // Construir objeto de filtro
    const where = {
      fecha: { gte: start, lte: end },
      ...(metodo_pago
        ? { metodo_pago: { equals: String(metodo_pago), mode: "insensitive" } }
        : {}),
      ...(user_id ? { userId: Number(user_id) } : {}),
      ...(userId ? { userId: Number(userId) } : {}),
    };

    // Obtener ventas con sus relaciones
    const sales = await prisma.sale.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
        client: {
          select: {
            id: true,
            nombre: true,
            identificacion: true,
            telefono: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                nombre: true,
                precio_venta: true,
                costo: true,
              },
            },
            gasType: {
              select: {
                id: true,
                nombre: true,
                precio_venta: true,
                precio_envase: true,
              },
            },
          },
        },
      },
    });

    // Formatear la respuesta para el frontend
    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      fecha: sale.fecha.toISOString(),
      fechaFormatted: new Date(sale.fecha).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      total: Number(sale.total || 0).toFixed(2),
      metodo_pago: sale.metodo_pago || "No especificado",
      cliente: {
        id: sale.client?.id,
        nombre: sale.client?.nombre || "Cliente no especificado",
        identificacion: sale.client?.identificacion || "N/A",
        telefono: sale.client?.telefono || "N/A",
      },
      vendedor: {
        id: sale.user?.id,
        nombre: sale.user?.nombre || "Sin nombre",
        username: sale.user?.username || "Sin usuario",
      },
      items: (sale.items || []).map((item) => ({
        id: item.id,
        tipo: item.gasType ? "gas" : "producto",
        nombre:
          item.product?.nombre ||
          item.gasType?.nombre ||
          "Producto desconocido",
        cantidad: Number(item.cantidad || 0),
        precio_unitario: Number(
          item.product?.precio_venta ||
            item.gasType?.precio_venta ||
            item.precio_unitario ||
            0
        ).toFixed(2),
        subtotal: Number(item.subtotal || 0).toFixed(2),
        recibio_envase: item.recibio_envase || false,
      })),
      // Agregar totales para facilitar el frontend
      total_productos: sale.items
        .filter((item) => item.product)
        .reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
        .toFixed(2),
      total_gas: sale.items
        .filter((item) => item.gasType)
        .reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
        .toFixed(2),
      total_envases: sale.items
        .filter((item) => item.gasType && item.recibio_envase)
        .reduce((sum, item) => sum + Number(item.cantidad || 0), 0),
    }));

    res.json(formattedSales);
  } catch (err) {
    console.error("Error en /reports/sales:", err);
    res.status(500).json({
      error: "Error obteniendo reporte de ventas",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.get("/reports/current-stock", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Solo ADMIN" });


    // Obtener todos los productos y filtrar en memoria (método confiable)
    const allProducts = await prisma.product.findMany({
      orderBy: { nombre: "asc" },
    });
    const products = allProducts.filter((p) => p.stock <= p.stock_minimo);

    const gas = await prisma.gasType.findMany({ orderBy: { nombre: "asc" } });

    res.json({ products, gasTypes: gas });
  } catch (err) {
    console.error("Stack trace:", err.stack);
    return res.status(500).json({
      error: "Error obteniendo reporte de stock",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ======= SUMMARY (ADMIN) =======
async function computeSummaryForDateRange(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const sales = await prisma.sale.findMany({
    where: {
      fecha: {
        gte: start,
        lte: end,
      },
    },
    include: {
      user: { select: { id: true, nombre: true, username: true } },
      client: { select: { id: true, nombre: true } },
      items: {
        include: {
          gasType: { select: { id: true, nombre: true } },
          product: { select: { id: true, nombre: true } },
        },
      },
    },
    orderBy: { fecha: "asc" },
  });

  // Ventas Totales
  const totalSales = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);

  // Productos Vendidos (suma de todas las cantidades)
  let totalItems = 0;
  for (const s of sales) {
    for (const it of s.items || []) {
      totalItems += Number(it.cantidad || 0);
    }
  }

  // Venta Promedio
  const averageSale = sales.length > 0 ? totalSales / sales.length : 0;

  // Clientes Atendidos (conteo de clientes únicos)
  const uniqueClients = new Set();
  for (const s of sales) {
    if (s.clientId) {
      uniqueClients.add(s.clientId);
    }
  }
  const totalCustomers = uniqueClients.size;

  const totalesPorMetodo = {};
  for (const s of sales) {
    const m = s.metodo_pago || "Otros";
    totalesPorMetodo[m] = (totalesPorMetodo[m] || 0) + Number(s.total || 0);
  }

  let totalEnvasesRecibidos = 0;
  let totalVentasCacharreria = 0;
  let totalVentasGas = 0;

  for (const s of sales) {
    for (const it of s.items || []) {
      if (it.gasType && it.recibio_envase) {
        totalEnvasesRecibidos += Number(it.cantidad || 0);
      }
      // Acumulados por tipo de ítem
      const sub = Number(it.subtotal || 0);
      if (it.product) totalVentasCacharreria += sub;
      if (it.gasType) totalVentasGas += sub;
    }
  }

  const porVendedorMap = new Map();
  for (const s of sales) {
    const key = s.userId;
    const entry = porVendedorMap.get(key) || {
      userId: s.userId,
      username: s.user?.username || "",
      nombre: s.user?.nombre || "",
      totalVentas: 0,
      montoTotal: 0,
    };
    entry.totalVentas += 1;
    entry.montoTotal += Number(s.total || 0);
    porVendedorMap.set(key, entry);
  }

  const ventasPorVendedor = Array.from(porVendedorMap.values()).sort(
    (a, b) => a.userId - b.userId
  );

  // Agrupar ventas por día para el gráfico
  const ventasPorDia = {};
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split("T")[0];
    ventasPorDia[dateStr] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  for (const sale of sales) {
    const saleDate = new Date(sale.fecha).toISOString().split("T")[0];
    if (ventasPorDia.hasOwnProperty(saleDate)) {
      ventasPorDia[saleDate] += Number(sale.total || 0);
    } else {
      ventasPorDia[saleDate] = Number(sale.total || 0);
    }
  }

  return {
    startDate: startDate,
    endDate: endDate,
    totalSales,
    totalItems,
    averageSale,
    totalCustomers,
    // Nuevos campos para gráficos (formato esperado por frontend)
    paymentMethods: totalesPorMetodo,
    dailySales: ventasPorDia,
    // Mantener compatibilidad con otros campos existentes
    totalBruto: totalSales, // Para compatibilidad, apunta al mismo valor
    totalesPorMetodo,
    totalEnvasesRecibidos,
    totalVentasCacharreria,
    totalVentasGas,
    ventasPorVendedor,
    ventasPorDia,
    cantidadVentas: sales.length,
  };
}

router.get("/reports/summary", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const { date, start_date, end_date } = req.query;

    // Si se proporciona date, usamos ese día
    if (date) {
      const summary = await computeSummaryForDateRange(
        String(date),
        String(date)
      );
      return res.json(summary);
    }

    // Si se proporciona rango de fechas
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res
          .status(400)
          .json({ error: "Formato de fecha inválido. Use YYYY-MM-DD" });
      }

      if (start > end) {
        return res
          .status(400)
          .json({
            error: "La fecha de inicio debe ser anterior a la fecha de fin",
          });
      }

      const summary = await computeSummaryForDateRange(
        start.toISOString().split("T")[0],
        end.toISOString().split("T")[0]
      );
      return res.json(summary);
    }

    return res.status(400).json({
      error:
        "Se requiere date (YYYY-MM-DD) o start_date y end_date (YYYY-MM-DD)",
    });
  } catch (err) {
    console.error("Error en /reports/summary:", err);
    return res.status(500).json({
      error: "Error generando resumen",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.get("/reports/summary/today", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const summary = await computeSummaryForDateRange(dateStr, dateStr);

    return res.json({
      ...summary,
      message: "Resumen del día actual generado correctamente",
    });
  } catch (err) {
    console.error("Error en /reports/summary/today:", err);
    return res.status(500).json({
      error: "Error generando resumen del día actual",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ======= COMPANY MANAGEMENT (ADMIN) =======
router.get("/company", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    let company = await prisma.company.findFirst();

    // Si no existe, crear una entrada por defecto
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: "Mi Empresa",
          tax_id: "0000000000",
          address: "Dirección por defecto",
          phone: "0000000000",
          email: "empresa@ejemplo.com",
        },
      });
    }

    res.json(company);
  } catch (err) {
    console.error("Error getting company:", err);
    res.status(500).json({ error: "Error obteniendo datos de la empresa" });
  }
});

router.put("/company", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const { name, tax_id, address, phone, email, logo_url } = req.body;

    // Validaciones básicas
    if (!name || !tax_id || !address || !phone) {
      return res
        .status(400)
        .json({
          error: "Nombre, RUC/NIT, dirección y teléfono son requeridos",
        });
    }

    // Obtener o crear la empresa
    let company = await prisma.company.findFirst();

    if (company) {
      // Actualizar existente
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          name: name.trim(),
          tax_id: tax_id.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          logo_url: logo_url?.trim() || null,
        },
      });
    } else {
      // Crear nueva
      company = await prisma.company.create({
        data: {
          name: name.trim(),
          tax_id: tax_id.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          logo_url: logo_url?.trim() || null,
        },
      });
    }

    res.json(company);
  } catch (err) {
    console.error("Error updating company:", err);
    res.status(500).json({ error: "Error actualizando datos de la empresa" });
  }
});

// POST /api/company/logo - Subir logo de empresa (ADMIN)
router.post("/company/logo", auth, upload.single("logo"), async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo" });
    }

    // Generar URL pública para el archivo
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Obtener o crear la empresa
    let company = await prisma.company.findFirst();

    if (company) {
      // Actualizar logo_url en empresa existente
      company = await prisma.company.update({
        where: { id: company.id },
        data: { logo_url: logoUrl },
      });
    } else {
      // Crear empresa con logo
      company = await prisma.company.create({
        data: {
          name: "Mi Empresa",
          tax_id: "0000000000",
          address: "Dirección por defecto",
          phone: "0000000000",
          email: "empresa@ejemplo.com",
          logo_url: logoUrl,
        },
      });
    }

    res.json({
      message: "Logo subido correctamente",
      logo_url: logoUrl,
      company,
    });
  } catch (err) {
    console.error("Error uploading logo:", err);
    res.status(500).json({ error: "Error subiendo logo" });
  }
});

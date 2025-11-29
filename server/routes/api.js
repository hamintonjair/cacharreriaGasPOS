import { Router } from "express";
import ExcelJS from "exceljs";
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
      createdAt: { gte: start, lte: end }, // ✅ CORREGIDO
      ...(metodo_pago ? { metodo_pago: String(metodo_pago) } : {}),
      ...(userId ? { userId: Number(userId) } : {}),
    };

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" }, // ✅ CORREGIDO
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
          formatDateColombian(s.createdAt), // FECHA (DD/MM/YYYY HH:MM:SS)
          Number(s.total) || 0, // TOTAL (número para Excel)
          s.paymentMethod || "No especificado", // METODO_PAGO ✅ CORREGIDO
          s.user?.nombre || s.user?.username || "Sin vendedor", // USUARIO ✅ CORREGIDO
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
// GET /api/reports/rentals-history/export - Exportar alquileres a Excel (ADMIN/VENDEDOR)
router.get("/reports/rentals-history/export", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const {
      page = 1,
      limit = 10,
      status,
      clientId,
      startDate,
      endDate,
    } = req.query;

    // Construir filtros
    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (startDate || endDate) {
      where.rentalDate = {};
      if (startDate) where.rentalDate.gte = new Date(startDate);
      if (endDate) where.rentalDate.lte = new Date(endDate + "T23:59:59.999Z");
    }

    // Obtener alquileres con relaciones
    const rentals = await prisma.rental.findMany({
      where,
      include: {
        washingMachine: {
          select: { id: true, description: true, pricePerHour: true },
        },
        client: {
          select: {
            id: true,
            nombre: true,
            identificacion: true,
            telefono: true,
          },
        },
        user: {
          select: { id: true, nombre: true, username: true },
        },
      },
      orderBy: { rentalDate: "desc" },
    });

    // Generar Excel usando la misma lógica que ventas

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Historial de Alquileres");

    // Headers
    worksheet.columns = [
      { header: "ID Alquiler", key: "id", width: 15 },
      { header: "Cliente", key: "clientName", width: 25 },
      { header: "Identificación", key: "clientId", width: 15 },
      { header: "Lavadora", key: "machineDescription", width: 25 },
      { header: "Vendedor", key: "userName", width: 20 },
      { header: "Fecha Alquiler", key: "rentalDate", width: 20 },
      {
        header: "Fecha Entrega Programada",
        key: "scheduledReturnDate",
        width: 20,
      },
      { header: "Horas Alquiladas", key: "hoursRented", width: 15 },
      { header: "Precio Total", key: "rentalPrice", width: 15 },
      { header: "Estado", key: "status", width: 15 },
    ];

    // Data
    rentals.forEach((rental) => {
      worksheet.addRow({
        id: rental.id,
        clientName: rental.client?.nombre || "N/A",
        clientId: rental.client?.identificacion || "N/A",
        machineDescription: rental.washingMachine?.description || "N/A",
        userName: rental.user?.nombre || "N/A",
        rentalDate: new Date(rental.rentalDate).toLocaleString("es-EC"),
        scheduledReturnDate: new Date(
          rental.scheduledReturnDate
        ).toLocaleString("es-EC"),
        hoursRented: rental.hoursRented,
        rentalPrice: rental.rentalPrice,
        status: rental.status,
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6B8" },
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=historial-alquileres-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportando alquileres:", error);
    res.status(500).json({ error: "Error al exportar alquileres" });
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
      taxRate = 0, // Campo opcional con valor por defecto 0
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
        taxRate: String(taxRate || 0), // Nuevo campo taxRate
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
      taxRate, // Nuevo campo taxRate
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
      ...(taxRate !== undefined ? { taxRate: String(taxRate || 0) } : {}), // Nuevo campo taxRate
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
// DELETE /api/products/:id - eliminar producto (protegido)
router.delete("/products/:id", auth, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!productId) return res.status(400).json({ error: "id inválido" });

    // Verificar si hay ventas asociadas
    const salesCount = await prisma.saleItem.count({
      where: { productId },
    });

    if (salesCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar este producto porque está incluido en ${salesCount} venta(s). Una vez vendido, un producto no puede ser eliminado para mantener la integridad de los registros.`,
      });
    }

    const deleted = await prisma.product.delete({ where: { id: productId } });
    res.json({ message: "Producto eliminado correctamente", id: deleted.id });
  } catch (err) {
    console.error("Error en DELETE /products:", err);

    // Manejo específico de foreign key
    if (err.code === "P2003") {
      return res.status(400).json({
        error:
          "No se puede eliminar este producto porque tiene datos asociados. Verifique que no tenga ventas ni otros registros relacionados.",
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.status(500).json({
      error: "Error eliminando producto",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
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
router.delete("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    // Verificar si hay productos asociados
    const productsCount = await prisma.product.count({
      where: { categoryId },
    });

    if (productsCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar esta categoría porque está siendo utilizada por ${productsCount} producto(s). Elimine primero los productos asociados o asígnelos a otra categoría.`,
      });
    }

    await prisma.category.delete({ where: { id: categoryId } });
    res.json({ message: "Categoría eliminada correctamente" });
  } catch (err) {
    console.error("Error en DELETE /categories:", err);

    // Manejo específico de foreign key
    if (err.code === "P2003") {
      return res.status(400).json({
        error:
          "No se puede eliminar esta categoría porque tiene datos asociados. Verifique que no tenga productos ni otros registros relacionados.",
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    res.status(500).json({
      error: "Error eliminando categoría",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
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
// body: { userId, clientId, items: [...], payments: [...], creditInstallments?: [...] }
// POST /api/sales - registrar venta completa (protegido)
// body: { userId, clientId, items: [...], payments: [...], creditInstallments?: [...], subtotalNeto, ivaTotal, total }
router.post("/sales", auth, async (req, res) => {
  const {
    userId,
    clientId,
    items,
    payments,
    creditInstallments,
    total: frontendTotal,
    subtotalNeto: frontendSubtotalNeto, // 🔥 NUEVO
    ivaTotal: frontendIvaTotal, // 🔥 NUEVO
  } = req.body || {};

  if (!userId) return res.status(400).json({ error: "userId es requerido" });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items es requerido" });
  if (!Array.isArray(payments) || payments.length === 0)
    return res.status(400).json({ error: "payments es requerido" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Validar usuario
      const user = await tx.user.findUnique({ where: { id: Number(userId) } });
      if (!user) throw { status: 400, message: "Usuario no válido" };

      // Validar cliente si hay pagos o crédito
      let client = null;
      if (clientId) {
        client = await tx.client.findUnique({
          where: { id: Number(clientId) },
        });
        if (!client) throw { status: 400, message: "Cliente no válido" };
      }

      const saleItemsToCreate = [];

      // 🔥 VARIABLES PARA CÁLCULOS - USAR VALORES DEL FRONTEND SI ESTÁN DISPONIBLES
      let subtotalNeto = 0; // Suma de precios sin IVA
      let ivaTotal = 0; // Suma de todos los IVAs
      let totalVenta = 0; // SubtotalNeto + IvaTotal

      // 🔥 VERIFICAR SI EL FRONTEND ENVÍA LOS VALORES CALCULADOS
      const frontendSubtotalNeto = Number(req.body.subtotalNeto) || 0;
      const frontendIvaTotal = Number(req.body.ivaTotal) || 0;
      const frontendTotalCalculated = Number(req.body.total) || 0;

  

      for (const it of items) {
        const cantidad = Number(it.cantidad);
        const precioUnit = String(it.precio_unit);
        const recibioEnvase = Boolean(it.recibio_envase);
        if (!cantidad || cantidad <= 0)
          throw { status: 400, message: "cantidad inválida en item" };
        if (precioUnit == null)
          throw { status: 400, message: "precio_unit es requerido en item" };

        const subtotal = Number(precioUnit) * cantidad;

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

          // 🔥 USAR VALORES DEL FRONTEND SI ESTÁN DISPONIBLES
          let taxRate, ivaItem, totalItem, subtotalNetoItem;

          if (it.taxRateApplied && it.taxAmount && it.totalProducto) {
            // ✅ USAR VALORES CALCULADOS EN FRONTEND
            taxRate = Number(it.taxRateApplied) || 0;
            ivaItem = Number(it.taxAmount) || 0;
            totalItem = Number(it.totalProducto) || subtotal;
            subtotalNetoItem = totalItem - ivaItem;

          
          } else {
            // ❌ FALLBACK: Calcular en backend (no debería ocurrir)
            taxRate = Number(product.taxRate) || 0;
            subtotalNetoItem = subtotal;
            ivaItem =
              taxRate > 0 ? (subtotalNetoItem / (1 + taxRate)) * taxRate : 0;
            totalItem = subtotalNetoItem;

        
          }

          // Acumular totales de la venta
          subtotalNeto += subtotalNetoItem;
          ivaTotal += ivaItem;
          totalVenta += totalItem;

          saleItemsToCreate.push({
            productId: product.id,
            cantidad,
            precio_unit: String(precioUnit),
            subtotal: String(totalItem.toFixed(2)),
            taxRateApplied: String(taxRate),
            taxAmount: String(ivaItem.toFixed(2)),
          });
        } else if (it.gasTypeId) {
          const gas = await tx.gasType.findUnique({
            where: { id: Number(it.gasTypeId) },
          });
          if (!gas) throw { status: 400, message: "GasType no existe" };

          // 🔥 VALIDACIÓN CRÍTICA: Stock de cilindros vacíos
          if (recibioEnvase && gas.stock_vacios <= 0) {
            throw {
              status: 400,
              message: `No hay stock de cilindros vacíos disponibles para recibir del producto: ${gas.nombre}`,
            };
          }

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

          // Gas está exento de IVA
          const subtotalNetoItem = subtotal;
          const ivaItem = 0;
          const totalItem = subtotal;

          // Acumular totales de la venta
          subtotalNeto += subtotalNetoItem;
          ivaTotal += ivaItem;
          totalVenta += totalItem;

          saleItemsToCreate.push({
            gasTypeId: gas.id,
            cantidad,
            precio_unit: String(precioUnit),
            subtotal: String(totalItem.toFixed(2)),
            taxRateApplied: "0",
            taxAmount: "0",
            recibio_envase: recibioEnvase,
          });
        } else {
          throw {
            status: 400,
            message: "Cada item debe referenciar productId o gasTypeId",
          };
        }
      }

      // 🔥 PRIORIZAR VALORES DEL FRONTEND SI ESTÁN DISPONIBLES
      let finalSubtotalNeto, finalIvaTotal, finalTotal;

      if (frontendSubtotalNeto > 0 || frontendIvaTotal > 0) {
        // ✅ USAR VALORES CALCULADOS EN FRONTEND
        finalSubtotalNeto = frontendSubtotalNeto;
        finalIvaTotal = frontendIvaTotal;
        finalTotal = frontendTotalCalculated;
      } else {
        // ❌ FALLBACK: Usar valores calculados en backend
        finalSubtotalNeto = subtotalNeto;
        finalIvaTotal = ivaTotal;
        finalTotal = totalVenta;
      }

      // ✅ CÁLCULO CORRECTO - Excluir pagos de crédito
      const cashPayments = payments.filter(
        (p) => (p.paymentMethod || p.method) !== "CREDIT"
      );
      const totalPaidCash = cashPayments.reduce((sum, payment) => {
        return sum + Number(payment.amount || 0);
      }, 0);

      // Determinar estado de pago
      let paymentStatus = "PAID";
      if (totalPaidCash === 0) {
        paymentStatus = "PENDING"; // Crédito total
      } else if (totalPaidCash < finalTotal) {
        paymentStatus = "PARTIAL"; // Pago parcial
      }

      // Validar que clientId exista si hay crédito
      if (
        (paymentStatus === "PENDING" || paymentStatus === "PARTIAL") &&
        !clientId
      ) {
        throw {
          status: 400,
          message: "clientId es requerido para ventas a crédito",
        };
      }

      // Validar cuotas si es venta a crédito
      if (
        (paymentStatus === "PENDING" || paymentStatus === "PARTIAL") &&
        creditInstallments &&
        creditInstallments.length > 0
      ) {
        const totalInstallments = creditInstallments.reduce(
          (sum, installment) => sum + Number(installment.amountDue || 0),
          0
        );

        // Buscar el payment CREDIT para obtener el amount correcto (puede incluir interés)
        const creditPayment = payments.find(
          (p) => p.paymentMethod === "CREDIT"
        );
        const expectedInstallmentTotal = creditPayment
          ? Number(creditPayment.amount)
          : finalTotal - totalPaidCash; // ✅ CORRECTO

        if (Math.abs(totalInstallments - expectedInstallmentTotal) > 0.01) {
          throw {
            status: 400,
            message: `El total de cuotas ($${totalInstallments.toFixed(
              2
            )}) no coincide con el saldo pendiente ($${expectedInstallmentTotal.toFixed(
              2
            )})`,
          };
        }
      }

      // Obtener fecha local
      const now = new Date();
      const fechaLocal = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      ).toISOString();

      // 🔥 CÁLCULO CORRECTO DE INTERÉS SOBRE TOTAL CON IVA
      let creditInterestAmount = 0;
      let creditInterestType = null;
      let totalCredito = finalTotal; // Por defecto, sin interés

      if (creditInstallments && creditInstallments.length > 0) {
        const creditPayment = payments.find(
          (p) => p.paymentMethod === "CREDIT"
        );

        if (creditPayment) {
          const interestType = creditPayment.interestType;
          const interestValue = Number(creditPayment.interestValue) || 0;

          // 🔥 CALCULAR INTERÉS SOBRE EL TOTAL CON IVA
          if (interestType === "VALOR") {
            creditInterestAmount = interestValue;
          } else if (interestType === "PORCENTAJE") {
            creditInterestAmount = finalTotal * (interestValue / 100);
          }

          creditInterestType = interestType;
          totalCredito = finalTotal + creditInterestAmount;
        }
      }

      // Crear venta con valores calculados
      const sale = await tx.sale.create({
        data: {
          total: finalTotal, // 🔥 TOTAL CORRECTO CON IVA
          paymentStatus,
          totalPaid: totalPaidCash,
          creditInterestAmount:
            creditInterestAmount > 0
              ? Number(creditInterestAmount.toFixed(2))
              : 0,
          creditInterestType: creditInterestType,
          clientId: Number(clientId),
          userId: Number(userId),
          items: { create: saleItemsToCreate },
        },
        include: {
          items: true,
          client: { select: { id: true, nombre: true } },
          payments: true,
        },
      });

      // Registrar pagos
      const paymentsToCreate = payments.map((payment) => ({
        saleId: sale.id,
        amount: Number(payment.amount),
        paymentMethod: payment.paymentMethod || "CASH",
        date: new Date(),
      }));

      await tx.payment.createMany({
        data: paymentsToCreate,
      });

      // Crear cuotas de crédito si aplica
      if (
        (paymentStatus === "PENDING" || paymentStatus === "PARTIAL") &&
        creditInstallments &&
        creditInstallments.length > 0
      ) {
        await tx.creditInstallment.createMany({
          data: creditInstallments.map((installment, index) => ({
            saleId: sale.id,
            installmentNumber: installment.installmentNumber || index + 1,
            amountDue: String(installment.amountDue),
            dueDate: new Date(installment.dueDate),
            status: "PENDING",
          })),
        });
      }

      // 🔥 NUEVO: Devolver la venta con las cuotas incluidas Y desglose de IVA
      const finalSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              product: { select: { nombre: true, taxRate: true } },
              gasType: { select: { nombre: true } },
            },
          },
          client: { select: { id: true, nombre: true } },
          payments: true,
          creditInstallments: true, // 🔥 Incluir cuotas
          user: { select: { id: true, nombre: true, username: true } },
        },
      });

      // Agregar desglose a la respuesta
      const responseData = {
        ...finalSale,
        // 🔥 USAR VALORES FINALES CORRECTOS
        subtotalNeto: Number(finalSubtotalNeto.toFixed(2)),
        ivaTotal: Number(finalIvaTotal.toFixed(2)),
        totalCredito: Number(totalCredito.toFixed(2)),
        interestInfo: {
          type: creditInterestType,
          amount: Number(creditInterestAmount || 0),
          description:
            creditInterestType === "PORCENTAJE"
              ? `Interés ${creditInterestAmount}%`
              : `Interés $${Number(creditInterestAmount).toLocaleString(
                  "es-EC",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`,
        },
      };

      return responseData;
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

// GET /api/sales/pending-payments - Listar cuentas por cobrar con cuotas (protegido)
router.get("/sales/pending-payments", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      console.log("❌ Acceso denegado - Rol inválido");
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const { page = 1, limit = 50, clientId, startDate, endDate } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    // Construir filtros para ventas con cuotas pendientes
    const where = {
      creditInstallments: {
        some: {
          status: {
            in: ["PENDING", "OVERDUE"],
          },
        },
      },
    };

    if (clientId) {
      where.clientId = Number(clientId);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // Obtener ventas con cuotas pendientes
    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              nombre: true,
              identificacion: true,
              telefono: true,
            },
          },
          user: {
            select: { id: true, nombre: true, username: true },
          },
          creditInstallments: {
            where: {
              status: {
                in: ["PENDING", "OVERDUE"],
              },
            },
            orderBy: {
              dueDate: "asc",
            },
          },
          payments: {
            orderBy: { date: "desc" },
            take: 3,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limitNumber,
      }),
      prisma.sale.count({ where }),
    ]);

    // Formatear respuesta con detalles de cuotas
    const salesWithInstallments = sales.map((sale) => {
      const pendingInstallments = sale.creditInstallments.filter(
        (installment) => installment.status === "PENDING"
      );
      const overdueInstallments = sale.creditInstallments.filter(
        (installment) => installment.status === "OVERDUE"
      );

      const totalPending = pendingInstallments.reduce(
        (sum, installment) => sum + Number(installment.amountDue),
        0
      );
      const totalOverdue = overdueInstallments.reduce(
        (sum, installment) => sum + Number(installment.amountDue),
        0
      );
      const totalDebt = totalPending + totalOverdue;

      return {
        id: sale.id,
        createdAt: sale.createdAt,
        client: sale.client,
        user: sale.user,
        total: Number(sale.total),
        totalPaid: sale.payments
          ? sale.payments
              .filter((payment) => payment.paymentMethod !== "CREDIT")
              .reduce((sum, payment) => sum + Number(payment.amount), 0)
          : 0,

        // Información de cuotas
        creditInstallments: sale.creditInstallments.map((installment) => ({
          id: installment.id,
          installmentNumber: installment.installmentNumber,
          amountDue: Number(installment.amountDue),
          dueDate: installment.dueDate,
          status: installment.status,
          paidAt: installment.paidAt,
        })),

        // Resúmenes
        totalInstallments: sale.creditInstallments.length,
        pendingInstallments: pendingInstallments.length,
        overdueInstallments: overdueInstallments.length,

        // Totales financieros
        totalPendingDebt: totalPending,
        totalOverdueDebt: totalOverdue,
        totalDebt: totalDebt,

        // Pagamentos previos
        paymentsCount: sale.payments?.length || 0,
        lastPayments: sale.payments || [],
      };
    });

    // Calcular estadísticas generales
    const stats = {
      totalSales: sales.length,
      totalDebt: salesWithInstallments.reduce(
        (sum, sale) => sum + sale.totalDebt,
        0
      ),
      totalPendingDebt: salesWithInstallments.reduce(
        (sum, sale) => sum + sale.totalPendingDebt,
        0
      ),
      totalOverdueDebt: salesWithInstallments.reduce(
        (sum, sale) => sum + sale.totalOverdueDebt,
        0
      ),
      pendingInstallments: salesWithInstallments.reduce(
        (sum, sale) => sum + sale.pendingInstallments,
        0
      ),
      overdueInstallments: salesWithInstallments.reduce(
        (sum, sale) => sum + sale.overdueInstallments,
        0
      ),
    };

    console.log("📊 Estadísticas calculadas:", stats);

    const totalPages = Math.ceil(total / limitNumber);

    const response = {
      data: salesWithInstallments,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
      stats,
    };

    console.log("✅ Enviando respuesta exitosa");
    res.json(response);
  } catch (error) {
    // Error específico de Prisma
    if (error.code) {
      console.error("❌ Código de error Prisma:", error.code);
      console.error("❌ Meta de error Prisma:", error.meta);
    }

    res.status(500).json({
      error: "Error obteniendo cuentas por cobrar",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});
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
        payments: true,
        creditInstallments: true, // 🔥 Incluir cuotas de crédito
      },
    });

    if (!sale) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    // ✅ CORRECCIÓN: Usar los valores de taxAmount ya guardados en BD
    // Fórmula correcta:
    // Subtotal Neto Total = Σ(SaleItem.subtotal) - Σ(SaleItem.taxAmount)
    // IVA Total = Σ(SaleItem.taxAmount)
    let subtotalNeto = 0;
    let ivaTotal = 0;
    sale.items.forEach((item) => {
      const subtotal = Number(item.subtotal) || 0;
      const taxAmount = Number(item.taxAmount) || 0;

      subtotalNeto += subtotal - taxAmount;
      ivaTotal += taxAmount;
    });

    console.log("🔍 DESGLOSE CORRECTO DE IVA:", {
      subtotalNeto: subtotalNeto.toFixed(2),
      ivaTotal: ivaTotal.toFixed(2),
      total: (subtotalNeto + ivaTotal).toFixed(2),
      items: sale.items.map((i) => ({
        nombre: i.product?.nombre || i.gasType?.nombre,
        subtotal: i.subtotal,
        taxAmount: i.taxAmount,
      })),
    });

    // Formatear los datos para compatibilidad con el frontend
    const formattedSale = {
      ...sale,
      cliente: sale.client,
      subtotalNeto: Number(subtotalNeto.toFixed(2)), // 🔥 Agregar desglose
      ivaTotal: Number(ivaTotal.toFixed(2)), // 🔥 Agregar desglose
      // 🔥 NUEVO: Total Crédito = Saldo Pendiente + Interés
      totalCredito:
        sale.creditInstallments && sale.creditInstallments.length > 0
          ? sale.creditInstallments.reduce(
              (sum, inst) => sum + Number(inst.amountDue || 0),
              0
            )
          : 0,
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

    const start = new Date(`${start_date}T00:00:00.000`);
    const end = new Date(`${end_date}T23:59:59.999`);

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

    // Construir objeto de filtro - CORREGIDO
    const where = {
      createdAt: { gte: start, lte: end }, // ← Cambiado de 'fecha' a 'createdAt'
      ...(user_id ? { userId: Number(user_id) } : {}),
      ...(userId ? { userId: Number(userId) } : {}),
    };

    // Obtener ventas con sus relaciones - CORREGIDO
    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" }, // ← Cambiado de 'fecha' a 'createdAt'
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
        creditInstallments: true, // 🔥 Incluir cuotas de crédito
        payments: true, // 🔥 Incluir pagos
      },
    });

    // Filtrar por metodo_pago si se proporciona
    let filteredSales = sales;
    if (metodo_pago) {
      filteredSales = sales.filter((sale) =>
        sale.payments.some(
          (p) => p.paymentMethod.toLowerCase() === metodo_pago.toLowerCase()
        )
      );
    }

    // Formatear la respuesta para el frontend - CORREGIDO
    const formattedSales = filteredSales.map((sale) => {
      // ✅ CORRECCIÓN: Usar los valores de taxAmount ya guardados en BD
      let subtotalNeto = 0;
      let ivaTotal = 0;
      sale.items.forEach((item) => {
        const subtotal = Number(item.subtotal) || 0;
        const taxAmount = Number(item.taxAmount) || 0;

        subtotalNeto += subtotal - taxAmount;
        ivaTotal += taxAmount;
      });

      // Obtener métodos de pago de la venta
      const paymentMethods = sale.payments
        .map((p) => p.paymentMethod)
        .filter((v, i, a) => a.indexOf(v) === i);

      return {
        id: sale.id,
        fecha: sale.createdAt.toISOString(),
        fechaFormatted: new Date(sale.createdAt).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        paymentStatus: sale.paymentStatus,
        total: Number(sale.total || 0).toFixed(2),
        subtotalNeto: Number(subtotalNeto.toFixed(2)),
        ivaTotal: Number(ivaTotal.toFixed(2)),
        metodo_pago: paymentMethods.join(", ") || "No especificado",
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
          taxRateApplied: Number(item.taxRateApplied || 0),
          taxAmount: Number(item.taxAmount || 0),
          recibio_envase: item.recibio_envase || false,
        })),
        creditInstallments: (sale.creditInstallments || []).map((inst) => ({
          installmentNumber: inst.installmentNumber,
          amountDue: Number(inst.amountDue).toFixed(2),
          dueDate: inst.dueDate.toISOString().split("T")[0],
          status: inst.status,
        })),
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
      };
    });

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
  try {
    const start = new Date(`${startDate}T00:00:00.000`);
    const end = new Date(`${endDate}T23:59:59.999`);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end }, // ← Cambiado de 'fecha' a 'createdAt'
      },
      include: {
        user: {
          select: { id: true, nombre: true, username: true },
        },
        client: {
          select: { id: true, nombre: true },
        },
        items: {
          include: {
            gasType: {
              select: { id: true, nombre: true },
            },
            product: {
              select: { id: true, nombre: true },
            },
          },
        },
        payments: true, // 🔥 NUEVO: Incluir pagos para obtener métodos de pago
      },
      orderBy: { createdAt: "asc" }, // ← Cambiado de 'fecha' a 'createdAt'
    });

    // Calcular totales generales
    const totalSales = sales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0
    );
    const totalItems = sales.reduce(
      (sum, sale) => sum + (sale.items?.length || 0),
      0
    );
    const averageSale = sales.length > 0 ? totalSales / sales.length : 0;
    const totalCustomers = new Set(sales.map((sale) => sale.clientId)).size;

    // Agrupar por método de pago
    const totalesPorMetodo = sales.reduce((acc, sale) => {
      const metodos = sale.payments
        ?.map((p) => p.paymentMethod)
        .filter((v, i, a) => a.indexOf(v) === i) || ["No especificado"];
      const metodo = metodos.join(", ");
      acc[metodo] = (acc[metodo] || 0) + Number(sale.total || 0);
      return acc;
    }, {});

    // Agrupar ventas por día
    const ventasPorDia = sales.reduce((acc, sale) => {
      const dia = new Date(sale.createdAt).toISOString().split("T")[0]; // ← Cambiado de 'fecha' a 'createdAt'
      if (!acc[dia]) {
        acc[dia] = { count: 0, total: 0 };
      }
      acc[dia].count++;
      acc[dia].total += Number(sale.total || 0);
      return acc;
    }, {});

    // Agrupar por vendedor
    const ventasPorVendedor = sales.reduce((acc, sale) => {
      const vendedor = sale.user?.nombre || "Desconocido";
      if (!acc[vendedor]) {
        acc[vendedor] = { count: 0, total: 0 };
      }
      acc[vendedor].count++;
      acc[vendedor].total += Number(sale.total || 0);
      return acc;
    }, {});

    // Separar ventas por tipo
    const ventasPorTipo = sales.reduce(
      (acc, sale) => {
        const ventasGas = sale.items?.filter((item) => item.gasType) || [];
        const ventasProductos =
          sale.items?.filter((item) => item.product) || [];

        acc.totalVentasGas += ventasGas.reduce(
          (sum, item) => sum + Number(item.subtotal || 0),
          0
        );
        acc.totalVentasCacharreria += ventasProductos.reduce(
          (sum, item) => sum + Number(item.subtotal || 0),
          0
        );
        acc.totalEnvasesRecibidos += ventasGas
          .filter((item) => item.recibio_envase)
          .reduce((sum, item) => sum + Number(item.cantidad || 0), 0);

        return acc;
      },
      { totalVentasGas: 0, totalVentasCacharreria: 0, totalEnvasesRecibidos: 0 }
    );

    // Formatear ventas por día para el frontend
    const dailySales = Object.entries(ventasPorDia).map(([date, data]) => ({
      date,
      sales: data.count,
      total: data.total,
    }));

    return {
      totalSales,
      totalItems,
      averageSale,
      totalCustomers,
      // Nuevos campos para gráficos (formato esperado por frontend)
      paymentMethods: totalesPorMetodo,
      dailySales,
      // Mantener compatibilidad con otros campos existentes
      totalBruto: totalSales, // Para compatibilidad, apunta al mismo valor
      totalesPorMetodo,
      totalEnvasesRecibidos: ventasPorTipo.totalEnvasesRecibidos,
      totalVentasCacharreria: ventasPorTipo.totalVentasCacharreria,
      totalVentasGas: ventasPorTipo.totalVentasGas,
      ventasPorVendedor,
      ventasPorDia,
      cantidadVentas: sales.length,
    };
  } catch (error) {
    console.error("Error en computeSummaryForDateRange:", error);
    throw error;
  }
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
        return res.status(400).json({
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
      return res.status(400).json({
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

// ===================== LAVADORAS (WASHING MACHINES) =====================

// GET /api/washing-machines - Listar lavadoras (ADMIN)
router.get("/washing-machines", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const { page = 1, limit = 10, search = "" } = req.query;
    const pageNumber = Math.max(1, parseInt(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    // Construir filtro de búsqueda
    const where = {};
    if (search) {
      where.OR = [{ description: { contains: search, mode: "insensitive" } }];
    }

    // Obtener lavadoras con paginación
    const [machines, total] = await Promise.all([
      prisma.washingMachine.findMany({
        where,
        select: {
          id: true,
          description: true,
          pricePerHour: true,
          initialQuantity: true,
          availableQuantity: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { rentals: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
      }),
      prisma.washingMachine.count({ where }),
    ]);

    res.json({
      data: machines,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error al obtener lavadoras:", error);
    res.status(500).json({ error: "Error al obtener las lavadoras" });
  }
});

// POST /api/washing-machines - Crear lavadora (ADMIN)
router.post("/washing-machines", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const { description, pricePerHour, initialQuantity = 1 } = req.body;

    // Validaciones
    if (!description) {
      return res.status(400).json({ error: "La descripción es requerida" });
    }
    if (pricePerHour == null || pricePerHour <= 0) {
      return res
        .status(400)
        .json({ error: "El precio por hora debe ser mayor a 0" });
    }
    if (initialQuantity <= 0) {
      return res
        .status(400)
        .json({ error: "La cantidad inicial debe ser mayor a 0" });
    }

    // Verificar si ya existe una lavadora con esa descripción
    const existingMachine = await prisma.washingMachine.findFirst({
      where: { description: { equals: description, mode: "insensitive" } },
    });
    if (existingMachine) {
      return res
        .status(400)
        .json({ error: "Ya existe una lavadora con esa descripción" });
    }

    // Crear lavadora
    const machine = await prisma.washingMachine.create({
      data: {
        description: description.trim(),
        pricePerHour: String(pricePerHour),
        initialQuantity: Number(initialQuantity),
        availableQuantity: Number(initialQuantity),
      },
      select: {
        id: true,
        description: true,
        pricePerHour: true,
        initialQuantity: true,
        availableQuantity: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(machine);
  } catch (error) {
    console.error("Error al crear lavadora:", error);
    res.status(500).json({ error: "Error al crear la lavadora" });
  }
});

// PUT /api/washing-machines/:id - Actualizar lavadora (ADMIN)
router.put("/washing-machines/:id", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const machineId = parseInt(req.params.id);
    const { description, pricePerHour, initialQuantity } = req.body;

    // Validaciones
    if (!machineId || isNaN(machineId)) {
      return res.status(400).json({ error: "ID de lavadora inválido" });
    }
    if (!description) {
      return res.status(400).json({ error: "La descripción es requerida" });
    }
    if (pricePerHour != null && pricePerHour <= 0) {
      return res
        .status(400)
        .json({ error: "El precio por hora debe ser mayor a 0" });
    }
    if (initialQuantity != null && initialQuantity <= 0) {
      return res
        .status(400)
        .json({ error: "La cantidad inicial debe ser mayor a 0" });
    }

    // Verificar si la lavadora existe
    const existingMachine = await prisma.washingMachine.findUnique({
      where: { id: machineId },
    });
    if (!existingMachine) {
      return res.status(404).json({ error: "Lavadora no encontrada" });
    }

    // Verificar si la nueva descripción ya existe en otra lavadora
    if (description !== existingMachine.description) {
      const duplicateMachine = await prisma.washingMachine.findFirst({
        where: {
          description: { equals: description, mode: "insensitive" },
          NOT: { id: machineId },
        },
      });
      if (duplicateMachine) {
        return res
          .status(400)
          .json({ error: "Ya existe otra lavadora con esa descripción" });
      }
    }

    // Calcular nueva cantidad disponible si cambia la inicial
    let availableQuantity = existingMachine.availableQuantity;
    if (
      initialQuantity != null &&
      initialQuantity !== existingMachine.initialQuantity
    ) {
      const difference = initialQuantity - existingMachine.initialQuantity;
      availableQuantity = Math.max(
        0,
        existingMachine.availableQuantity + difference
      );
    }

    // Actualizar lavadora
    const updatedMachine = await prisma.washingMachine.update({
      where: { id: machineId },
      data: {
        description: description.trim(),
        ...(pricePerHour != null ? { pricePerHour: String(pricePerHour) } : {}),
        ...(initialQuantity != null
          ? { initialQuantity: Number(initialQuantity) }
          : {}),
        availableQuantity,
      },
      select: {
        id: true,
        description: true,
        pricePerHour: true,
        initialQuantity: true,
        availableQuantity: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedMachine);
  } catch (error) {
    console.error("Error al actualizar lavadora:", error);
    res.status(500).json({ error: "Error al actualizar la lavadora" });
  }
});

// DELETE /api/washing-machines/:id - Eliminar lavadora (ADMIN)
router.delete("/washing-machines/:id", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const machineId = parseInt(req.params.id);
    if (!machineId || isNaN(machineId)) {
      return res.status(400).json({ error: "ID de lavadora inválido" });
    }

    // Verificar si la lavadora existe
    const machine = await prisma.washingMachine.findUnique({
      where: { id: machineId },
      include: { _count: { select: { rentals: true } } },
    });
    if (!machine) {
      return res.status(404).json({ error: "Lavadora no encontrada" });
    }

    // No permitir eliminar si tiene alquileres activos
    if (machine.availableQuantity < machine.initialQuantity) {
      return res.status(400).json({
        error:
          "No se puede eliminar la lavadora porque tiene alquileres activos",
      });
    }

    // Eliminar lavadora
    await prisma.washingMachine.delete({ where: { id: machineId } });

    res.json({ message: "Lavadora eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar lavadora:", error);
    res.status(500).json({ error: "Error al eliminar la lavadora" });
  }
});

// ===================== ALQUILERES (RENTALS) =====================

// GET /api/rentals - Listar alquileres (ADMIN)
router.get("/rentals", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const { page = 1, limit = 10, status, clientId } = req.query;
    const pageNumber = Math.max(1, parseInt(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    // Construir filtro
    const where = {};
    if (status) {
      where.status = status;
    }
    if (clientId) {
      where.clientId = Number(clientId);
    }

    // Obtener alquileres con relaciones
    const [rentals, total] = await Promise.all([
      prisma.rental.findMany({
        where,
        include: {
          washingMachine: {
            select: { id: true, description: true, pricePerHour: true },
          },
          client: {
            select: {
              id: true,
              nombre: true,
              identificacion: true,
              telefono: true,
            },
          },
          user: {
            select: { id: true, nombre: true, username: true },
          },
        },
        orderBy: { rentalDate: "desc" },
        skip,
        take: limitNumber,
      }),
      prisma.rental.count({ where }),
    ]);

    res.json({
      data: rentals,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error al obtener alquileres:", error);
    res.status(500).json({ error: "Error al obtener los alquileres" });
  }
});

// POST /api/rentals - Crear alquiler (ADMIN/VENDEDOR)
router.post("/rentals", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Solo ADMIN o VENDEDOR" });
    }

    const {
      washingMachineId,
      clientId,
      hoursRented = 1,
      scheduledReturnDate,
      notes,
      totalPrice, // 🔥 NUEVO: Recibir totalPrice del frontend
      rentalType, // 🔥 NUEVO: Recibir rentalType
      overnightAdditionalPrice, // 🔥 NUEVO: Recibir precio adicional
      baseHourlyPrice, // 🔥 NUEVO: Recibir precio base
    } = req.body;

    // Validaciones
    if (!washingMachineId || !clientId || !scheduledReturnDate) {
      return res.status(400).json({
        error:
          "washingMachineId, clientId y scheduledReturnDate son requeridos",
      });
    }

    if (hoursRented <= 0) {
      return res
        .status(400)
        .json({ error: "Las horas alquiladas deben ser mayor a 0" });
    }

    // Verificar que la lavadora existe y está disponible
    const machine = await prisma.washingMachine.findUnique({
      where: { id: Number(washingMachineId) },
    });
    if (!machine) {
      return res.status(404).json({ error: "Lavadora no encontrada" });
    }
    if (machine.availableQuantity <= 0) {
      return res
        .status(400)
        .json({ error: "No hay lavadoras disponibles de este modelo" });
    }

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: Number(clientId) },
    });
    if (!client) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    // Validar fecha de devolución programada
    const returnDate = new Date(scheduledReturnDate);
    const now = new Date();
    if (returnDate <= now) {
      return res
        .status(400)
        .json({ error: "La fecha de devolución debe ser futura" });
    }

    // Calcular precio total
    // 🔥 CORRECCIÓN: Usar totalPrice del frontend si está disponible, sino calcular por defecto
    let rentalPrice;
    if (totalPrice && rentalType === 'OVERNIGHT') {
      // Para OVERNIGHT, usar el precio enviado desde frontend
      rentalPrice = Number(totalPrice);
    } else {
      // Para HOUR o si no se envía totalPrice, calcular como antes
      rentalPrice = Number(machine.pricePerHour) * hoursRented;
    }

    // Crear alquiler en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Reducir cantidad disponible
      await tx.washingMachine.update({
        where: { id: Number(washingMachineId) },
        data: { availableQuantity: { decrement: 1 } },
      });

      // Crear alquiler
      const rental = await tx.rental.create({
        data: {
          washingMachineId: Number(washingMachineId),
          clientId: Number(clientId),
          rentalPrice: String(rentalPrice),
          rentalDate: new Date(),
          scheduledReturnDate: returnDate,
          status: "RENTED",
          userId: req.user.id,
          hoursRented: Number(hoursRented),
          notes: notes?.trim() || null,
          // 🔥 NUEVO: Guardar campos adicionales para alquiler por amanecida
          ...(rentalType && { rentalType }),
          ...(overnightAdditionalPrice && { overnightAdditionalPrice: String(overnightAdditionalPrice) }),
          ...(baseHourlyPrice && { baseHourlyPrice: String(baseHourlyPrice) }),
        },
      });

      // Obtener alquiler con relaciones para la respuesta
      const rentalWithRelations = await tx.rental.findUnique({
        where: { id: rental.id },
        include: {
          washingMachine: {
            select: { id: true, description: true, pricePerHour: true },
          },
          client: {
            select: {
              id: true,
              nombre: true,
              identificacion: true,
              telefono: true,
            },
          },
          user: {
            select: { id: true, nombre: true, username: true },
          },
        },
      });

      return rentalWithRelations;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error al crear alquiler:", error);
    res.status(500).json({ error: "Error al crear el alquiler" });
  }
});

// PUT /api/rentals/:id/deliver - Marcar como entregado (ADMIN/VENDEDOR)
router.put("/rentals/:id/deliver", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Solo ADMIN o VENDEDOR" });
    }

    const rentalId = parseInt(req.params.id);
    if (!rentalId || isNaN(rentalId)) {
      return res.status(400).json({ error: "ID de alquiler inválido" });
    }

    // Verificar que el alquiler existe y está en estado RENTED
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        washingMachine: { select: { id: true, description: true } },
      },
    });
    if (!rental) {
      return res.status(404).json({ error: "Alquiler no encontrado" });
    }
    if (rental.status !== "RENTED") {
      return res
        .status(400)
        .json({ error: "El alquiler ya fue entregado o cancelado" });
    }

    // Actualizar en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Marcar alquiler como entregado
      const updatedRental = await tx.rental.update({
        where: { id: rentalId },
        data: {
          status: "DELIVERED",
          actualReturnDate: new Date(),
        },
        include: {
          washingMachine: {
            select: { id: true, description: true, pricePerHour: true },
          },
          client: {
            select: {
              id: true,
              nombre: true,
              identificacion: true,
              telefono: true,
            },
          },
          user: {
            select: { id: true, nombre: true, username: true },
          },
        },
      });

      // Aumentar cantidad disponible de lavadora
      await tx.washingMachine.update({
        where: { id: rental.washingMachineId },
        data: { availableQuantity: { increment: 1 } },
      });

      return updatedRental;
    });

    res.json(result);
  } catch (error) {
    console.error("Error al entregar alquiler:", error);
    res.status(500).json({ error: "Error al entregar el alquiler" });
  }
});

// GET /api/rentals/overdue - Listar alquileres atrasados (ADMIN)
router.get("/rentals/overdue", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const now = new Date();

    // Obtener alquileres atrasados
    const overdueRentals = await prisma.rental.findMany({
      where: {
        status: "RENTED",
        scheduledReturnDate: { lt: now },
      },
      include: {
        washingMachine: {
          select: { id: true, description: true, pricePerHour: true },
        },
        client: {
          select: {
            id: true,
            nombre: true,
            identificacion: true,
            telefono: true,
          },
        },
        user: {
          select: { id: true, nombre: true, username: true },
        },
      },
      orderBy: { scheduledReturnDate: "asc" },
    });

    // Actualizar estado a OVERDUE
    await prisma.rental.updateMany({
      where: {
        status: "RENTED",
        scheduledReturnDate: { lt: now },
      },
      data: { status: "OVERDUE" },
    });

    res.json({
      overdueRentals,
      count: overdueRentals.length,
    });
  } catch (error) {
    console.error("Error al obtener alquileres atrasados:", error);
    res.status(500).json({ error: "Error al obtener alquileres atrasados" });
  }
});

// GET /api/rentals/reminders - Alquileres próximos a vencer (20 minutos) (ADMIN)
router.get("/rentals/reminders", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Solo ADMIN" });
    }

    const now = new Date();
    const in20Minutes = new Date(now.getTime() + 20 * 60 * 1000);

    // ✅ Obtener alquileres próximos Y vencidos
    const rentals = await prisma.rental.findMany({
      where: {
        status: "RENTED",
        OR: [
          // ✅ Alquileres próximos (20 minutos antes)
          {
            scheduledReturnDate: {
              gte: now,
              lte: in20Minutes,
            },
          },
          // ✅ Alquileres VENCIDOS (hora ya pasó)
          {
            scheduledReturnDate: {
              lt: now, // Menor que ahora = vencido
            },
          },
        ],
      },
      include: {
        washingMachine: {
          select: { id: true, description: true, pricePerHour: true },
        },
        client: {
          select: {
            id: true,
            nombre: true,
            identificacion: true,
            telefono: true,
          },
        },
        user: {
          select: { id: true, nombre: true, username: true },
        },
      },
      orderBy: { scheduledReturnDate: "asc" },
    });

    // ✅ Clasificar por estado
    const classified = rentals.map((rental) => ({
      ...rental,
      urgency:
        new Date(rental.scheduledReturnDate) < now ? "OVERDUE" : "PENDING",
      statusText:
        new Date(rental.scheduledReturnDate) < now
          ? "ALQUILER VENCIDO"
          : "POR VENCER",
    }));

    const upcomingRentals = classified.filter((r) => r.urgency === "PENDING");
    const overdueRentals = classified.filter((r) => r.urgency === "OVERDUE");

    res.json({
      rentals: classified, // Todos los alquileres
      upcomingRentals, // Solo próximos
      overdueRentals, // Solo vencidos
      count: classified.length,
      upcomingCount: upcomingRentals.length,
      overdueCount: overdueRentals.length,
      reminderTime: "20 minutos",
    });
  } catch (error) {
    console.error("Error al obtener recordatorios:", error);
    res.status(500).json({ error: "Error al obtener recordatorios" });
  }
});

// PUT /api/rentals/:id - Actualizar alquiler (extender horas) (ADMIN/VENDEDOR)
// PUT /api/rentals/:id - Actualizar alquiler (extender horas) (ADMIN/VENDEDOR)
router.put("/rentals/:id", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Solo ADMIN o VENDEDOR" });
    }

    const rentalId = parseInt(req.params.id);
    if (!rentalId || isNaN(rentalId)) {
      return res.status(400).json({ error: "ID de alquiler inválido" });
    }

    const { scheduledReturnDate, additionalPrice, rentalType, isExtension } = req.body;

    if (!scheduledReturnDate) {
      return res
        .status(400)
        .json({ error: "scheduledReturnDate es requerido" });
    }

    // 🔥 VERIFICAR QUE EL ALQUILER EXISTE Y ESTÁ ACTIVO
    const existingRental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        washingMachine: {
          select: { id: true, description: true, pricePerHour: true },
        },
      },
    });

    if (!existingRental) {
      return res.status(404).json({ error: "Alquiler no encontrado" });
    }

    if (existingRental.status !== "RENTED") {
      return res
        .status(400)
        .json({ error: "Solo se pueden extender alquileres activos" });
    }

    // Validar que la nueva fecha sea futura
    const newReturnDate = new Date(scheduledReturnDate);
    if (newReturnDate <= new Date()) {
      return res
        .status(400)
        .json({ error: "La nueva fecha de devolución debe ser futura" });
    }

    // 🔥 LÓGICA CORREGIDA PARA EXTENSIONES
    let newRentalPrice;
    let newHoursRented;
    let notesText;

    // 🔥 VERIFICAR TIPO DE ALQUILER ORIGINAL
    const originalRentalType = existingRental.rentalType;
    console.log("🔥 BACKEND: Tipo de alquiler original:", originalRentalType);
    console.log("🔥 BACKEND: Tipo de extensión solicitada:", rentalType);
    console.log("🔥 BACKEND: isExtension:", isExtension);
    console.log("🔥 BACKEND: Precio actual:", existingRental.rentalPrice);
    console.log("🔥 BACKEND: Horas actuales:", existingRental.hoursRented);

    // 🔥 PRIORIDAD 1: SI EL ALQUILER ORIGINAL ES OVERNIGHT, SIEMPRE SUMAR ADICIONAL
    if (originalRentalType === 'OVERNIGHT') {
      // 🔥 SI EL ALQUILER ORIGINAL ES AMANECIDA: Siempre sumar adicional, nunca recalcular
      console.log("🔥 BACKEND: Alquiler original es OVERNIGHT - preservando precio base");
      console.log("Precio actual:", existingRental.rentalPrice);
      console.log("Adicional:", additionalPrice);
      
      newRentalPrice = Number(existingRental.rentalPrice) + Number(additionalPrice || 0);
      newHoursRented = existingRental.hoursRented; // Mantener horas originales
      
      const extensionTypeText = rentalType === 'OVERNIGHT' ? 'por amanecida' : 'por hora';
      notesText = additionalPrice
        ? `${existingRental.notes || ""}\nExtensión ${extensionTypeText}: +$${additionalPrice}`.trim()
        : existingRental.notes;
        
      console.log("🔥 BACKEND: Nuevo precio total:", newRentalPrice);
      console.log("🔥 BACKEND: Horas mantenidas:", newHoursRented);
    } else if (isExtension && rentalType === 'OVERNIGHT') {
      // 🔥 PRIORIDAD 2: SI EL ALQUILER ORIGINAL ES POR HORA pero se extiende como amanecida
      console.log("🔥 BACKEND: Extensión por amanecida desde alquiler por hora");
      
      newRentalPrice = Number(existingRental.rentalPrice) + Number(additionalPrice || 0);
      newHoursRented = existingRental.hoursRented; // Mantener horas originales
      
      notesText = additionalPrice
        ? `${existingRental.notes || ""}\nExtensión por amanecida: +$${additionalPrice}`.trim()
        : existingRental.notes;
        
      console.log("🔥 BACKEND: Nuevo precio total:", newRentalPrice);
    } else if (isExtension && rentalType === 'HOUR') {
      // 🔥 PRIORIDAD 3: PARA EXTENSIÓN POR HORA desde alquiler por hora
      console.log("🔥 BACKEND: Extensión por hora detectada");
      
      const rentalDate = new Date(existingRental.rentalDate);
      const hoursDiff = Math.ceil(
        (newReturnDate - rentalDate) / (1000 * 60 * 60)
      );
      newRentalPrice = Number(existingRental.washingMachine.pricePerHour) * hoursDiff;
      newHoursRented = hoursDiff;
      
      notesText = additionalPrice
        ? `${existingRental.notes || ""}\nExtensión por hora: +${additionalPrice} horas` .trim()
        : existingRental.notes;
        
      
    } else {
      // 🔥 LÓGICA ANTIGUA (para compatibilidad)
      const rentalDate = new Date(existingRental.rentalDate);
      const hoursDiff = Math.ceil(
        (newReturnDate - rentalDate) / (1000 * 60 * 60)
      );
      newRentalPrice = Number(existingRental.washingMachine.pricePerHour) * hoursDiff;
      newHoursRented = hoursDiff;
      notesText = existingRental.notes;
      
    }

    // Actualizar alquiler
    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: {
        scheduledReturnDate: newReturnDate,
        hoursRented: newHoursRented,
        rentalPrice: String(newRentalPrice),
        notes: notesText,
        // 🔥 Actualizar tipo de alquiler si viene en la petición
...(originalRentalType !== 'OVERNIGHT' && rentalType && { rentalType }),
      },
      include: {
        washingMachine: {
          select: { id: true, description: true, pricePerHour: true },
        },
        client: {
          select: {
            id: true,
            nombre: true,
            identificacion: true,
            telefono: true,
          },
        },
        user: {
          select: { id: true, nombre: true, username: true },
        },
      },
    });



    res.json(updatedRental);
  } catch (error) {
    console.error("Error al actualizar alquiler:", error);
    res.status(500).json({ error: "Error al actualizar el alquiler" });
  }
});
// GET /api/reports/rentals-history - Historial completo de alquileres (ADMIN/VENDEDOR)
router.get("/reports/rentals-history", auth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "ADMIN" && req.user.role !== "VENDEDOR")
    ) {
      return res.status(403).json({ error: "Solo ADMIN o VENDEDOR" });
    }

    const {
      page = 1,
      limit = 10,
      status,
      clientId,
      startDate,
      endDate,
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    // Construir filtro
    const where = {};
    if (status) {
      where.status = status;
    }
    if (clientId) {
      where.clientId = Number(clientId);
    }
    if (startDate || endDate) {
      where.rentalDate = {};
      if (startDate) {
        where.rentalDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.rentalDate.lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // Obtener alquileres con relaciones
    const [rentals, total] = await Promise.all([
      prisma.rental.findMany({
        where,
        include: {
          washingMachine: {
            select: {
              id: true,
              description: true,
              pricePerHour: true,
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
          user: {
            select: {
              id: true,
              nombre: true,
              username: true,
            },
          },
        },
        orderBy: { rentalDate: "desc" },
        skip,
        take: limitNumber,
      }),
      prisma.rental.count({ where }),
    ]);

    // Calcular estadísticas
    const stats = await prisma.rental.groupBy({
      by: ["status"],
      where:
        startDate || endDate
          ? {
              rentalDate: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate + "T23:59:59.999Z") : undefined,
              },
            }
          : {},
      _count: { id: true },
      _sum: { rentalPrice: true },
    });

    const totalPages = Math.ceil(total / limitNumber);

    res.json({
      data: rentals,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
      stats: stats.reduce((acc, stat) => {
        acc[stat.status] = {
          count: stat._count.id,
          totalRevenue: Number(stat._sum.rentalPrice || 0),
        };
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("Error al obtener historial de alquileres:", error);
    res.status(500).json({ error: "Error al obtener historial de alquileres" });
  }
});

// POST /api/payments - Registrar pago de cuota individual (protegido)
router.post("/payments", auth, async (req, res) => {
  const { installmentId, amount, paymentMethod } = req.body || {};

  if (!installmentId)
    return res.status(400).json({ error: "installmentId es requerido" });
  if (!amount || amount <= 0)
    return res.status(400).json({ error: "amount debe ser mayor a 0" });
  if (!paymentMethod)
    return res.status(400).json({ error: "paymentMethod es requerido" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar que la cuota existe y está pendiente
      const installment = await tx.creditInstallment.findUnique({
        where: { id: Number(installmentId) },
        include: {
          sale: {
            include: {
              client: { select: { id: true, nombre: true } },
              creditInstallments: {
                where: { status: "PENDING" },
              },
            },
          },
        },
      });

      if (!installment) throw { status: 404, message: "Cuota no encontrada" };
      if (installment.status === "PAID")
        throw { status: 400, message: "Esta cuota ya está pagada" };
      if (installment.status === "OVERDUE")
        throw { status: 400, message: "Esta cuota está vencida" };

      // Verificar que el monto coincida con el valor de la cuota
      const installmentAmount = Number(installment.amountDue);
      if (Number(amount) !== installmentAmount) {
        throw {
          status: 400,
          message: `El monto pagado ($${amount}) no coincide con el valor de la cuota ($${installmentAmount})`,
        };
      }

      // Registrar el pago
      const payment = await tx.payment.create({
        data: {
          saleId: installment.saleId,
          amount: Number(amount),
          paymentMethod: String(paymentMethod),
          date: new Date(),
        },
      });

      // Actualizar estado de la cuota
      const updatedInstallment = await tx.creditInstallment.update({
        where: { id: Number(installmentId) },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      // Verificar si todas las cuotas de la venta están pagadas
      const remainingPendingInstallments = await tx.creditInstallment.count({
        where: {
          saleId: installment.saleId,
          status: "PENDING",
        },
      });

      // Si no hay cuotas pendientes, actualizar el estado de la venta
      if (remainingPendingInstallments === 0) {
        await tx.sale.update({
          where: { id: installment.saleId },
          data: {
            paymentStatus: "PAID",
          },
        });
      }

      // Obtener información actualizada de la venta
      const updatedSale = await tx.sale.findUnique({
        where: { id: installment.saleId },
        include: {
          client: { select: { id: true, nombre: true } },
          creditInstallments: {
            orderBy: { installmentNumber: "asc" },
          },
          payments: {
            orderBy: { date: "desc" },
            take: 5,
          },
        },
      });

      return {
        payment,
        installment: updatedInstallment,
        sale: updatedSale,
        previousStatus: installment.status,
        newStatus: "PAID",
        amountPaid: Number(amount),
        remainingInstallments: remainingPendingInstallments,
      };
    });

    res.status(201).json({
      message: "Cuota pagada exitosamente",
      ...result,
    });
  } catch (err) {
    console.error(err);
    if (err && err.status)
      return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error registrando pago de cuota" });
  }
});
// GET /api/reminders - Obtener cuotas por vencer y vencidas

router.get("/reminders", auth, async (req, res) => {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 2);

    const reminders = await prisma.creditInstallment.findMany({
      where: {
        status: "PENDING",
        dueDate: {
          lte: threeDaysFromNow,
        },
      },
      include: {
        sale: {
          include: {
            client: {
              select: {
                id: true,
                nombre: true,
                telefono: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    res.json(reminders);
  } catch (error) {
    console.error("Error obteniendo recordatorios:", error);
    res.status(500).json({ error: "Error obteniendo recordatorios" });
  }
});
export default router;

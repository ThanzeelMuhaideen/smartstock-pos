import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = "smartstock-super-secret-key-2026";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 5000;

// Set up Prisma Adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// --- PRODUCT ROUTES ---

// GET: Fetch all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET Route: Live search for partial matches (Autocomplete)
app.get('/api/products/search', async (req, res) => {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.json([]);
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { modelNumber: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { modelName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 8
    });

    res.json(products);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to search products." });
  }
});

// GET Route: Fetch a single product by its Model Number (SKU)
app.get('/api/products/sku/:modelNumber', async (req, res) => {
  const { modelNumber } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { modelNumber: modelNumber.toUpperCase() },
      include: { category: true }
    });

    if (!product) {
      return res.status(404).json({ error: "SKU not found in inventory." });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to scan product." });
  }
});

// POST: Add a new product
app.post('/api/products', async (req, res) => {
  try {
    const newProduct = await prisma.product.create({
      data: {
        modelNumber: req.body.modelNumber,
        brand: req.body.brand,
        modelName: req.body.modelName,
        price: parseFloat(req.body.price),
        costPrice: parseFloat(req.body.costPrice || 0), 
        stock: parseInt(req.body.stock),
        categoryId: parseInt(req.body.categoryId)
      }
    });
    res.json(newProduct);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "A product with this Model Number (SKU) already exists." });
    }
    console.error("Failed to add product:", error);
    res.status(500).json({ error: "Failed to save the product to the database." });
  }
});

// PUT Route: Update an existing product
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { modelNumber, brand, modelName, price, stock, categoryId } = req.body;
  try {
    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        modelNumber,
        brand,
        modelName,
        price: parseFloat(price),
        costPrice: parseFloat(req.body.costPrice || 0),
        stock: parseInt(stock) || 0,
        categoryId: parseInt(categoryId)
      }
    });
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ error: "Failed to update product" });
  }
});

// DELETE Route: Remove a product
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({
      where: { id: Number(id) }
    });
    res.json({ message: "Product successfully deleted" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Failed to delete product" });
  }
});

// --- CATEGORY ROUTES ---

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  try {
    const newCategory = await prisma.category.create({
      data: { name }
    });
    res.json(newCategory);
  } catch (error) {
    res.status(400).json({ error: "Failed to create category" });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const updatedCategory = await prisma.category.update({
      where: { id: Number(id) },
      data: { name }
    });
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ error: "Failed to update category" });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({
      where: { id: Number(id) }
    });
    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Cannot delete: Products still attached." });
  }
});

// ==========================================
// --- CUSTOMER ROUTES ---
// ==========================================

app.get('/api/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// GET Route: Live search for Customers
app.get('/api/customers/search', async (req, res) => {
  const { query } = req.query;
  if (!query || typeof query !== 'string') return res.json([]);
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } }
        ]
      },
      take: 5
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Failed to search customers." });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const newCustomer = await prisma.customer.create({
      data: { name, phone, address }
    });
    res.json(newCustomer);
  } catch (error) {
    res.status(400).json({ error: "Failed to create. Phone might exist." });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;
  try {
    const updatedCustomer = await prisma.customer.update({
      where: { id: Number(id) },
      data: { name, phone, address }
    });
    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ error: "Failed to update customer" });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.customer.delete({ where: { id: Number(id) } });
    res.json({ message: "Customer deleted" });
  } catch (error) {
    res.status(400).json({ error: "Failed to delete customer" });
  }
});

app.get('/api/customers/:id/orders', async (req, res) => {
  const { id } = req.params;
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: Number(id) },
      orderBy: { createdAt: 'desc' }, 
      include: {
        items: {
          include: { product: true }
        }
      }
    });
    res.json(orders);
  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ error: "Failed to fetch customer history." });
  }
});

// ==========================================
// ORDER PROCESSING (CHECKOUT)
// ==========================================
app.post('/api/orders', async (req, res) => {
  const { cart, customer, paymentMethod, subtotal, discountRate, taxRate, grandTotal } = req.body;

  try {
    let dbCustomer = null;
    if (customer.phone) {
      dbCustomer = await prisma.customer.findUnique({ where: { phone: customer.phone } });
      if (!dbCustomer) {
        dbCustomer = await prisma.customer.create({
          data: { name: customer.name, phone: customer.phone, address: customer.address }
        });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cart) {
        const currentProduct = await tx.product.findUnique({
          where: { id: Number(item.id) }
        });
        if (!currentProduct || currentProduct.stock < parseInt(item.quantity)) {
          throw new Error(`Insufficient stock for ${item.modelName}.`);
        }
      }

      const newOrder = await tx.order.create({
        data: {
          customerId: dbCustomer?.id || null,
          subtotal: parseFloat(subtotal),
          discountRate: parseFloat(discountRate),
          taxRate: parseFloat(taxRate),
          grandTotal: parseFloat(grandTotal),
          paymentMethod: paymentMethod,
          items: {
            create: cart.map((item: any) => ({
              productId: Number(item.id),
              quantity: parseInt(item.quantity),
              priceAtSale: parseFloat(item.price),
              serialNumber: item.serialNumber || null,
              warrantyMonths: parseInt(item.warrantyMonths) || 0
            }))
          }
        }
      });

      for (const item of cart) {
        await tx.product.update({
          where: { id: Number(item.id) },
          data: { stock: { decrement: parseInt(item.quantity) } }
        });
      }
      return newOrder;
    });

    res.json({ success: true, orderId: order.id, message: "Order processed successfully!" });

  } catch (error: any) {
    console.error("❌ Checkout Error:", error.message);
    res.status(400).json({ error: error.message || "Failed to process the order." });
  }
});

// ==========================================
// INVOICES & RETURNS ROUTES
// ==========================================

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    const formattedOrders = orders.map(order => {
      const taxAmount = (Number(order.subtotal) * Number(order.taxRate || 0)) / 100;

      return {
        id: `ORD-${order.id}`,
        originalId: order.id,
        date: order.createdAt,
        customer: { 
          name: order.customer?.name || 'Walk-in Customer', 
          phone: order.customer?.phone || 'N/A' 
        },
        items: order.items.map(item => ({
          name: item.product.modelName,
          sku: item.product.modelNumber,
          price: Number(item.product.price), 
          quantity: item.quantity
        })),
        subtotal: Number(order.subtotal),
        tax: taxAmount, 
        total: Number(order.grandTotal),
        status: order.status,
        paymentMethod: order.paymentMethod
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({ error: "Failed to fetch transaction history." });
  }
});

app.put('/api/orders/:id/refund', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { status: 'REFUNDED' },
      include: { items: true }
    });

    for (const item of updatedOrder.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });
    }

    res.json({ message: "Refund processed and inventory restocked." });
  } catch (error) {
    console.error("Refund error:", error);
    res.status(500).json({ error: "Failed to process refund." });
  }
});

// ==========================================
// ANALYTICS & REPORTS 
// ==========================================
app.get('/api/analytics', async (req, res) => {
  const { startDate, endDate, productId } = req.query;

  try {
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999)), 
        }
      };
    }

    let itemFilter: any = {};
    if (productId && productId !== 'all') {
      itemFilter = { productId: Number(productId) };
    }

    const soldItems = await prisma.orderItem.findMany({
      where: {
        order: dateFilter,
        ...itemFilter
      },
      include: { product: { include: { category: true } }, order: true }
    });

    let totalSales = 0;
    let totalCost = 0;
    const uniqueOrders = new Set();
    const categoryTotals: Record<string, number> = {};

    soldItems.forEach(item => {
      uniqueOrders.add(item.orderId);

      const salesValue = item.quantity * item.priceAtSale;
      const costValue = item.quantity * (item.product.costPrice || 0);

      totalSales += salesValue;
      totalCost += costValue;

      const catName = item.product.category?.name || 'Uncategorized';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + salesValue;
    });

    const netProfit = totalSales - totalCost;

    const salesByCategory = Object.keys(categoryTotals).map(name => ({
      name,
      value: categoryTotals[name]
    }));

    const lowStockItems = await prisma.product.findMany({
      where: { stock: { lt: 3 } },
      select: { id: true, modelName: true, brand: true, stock: true }
    });

    res.json({
      summary: { totalSales, totalCost, netProfit, totalOrders: uniqueOrders.size },
      salesByCategory,
      lowStockItems
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch analytics." });
  }
});

// ==========================================
// AUTHENTICATION & SECURITY
// ==========================================

app.post('/api/auth/setup', async (req, res) => {
  try {
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) return res.status(400).json({ error: "Admin already exists!" });

    const hashedPassword = await bcrypt.hash("admin123", 10); 

    const admin = await prisma.user.create({
      data: {
        username: "admin",
        password: hashedPassword,
        name: "Store Manager",
        role: "ADMIN"
      }
    });

    res.json({ message: "Admin account created successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to setup admin." });
  }
});

app.post('/api/auth/setup-cashier', async (req, res) => {
  try {
    const existingCashier = await prisma.user.findUnique({ where: { username: 'cashier' } });
    if (existingCashier) return res.status(400).json({ error: "Cashier already exists!" });

    const hashedPassword = await bcrypt.hash("cashier123", 10); 
    await prisma.user.create({
      data: {
        username: "cashier",
        password: hashedPassword,
        name: "Front Desk Staff",
        role: "CASHIER"
      }
    });
    res.json({ message: "Cashier account created!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to setup cashier." });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid username or password" });

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: '12h' } 
    );

    res.json({ token, user: { name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: "Login failed." });
  }
});

// ==========================================
// STAFF MANAGEMENT ROUTES
// ==========================================

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch staff members." });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) return res.status(400).json({ error: "Username already exists!" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { username, password: hashedPassword, name, role },
      select: { id: true, username: true, name: true, role: true } 
    });

    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to create staff account." });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;
  
  try {
    let updateData: any = { name, role };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, username: true, name: true, role: true } 
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to update staff account." });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const userToDelete = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (userToDelete?.username === 'admin') {
      return res.status(400).json({ error: "Cannot delete the primary admin account." });
    }

    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ message: "Account deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete staff account." });
  }
});

// ==========================================
// STOCK INTAKE (MULTI-STORE) ROUTES
// ==========================================

app.get('/api/intake', async (req, res) => {
  try {
    const intakes = await prisma.stockIntake.findMany({
      orderBy: { receivedAt: 'desc' },
      include: { product: true } 
    });
    res.json(intakes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch intake history." });
  }
});

app.post('/api/intake', async (req, res) => {
  const { productId, quantity, destination, supplier, receivedAt } = req.body;
  try {
    const newIntake = await prisma.stockIntake.create({
      data: {
        productId: Number(productId),
        quantity: Number(quantity),
        destination,
        supplier,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date()
      },
      include: { product: true }
    });

    await prisma.product.update({
      where: { id: Number(productId) },
      data: { stock: { increment: Number(quantity) } }
    });

    res.json(newIntake);
  } catch (error) {
    console.error("Intake Error:", error);
    res.status(500).json({ error: "Failed to process stock intake." });
  }
});

app.put('/api/intake/:id', async (req, res) => {
  const { id } = req.params;
  const { productId, quantity, destination, supplier, receivedAt } = req.body;
  try {
    const oldRecord = await prisma.stockIntake.findUnique({ where: { id: Number(id) } });
    if (!oldRecord) return res.status(404).json({ error: "Record not found" });

    const quantityDifference = Number(quantity) - oldRecord.quantity;

    const updatedIntake = await prisma.stockIntake.update({
      where: { id: Number(id) },
      data: {
        productId: Number(productId),
        quantity: Number(quantity),
        destination,
        supplier,
        receivedAt: new Date(receivedAt)
      }
    });

    if (quantityDifference !== 0) {
      await prisma.product.update({
        where: { id: Number(productId) },
        data: { stock: { increment: quantityDifference } }
      });
    }

    res.json(updatedIntake);
  } catch (error) {
    res.status(500).json({ error: "Failed to update intake record." });
  }
});

app.delete('/api/intake/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const oldRecord = await prisma.stockIntake.findUnique({ where: { id: Number(id) } });
    if (!oldRecord) return res.status(404).json({ error: "Record not found" });

    await prisma.stockIntake.delete({ where: { id: Number(id) } });

    await prisma.product.update({
      where: { id: oldRecord.productId },
      data: { stock: { decrement: oldRecord.quantity } }
    });

    res.json({ message: "Record deleted and stock adjusted." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete intake record." });
  }
});

// --- SERVER LISTENER ---
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
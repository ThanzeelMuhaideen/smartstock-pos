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

// Set up Prisma 7 Adapter
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
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.json([]);
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { modelNumber: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { modelName: { contains: q, mode: 'insensitive' } }
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
    // P2002 is Prisma's specific error code for "Unique constraint failed"
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "A product with this Model Number (SKU) already exists. Please use a unique SKU." });
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

// GET: Fetch all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST: Create a new category
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

// PUT Route: Update a category
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

// DELETE Route: Remove a category safely
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({
      where: { id: Number(id) }
    });
    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Cannot delete: There are still products attached to this category." });
  }
});

// ==========================================
// --- CUSTOMER ROUTES ---
// ==========================================

// GET: Fetch all customers
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// GET Route: Live search for Customers (by Name or Phone)
app.get('/api/customers/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') return res.json([]);
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } }
        ]
      },
      take: 5
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Failed to search customers." });
  }
});

// POST: Add a new customer manually
app.post('/api/customers', async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const newCustomer = await prisma.customer.create({
      data: { name, phone, address }
    });
    res.json(newCustomer);
  } catch (error) {
    res.status(400).json({ error: "Failed to create. Phone number might already exist." });
  }
});

// PUT: Update customer details
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

// DELETE: Remove a customer
app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.customer.delete({ where: { id: Number(id) } });
    res.json({ message: "Customer deleted" });
  } catch (error) {
    res.status(400).json({ error: "Failed to delete customer" });
  }
});

// GET: Fetch a specific customer's order history
app.get('/api/customers/:id/orders', async (req, res) => {
  const { id } = req.params;
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: Number(id) },
      orderBy: { createdAt: 'desc' }, // Newest orders first
      include: {
        items: {
          include: {
            product: true // This grabs the actual fridge/washer details!
          }
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
// ORDER PROCESSING (CHECKOUT) - THE MASTER ROUTE
// ==========================================
app.post('/api/orders', async (req, res) => {
  const { cart, customer, paymentMethod, subtotal, discountRate, taxRate, grandTotal } = req.body;

  console.log("🛒 Processing Order for cart:", JSON.stringify(cart, null, 2));

  try {
    // 1. Handle Customer
    let dbCustomer = null;
    if (customer.phone) {
      dbCustomer = await prisma.customer.findUnique({ where: { phone: customer.phone } });
      if (!dbCustomer) {
        dbCustomer = await prisma.customer.create({
          data: { name: customer.name, phone: customer.phone, address: customer.address }
        });
      }
    }

    // 2. Transaction for Order and Inventory
    const order = await prisma.$transaction(async (tx) => {

      // A. STRICT STOCK LEVEL CHECK!
      for (const item of cart) {
        const currentProduct = await tx.product.findUnique({
          where: { id: Number(item.id) }
        });
        if (!currentProduct || currentProduct.stock < parseInt(item.quantity)) {
          throw new Error(`Insufficient stock for ${item.modelName}. You requested ${item.quantity}, but only ${currentProduct?.stock || 0} left in stock!`);
        }
      }

      // B. Create Order
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
              // NEW: Perfectly mapping the Serial and Warranty!
              serialNumber: item.serialNumber || null,
              warrantyMonths: parseInt(item.warrantyMonths) || 0
            }))
          }
        }
      });

      // C. Deduct Stock
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

// GET: Fetch all transaction history from the database
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: {
          include: { product: true } 
        }
      }
    });

    const formattedOrders = orders.map(order => {
      // Fix 1: Safely calculate the tax amount using the taxRate from the DB
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
          // Fix 2: Grab the price from the connected product!
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

// PUT: Process a refund in the database
app.put('/api/orders/:id/refund', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Mark the order as REFUNDED
    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { status: 'REFUNDED' },
      include: { items: true }
    });

    // 2. Return the items back to the inventory stock!
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
// ANALYTICS & REPORTS (WITH FILTERS & PROFIT)
// ==========================================
app.get('/api/analytics', async (req, res) => {
  const { startDate, endDate, productId } = req.query;

  try {
    // 1. Build the Filters based on what the user selects
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999)), // End of the day
        }
      };
    }

    let itemFilter: any = {};
    if (productId && productId !== 'all') {
      itemFilter = { productId: Number(productId) };
    }

    // 2. Fetch specific items sold within the filters
    const soldItems = await prisma.orderItem.findMany({
      where: {
        order: dateFilter,
        ...itemFilter
      },
      include: { product: { include: { category: true } }, order: true }
    });

    // 3. Calculate Financials
    let totalSales = 0;
    let totalCost = 0;
    const uniqueOrders = new Set();

    const categoryTotals: Record<string, number> = {};

    soldItems.forEach(item => {
      uniqueOrders.add(item.orderId);

      const salesValue = item.quantity * item.priceAtSale;
      // If you haven't set costPrice yet, it defaults to 0. 
      const costValue = item.quantity * (item.product.costPrice || 0);

      totalSales += salesValue;
      totalCost += costValue;

      // Group for the Pie Chart
      const catName = item.product.category?.name || 'Uncategorized';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + salesValue;
    });

    const netProfit = totalSales - totalCost;

    const salesByCategory = Object.keys(categoryTotals).map(name => ({
      name,
      value: categoryTotals[name]
    }));

    // 4. Low Stock Warning
    const lowStockItems = await prisma.product.findMany({
      where: { stock: { lt: 3 } },
      select: { id: true, modelName: true, brand: true, stock: true }
    });

    // 5. Send data to frontend
    res.json({
      summary: {
        totalSales,
        totalCost,
        netProfit,
        totalOrders: uniqueOrders.size
      },
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

// 1. SETUP ROUTE: Use this ONCE to create your first Admin account
app.post('/api/auth/setup', async (req, res) => {
  try {
    // Check if an admin already exists so we don't accidentally make duplicates
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) return res.status(400).json({ error: "Admin already exists!" });

    // Scramble the password before saving it to the database
    const hashedPassword = await bcrypt.hash("admin123", 10); 

    const admin = await prisma.user.create({
      data: {
        username: "admin",
        password: hashedPassword,
        name: "Store Manager",
        role: "ADMIN"
      }
    });

    res.json({ message: "Admin account created successfully! Username: admin, Password: admin123" });
  } catch (error) {
    res.status(500).json({ error: "Failed to setup admin." });
  }
});

// SETUP ROUTE 2: Temporary route to create a test cashier
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
    res.json({ message: "Cashier account created! Username: cashier, Password: cashier123" });
  } catch (error) {
    res.status(500).json({ error: "Failed to setup cashier." });
  }
});

// 2. LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // A. Find the user in the database
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    // B. Check if the typed password matches the scrambled database password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid username or password" });

    // C. Create the VIP Pass (JWT Token)
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: '12h' } // Token expires after a 12 hour shift
    );

    res.json({ token, user: { name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: "Login failed." });
  }
});

// ==========================================
// STAFF MANAGEMENT ROUTES (Settings & Staff)
// ==========================================

// GET: List all staff members (but hide their passwords!)
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

// POST: Manager creates a new staff account
app.post('/api/users', async (req, res) => {
  const { username, password, name, role } = req.body;
  
  try {
    // Check if the username is already taken
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) return res.status(400).json({ error: "Username already exists!" });

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role // 'ADMIN' or 'CASHIER'
      },
      select: { id: true, username: true, name: true, role: true } // Return user without password
    });

    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to create staff account." });
  }
});

// PUT: Update an existing staff member (Name, Role, or Reset Password)
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;
  
  try {
    let updateData: any = { name, role };

    // Only update the password if the manager actually typed a new one in!
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, username: true, name: true, role: true } // Hide password from response
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to update staff account." });
  }
});

// DELETE: Remove a staff member
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Safety measure: Prevent deleting the primary admin account!
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

// GET: Fetch all intake history for the manager's audit log
app.get('/api/intake', async (req, res) => {
  try {
    const intakes = await prisma.stockIntake.findMany({
      orderBy: { receivedAt: 'desc' },
      include: { product: true } // Fetch the product details too
    });
    res.json(intakes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch intake history." });
  }
});

// POST: Manager receives new stock at a specific store
app.post('/api/intake', async (req, res) => {
  // NEW: We are now extracting 'receivedAt' from the frontend request
  const { productId, quantity, destination, supplier, receivedAt } = req.body;
  
  try {
    const newIntake = await prisma.stockIntake.create({
      data: {
        productId: Number(productId),
        quantity: Number(quantity),
        destination,
        supplier,
        // NEW: If a date was provided, use it. Otherwise, fallback to right now.
        receivedAt: receivedAt ? new Date(receivedAt) : new Date()
      },
      include: { product: true }
    });

    // Add the quantity to the Global Business Stock
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

// PUT: Update an existing intake record and adjust global stock
app.put('/api/intake/:id', async (req, res) => {
  const { id } = req.params;
  const { productId, quantity, destination, supplier, receivedAt } = req.body;
  
  try {
    // 1. Find the original record to see what the old quantity was
    const oldRecord = await prisma.stockIntake.findUnique({ where: { id: Number(id) } });
    if (!oldRecord) return res.status(404).json({ error: "Record not found" });

    // 2. Calculate the difference. (e.g. New Qty 10 - Old Qty 5 = +5 difference)
    const quantityDifference = Number(quantity) - oldRecord.quantity;

    // 3. Update the Audit Log
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

    // 4. Adjust the Global Product Stock by the difference
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

// DELETE: Remove an intake record and subtract from global stock
app.delete('/api/intake/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const oldRecord = await prisma.stockIntake.findUnique({ where: { id: Number(id) } });
    if (!oldRecord) return res.status(404).json({ error: "Record not found" });

    // 1. Delete the Audit Log record
    await prisma.stockIntake.delete({ where: { id: Number(id) } });

    // 2. Subtract those items back out of the Global Product Stock!
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
// Only listen on a port if we are testing locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export the app for Vercel Serverless execution
export default app;
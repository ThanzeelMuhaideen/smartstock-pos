import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Create a connection pool using the standard pg library
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Wrap it in Prisma's adapter
const adapter = new PrismaPg(pool);

// 3. Initialize the client with the adapter (This fixes your error!)
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create Categories
  const fridgeCat = await prisma.category.create({ data: { name: 'Refrigerators' } });
  const acCat = await prisma.category.create({ data: { name: 'Air Conditioners' } });

  // 2. Create a Product
  const samsungFridge = await prisma.product.create({
    data: {
      modelName: 'RT38 Double Door',
      modelNumber: 'RT38',
      brand: 'Samsung',
      price: 850.00,
      categoryId: fridgeCat.id,
    }
  });

  // 3. Add individual units (Serial Numbers)
  await prisma.inventoryItem.createMany({
    data: [
      { serialNumber: 'SN-REF-1001', productId: samsungFridge.id },
      { serialNumber: 'SN-REF-1002', productId: samsungFridge.id },
    ]
  });

  console.log("Database seeded with household items!");
}

main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect());
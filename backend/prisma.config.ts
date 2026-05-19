import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// This line is the "key" - it loads the variables from your .env file
dotenv.config();

export default defineConfig({
  migrations: {
    // This tells Prisma how to execute our TypeScript seed file
    seed: 'npx ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
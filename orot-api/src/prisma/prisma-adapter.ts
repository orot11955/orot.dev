import { PrismaMariaDb } from '@prisma/adapter-mariadb';

export function createPrismaAdapter() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize Prisma.');
  }

  return new PrismaMariaDb(connectionString);
}

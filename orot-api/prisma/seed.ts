import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createPrismaAdapter } from '../src/prisma/prisma-adapter';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  const username = process.env.STUDIO_USERNAME ?? 'admin';
  const password = process.env.STUDIO_PASSWORD ?? 'admin1234';

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    console.log(`Admin user "${username}" already exists, skipping.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { username, password: hashed, role: 'ADMIN' },
  });

  console.log(`Admin user "${username}" created.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createPrismaAdapter } from '../src/prisma/prisma-adapter';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    throw new Error(
      'Usage: yarn db:admin:set-password -- <username> <new-password>',
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    throw new Error(`User "${username}" not found.`);
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { username },
    data: { password: hashed },
  });

  console.log(`Password updated for "${username}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

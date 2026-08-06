import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the first administrator');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: process.env.ADMIN_NAME || 'System Administrator',
      passwordHash,
      role: Role.ADMINISTRATOR,
      isActive: true,
      tokenVersion: { increment: 1 },
    },
    create: {
      name: process.env.ADMIN_NAME || 'System Administrator',
      email,
      passwordHash,
      role: Role.ADMINISTRATOR,
    },
  });

  console.log(`Seeded administrator: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@smartoil.local').toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMINISTRATOR, isActive: true },
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

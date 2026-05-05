const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("Adding VIEWER to Role enum...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';`);
    console.log("Added VIEWER to Role enum.");
  } catch (error) {
    console.log("Role enum update skipped or failed (might already exist):", error.message);
  }

  const users = [
    {
      email: 'hariharto.surya@gmail.com',
      password: 'hari123',
      role: 'ADMIN',
      name: 'Admin Hari'
    },
    {
      email: 'eilenaangelica99@gmail.com',
      password: 'elincantik123',
      role: 'SALES',
      name: 'Sales Eilena'
    },
    {
      email: 'auriel.rahayu@gmail.com',
      password: 'oyelcantik123',
      role: 'FINANCE',
      name: 'Finance Auriel'
    },
    {
      email: 'rachmat.sendjaja@gmail.com',
      password: 'rachmatganteng123',
      role: 'VIEWER',
      name: 'Viewer Rachmat'
    }
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        role: u.role,
        name: u.name
      },
      create: {
        email: u.email,
        password: hashedPassword,
        role: u.role,
        name: u.name
      }
    });
    console.log(`Upserted user: ${user.email} with role ${user.role}`);
  }
}

main()
  .catch(e => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({ select: { username: true, level: true, exp: true, id: true } });
  console.log('All users:', users);
}
check().then(() => process.exit(0));

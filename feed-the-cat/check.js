const { PrismaClient } = require('@prisma/client');
const { Redis } = require('@upstash/redis');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { username: 'LongVy' } });
  console.log('Prisma User:', user);
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });
  
  if (user) {
    const exp = await redis.get('user:' + user.id + ':exp');
    const level = await redis.get('user:' + user.id + ':level');
    console.log('Redis Exp:', exp, 'Level:', level);
  }
}
check().then(() => process.exit(0));

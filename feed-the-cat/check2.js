const { PrismaClient } = require('@prisma/client');
const { Redis } = require('@upstash/redis');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { username: 'LongVy' } });
  console.log('Prisma User:', user);
  
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  const redis = new Redis({
    url: redisUrl,
    token: redisToken
  });
  
  if (user) {
    const exp = await redis.get('user:' + user.id + ':exp');
    const level = await redis.get('user:' + user.id + ':level');
    console.log('Redis Exp:', exp, 'Level:', level);
  }
}
check().then(() => process.exit(0));

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('[TEST 1] Testing Core DB raw query...');
  const result = await prisma.$queryRawUnsafe('SELECT 1 as connected');
  console.log('Result:', result);

  console.log('[TEST 2] Testing User table query...');
  const userCount = await prisma.user.count();
  console.log('Total users in DB:', userCount);

  console.log('[TEST 3] Testing finding a user...');
  const sampleUser = await prisma.user.findFirst({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
    },
  });
  console.log('Sample user found:', sampleUser);

  console.log('[TEST 4] Testing MobileSession table existence...');
  try {
    const sessionCount = await (prisma as any).mobileSession.count();
    console.log('MobileSession count:', sessionCount);
  } catch (err: any) {
    console.error('MobileSession query error:', err.message);
  }

  console.log('[TEST 5] Testing MobileAppConfig table existence...');
  try {
    const configCount = await (prisma as any).mobileAppConfig.count();
    console.log('MobileAppConfig count:', configCount);
  } catch (err: any) {
    console.error('MobileAppConfig query error:', err.message);
  }
}

main()
  .catch((err) => {
    console.error('DB Diagnosis Fatal Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

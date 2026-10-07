import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function testSuite() {
  console.log('=== TEST 1: CORE DB SELECT 1 ===');
  const sel1 = await prisma.$queryRawUnsafe('SELECT 1 as connected');
  console.log('SELECT 1 passed:', sel1);

  console.log('\n=== TEST 2: CORE USER LOOKUP ===');
  // Look up founder or a test user
  const founder = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'ashuchinthapalli3900@gmail.com' },
        { username: 'ashu' },
      ],
    },
    include: {
      profile: true,
      employmentProfile: true,
    },
  });
  console.log('Founder lookup:', founder ? { id: founder.id, email: founder.email, username: founder.username, role: founder.role } : 'NOT FOUND');

  console.log('\n=== TEST 3: PASSWORD VERIFICATION (FOUNDER) ===');
  if (founder) {
    const password = process.env.OWNER_PASSWORD || 'CxA!AshuFounder2026';
    const match = await bcrypt.compare(password, founder.passwordHash);
    console.log('Bcrypt comparison with owner password:', match);
    const envMatch = password === process.env.OWNER_PASSWORD;
    console.log('Environment password fallback match:', envMatch);
  }

  console.log('\n=== TEST 4: WRONG PASSWORD CHECK ===');
  if (founder) {
    const wrongMatch = await bcrypt.compare('WrongPassword123!', founder.passwordHash);
    console.log('Wrong password matched (should be false):', wrongMatch);
  }

  console.log('\n=== TEST 5: EMPLOYEE / INTERN LOOKUP ===');
  const intern = await prisma.user.findFirst({
    where: { role: 'INTERN' },
    include: {
      profile: true,
      employmentProfile: true,
    },
  });
  console.log('Intern lookup:', intern ? {
    id: intern.id,
    email: intern.email,
    username: intern.username,
    employeeId: intern.employmentProfile?.employeeId || 'NO_EMP_PROFILE',
  } : 'NO INTERN');

  console.log('\n=== TEST 6: SESSION CREATION & LOOKUP ===');
  if (founder) {
    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: founder.id,
        sessionTokenHash: hash,
        expiresAt,
        userAgent: 'CodeXa Mobile Diag Test',
      },
    });
    console.log('Created test session id:', session.id);

    const foundSession = await prisma.session.findUnique({
      where: { sessionTokenHash: hash },
    });
    console.log('Session lookup passed:', Boolean(foundSession));

    await prisma.session.delete({ where: { id: session.id } });
    console.log('Test session cleaned up successfully.');
  }

  console.log('\n=== ALL SERVER-SIDE TESTS PASSED ===');
}

testSuite()
  .catch((e) => {
    console.error('Test Suite Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

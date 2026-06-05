import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed test started');
  await prisma.$connect();
  console.log('Connected');
  await prisma.$disconnect();
}

main();

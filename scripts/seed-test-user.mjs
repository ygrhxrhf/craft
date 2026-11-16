import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { hash } from 'bcryptjs';
import postgres from '@prisma/orm-postgres/runtime';

const contractJson = JSON.parse(
  fs.readFileSync(path.resolve('src/prisma/contract.json'), 'utf8'),
);
const db = await postgres({ contractJson, url: process.env.DATABASE_URL });

const email = 'craft-test@example.com';
const existing = await db.orm.public.User.first({ email });
if (existing) {
  console.log('already exists:', existing.id);
} else {
  const row = await db.orm.public.User.create({
    id: crypto.randomUUID(),
    email,
    password: await hash('test1234', 12),
    name: 'Craft Test',
  });
  console.log('created:', row.id);
}
process.exit(0);
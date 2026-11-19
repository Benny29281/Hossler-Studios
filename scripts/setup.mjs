import { randomUUID } from 'node:crypto';
import nextEnvironment from '@next/env';
import { db, initialize, rows } from '../lib/db.mjs';
import { hashPassword } from '../lib/crypto.mjs';

nextEnvironment.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
const database = await db();
try {
  if (process.env.DATABASE_URL) await initialize(database);
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email || password) {
    if (!email?.includes('@') || !password || password.length < 12) {
      throw new Error('Setel ADMIN_EMAIL dan ADMIN_PASSWORD minimal 12 karakter.');
    }
    const created = await rows(
      "INSERT INTO users (id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,'admin') ON CONFLICT DO NOTHING RETURNING id",
      [randomUUID(), 'Admin Hossler', email, await hashPassword(password)], database
    );
    console.log(created.length ? 'Akun admin dibuat.' : 'Email sudah terdaftar. Akun yang ada dipertahankan.');
  }
  console.log('Basis data siap.');
} finally {
  await database.close();
}

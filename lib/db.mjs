import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

const root = process.cwd();

async function connect() {
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
    return {
      query: (sql, values) => pool.query(sql, values),
      exec: (sql) => pool.query(sql),
      close: () => pool.end(),
      async transaction(callback) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await callback(client);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
    };
  }
  if (process.env.NODE_ENV === 'production' && process.env.LOCAL_DATABASE !== '1') {
    throw new Error('DATABASE_URL wajib di production.');
  }
  const dataPath = path.resolve(root, process.env.LOCAL_DB_PATH || '.data/store');
  await mkdir(path.dirname(dataPath), { recursive: true });
  const local = new PGlite(dataPath);
  await local.waitReady;
  const adapter = {
    query: (sql, values) => local.query(sql, values),
    exec: (sql) => local.exec(sql),
    close: () => local.close(),
    transaction: (callback) => local.transaction(callback),
  };
  await initialize(adapter);
  if (process.env.NODE_ENV !== 'production') {
    await adapter.exec(await readFile(path.join(root, 'db', 'local-stock.sql'), 'utf8'));
  }
  return adapter;
}

export async function initialize(database) {
  for (const name of ['schema.sql', 'seed.sql']) {
    await database.exec(await readFile(path.join(root, 'db', name), 'utf8'));
  }
}

export function db() {
  globalThis.hosslerDatabase ??= connect().catch((error) => {
    delete globalThis.hosslerDatabase;
    throw error;
  });
  return globalThis.hosslerDatabase;
}

export async function rows(sql, values = [], connection) {
  return (await (connection ?? await db()).query(sql, values)).rows;
}

export async function first(sql, values = [], connection) {
  return (await rows(sql, values, connection))[0];
}

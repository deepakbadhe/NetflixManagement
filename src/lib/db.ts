import { Pool } from "pg";
import bcrypt from "bcryptjs";
import type { Role } from "./session";

// Works with any Postgres. Vercel Postgres sets POSTGRES_URL; Neon/Supabase/etc. use DATABASE_URL.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let pool: Pool | null = null;

function needsSsl(cs: string): boolean {
  if (/sslmode=disable/i.test(cs)) return false;
  if (/@localhost|@127\.0\.0\.1/i.test(cs)) return false;
  return true;
}

export function getPool(): Pool {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add a Postgres connection string.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export type UserRow = { id: number; email: string; role: Role; created_at: string };
type UserWithHash = UserRow & { password_hash: string };

let schemaReady: Promise<void> | null = null;

// Idempotent: creates the schema/table and seeds the first admin (from env) once per process.
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((e) => {
      schemaReady = null; // allow a retry on the next call if init failed
      throw e;
    });
  }
  return schemaReady;
}

async function initSchema(): Promise<void> {
  const p = getPool();
  await p.query(`CREATE SCHEMA IF NOT EXISTS netflix_mgmt`);
  await p.query(`
    CREATE TABLE IF NOT EXISTS netflix_mgmt.users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await seedAdminFromEnv(p);
}

async function seedAdminFromEnv(p: Pool): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) return; // nothing to seed
  const existing = await p.query(`SELECT 1 FROM netflix_mgmt.users WHERE role = 'admin' LIMIT 1`);
  if ((existing.rowCount ?? 0) > 0) return; // an admin already exists
  const hash = await bcrypt.hash(password, 10);
  await p.query(
    `INSERT INTO netflix_mgmt.users (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [email, hash],
  );
}

export async function getUserByEmail(email: string): Promise<UserWithHash | null> {
  await ensureSchema();
  const r = await getPool().query(
    `SELECT id, email, password_hash, role, created_at FROM netflix_mgmt.users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  return (r.rows[0] as UserWithHash) || null;
}

export async function getUserById(id: number): Promise<UserRow | null> {
  await ensureSchema();
  const r = await getPool().query(
    `SELECT id, email, role, created_at FROM netflix_mgmt.users WHERE id = $1`,
    [id],
  );
  return (r.rows[0] as UserRow) || null;
}

export async function listUsers(): Promise<UserRow[]> {
  await ensureSchema();
  const r = await getPool().query(
    `SELECT id, email, role, created_at FROM netflix_mgmt.users ORDER BY created_at DESC, id DESC`,
  );
  return r.rows as UserRow[];
}

export async function createUser(email: string, password: string, role: Role): Promise<UserRow> {
  await ensureSchema();
  const hash = await bcrypt.hash(password, 10);
  const r = await getPool().query(
    `INSERT INTO netflix_mgmt.users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role, created_at`,
    [email.trim().toLowerCase(), hash, role],
  );
  return r.rows[0] as UserRow;
}

export async function deleteUser(id: number): Promise<void> {
  await ensureSchema();
  await getPool().query(`DELETE FROM netflix_mgmt.users WHERE id = $1`, [id]);
}

export async function setUserPassword(id: number, password: string): Promise<void> {
  await ensureSchema();
  const hash = await bcrypt.hash(password, 10);
  await getPool().query(`UPDATE netflix_mgmt.users SET password_hash = $1 WHERE id = $2`, [hash, id]);
}

export async function countAdmins(): Promise<number> {
  await ensureSchema();
  const r = await getPool().query(`SELECT COUNT(*)::int AS n FROM netflix_mgmt.users WHERE role = 'admin'`);
  return (r.rows[0]?.n as number) ?? 0;
}

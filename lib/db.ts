import { mkdir } from "node:fs/promises";
import { Pool } from "pg";
import { SCHEMA_STATEMENTS } from "./schema";

export type Row = Record<string, any>;

export type Queryable = {
  query(sql: string, params?: unknown[]): Promise<Row[]>;
};

export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
}

const SCHEMA_LOCK = 741852963;

function needsSsl(connectionString: string): boolean {
  return !/localhost|127\.0\.0\.1|::1/.test(connectionString);
}

async function createPgDb(connectionString: string): Promise<Db> {
  const pool = new Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 10000,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  return {
    async query(sql, params) {
      const res = await pool.query(sql, params as any[]);
      return res.rows as Row[];
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const q: Queryable = {
          async query(sql, params) {
            const res = await client.query(sql, params as any[]);
            return res.rows as Row[];
          },
        };
        const result = await fn(q);
        await client.query("commit");
        return result;
      } catch (err) {
        await client.query("rollback").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

/*
 * Local development and the e2e test run on an embedded Postgres (PGlite).
 * Production uses DATABASE_URL; nothing else changes because PGlite speaks
 * the same SQL.
 */
async function createPgliteDb(): Promise<Db> {
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string in Vercel → Project → Settings → Environment Variables."
    );
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.PGLITE_DIR || ".data/pglite";
  // PGlite only creates the leaf directory, so make sure the parent exists first.
  await mkdir(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;

  // PGlite has a single connection, so every operation goes through one queue.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => {});
    return run;
  };

  const wrap = (source: any): Queryable => ({
    async query(sql, params) {
      const res = await source.query(sql, (params ?? []) as any[]);
      return res.rows as Row[];
    },
  });

  return {
    query(sql, params) {
      return enqueue(async () => wrap(pglite).query(sql, params));
    },
    tx(fn) {
      return enqueue(() => pglite.transaction((tx) => fn(wrap(tx))));
    },
  };
}

async function initDb(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  const db = url ? await createPgDb(url) : await createPgliteDb();
  await db.tx(async (q) => {
    await q.query("select pg_advisory_xact_lock($1)", [SCHEMA_LOCK]);
    for (const statement of SCHEMA_STATEMENTS) {
      await q.query(statement);
    }
  });
  return db;
}

type GlobalWithDb = typeof globalThis & { __boardDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  const g = globalThis as GlobalWithDb;
  if (!g.__boardDb) {
    const pending = initDb();
    g.__boardDb = pending;
    pending.catch(() => {
      if (g.__boardDb === pending) g.__boardDb = undefined;
    });
  }
  return g.__boardDb;
}

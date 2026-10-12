import "server-only";
import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from "mysql2/promise";
import { env } from "./env";

declare global {
  // Survives hot reloads in development so we don't open a new pool per edit.
  var __fjkPool: Pool | undefined;
}

function getPool(): Pool {
  if (!globalThis.__fjkPool) {
    const cfg = env.db;
    const pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectionLimit: cfg.poolSize,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      charset: "utf8mb4",
      // All DATETIME values are UTC. DATE columns come back as 'YYYY-MM-DD' strings.
      timezone: "Z",
      dateStrings: ["DATE"],
      decimalNumbers: true,
      ssl: cfg.ssl ? {} : undefined,
    });
    // Make NOW()/CURRENT_TIMESTAMP defaults UTC as well, whatever the server's zone is.
    pool.on("connection", (conn) => {
      (conn as unknown as { query: (sql: string) => void }).query("SET time_zone = '+00:00'");
    });
    globalThis.__fjkPool = pool;
  }
  return globalThis.__fjkPool;
}

type Params = unknown[];

export interface Db {
  query<T>(sql: string, params?: Params): Promise<T[]>;
  queryOne<T>(sql: string, params?: Params): Promise<T | null>;
  execute(sql: string, params?: Params): Promise<ResultSetHeader>;
}

function wrap(runner: Pool | PoolConnection): Db {
  return {
    async query<T>(sql: string, params?: Params) {
      const [rows] = await runner.query(sql, params as never);
      return rows as T[];
    },
    async queryOne<T>(sql: string, params?: Params) {
      const [rows] = await runner.query(sql, params as never);
      return ((rows as T[])[0] ?? null) as T | null;
    },
    async execute(sql: string, params?: Params) {
      const [res] = await runner.query(sql, params as never);
      return res as ResultSetHeader;
    },
  };
}

export const db: Db = {
  query: (sql, params) => wrap(getPool()).query(sql, params),
  queryOne: (sql, params) => wrap(getPool()).queryOne(sql, params),
  execute: (sql, params) => wrap(getPool()).execute(sql, params),
};

export async function transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(wrap(conn));
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

export function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ER_DUP_ENTRY";
}

export function isForeignKeyViolation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED";
}

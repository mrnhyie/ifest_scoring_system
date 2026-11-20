import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const SESSION_COOKIE = "sb_session";
const SESSION_MS = 12 * 60 * 60 * 1000;

const SCRYPT = { N: 16384, r: 8, p: 1, length: 64 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.length, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  try {
    const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function isPasswordConfigured(): Promise<boolean> {
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  if (envPass) return true;

  const db = await getDb();
  try {
    const rows = await db.query("select id from admin_auth where id = 1");
    if (rows.length > 0) return true;
  } catch {}

  try {
    const rows = await db.query("select id from admins limit 1");
    if (rows.length > 0) return true;
  } catch {}

  return false;
}

export async function checkAdminPassword(password: string): Promise<boolean> {
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  if (envPass && envPass === password) {
    return true;
  }

  const db = await getDb();
  try {
    const rows = await db.query("select password_hash from admin_auth where id = 1");
    if (rows.length > 0 && verifyPassword(password, String(rows[0].password_hash))) {
      return true;
    }
  } catch {}

  try {
    const rows = await db.query("select pw from admins limit 1");
    if (rows.length > 0 && verifyPassword(password, String(rows[0].pw))) {
      return true;
    }
  } catch {}

  return false;
}

export async function setAdminPassword(password: string): Promise<void> {
  const db = await getDb();
  const hash = hashPassword(password);
  await db.query(
    `insert into admin_auth (id, password_hash) values (1, $1)
     on conflict (id) do update set password_hash = excluded.password_hash, updated_at = now()`,
    [hash]
  );
}

export async function createSession(): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_MS);
  const db = await getDb();
  await db.query("insert into sessions (token_hash, admin_id, expires_at) values ($1, 1, $2)", [
    hashToken(token),
    expires,
  ]);
  await db.query("delete from sessions where expires_at < now()");
  return { token, expires };
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  await db.query("delete from sessions where token_hash = $1", [hashToken(token)]);
}

export type Admin = { id: number };

export async function getAdmin(): Promise<Admin | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db.query(
    `select token_hash from sessions where token_hash = $1 and expires_at > now()`,
    [hashToken(token)]
  );
  return rows[0] ? { id: 1 } : null;
}

export function sessionCookie(token: string, expires: Date) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

import { NextResponse } from "next/server";
import { checkAdminPassword, createSession, sessionCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = String(body?.password ?? "");
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "global";
  const db = await getDb();

  try {
    await db.query("delete from login_attempts where at < now() - interval '1 day'");
    const recent = await db.query(
      `select count(*)::int as n from login_attempts
        where at > now() - ($1 || ' minutes')::interval`,
      [String(WINDOW_MINUTES)]
    );
    if (Number(recent[0]?.n ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many attempts. Wait a few minutes and try again." },
        { status: 429 }
      );
    }
  } catch {}

  const ok = await checkAdminPassword(password);
  if (!ok) {
    try {
      await db.query("insert into login_attempts (ip) values ($1)", [ip]);
    } catch {
      try {
        await db.query("insert into login_attempts default values");
      } catch {}
    }
    return NextResponse.json({ error: "Wrong admin password." }, { status: 401 });
  }

  try {
    await db.query("delete from login_attempts");
  } catch {}

  const session = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(session.token, session.expires));
  return res;
}

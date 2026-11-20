import { NextResponse } from "next/server";
import { createSession, isPasswordConfigured, sessionCookie, setAdminPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = String(body?.password ?? "");

  if (password.length < 6) {
    return NextResponse.json({ error: "Password needs at least 6 characters." }, { status: 400 });
  }

  const configured = await isPasswordConfigured();
  if (configured) {
    return NextResponse.json({ error: "Admin password already configured. Sign in instead." }, { status: 409 });
  }

  await setAdminPassword(password);
  const session = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(session.token, session.expires));
  return res;
}

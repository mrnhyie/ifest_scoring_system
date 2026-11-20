import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { BoardError, savePhoto } from "@/lib/board";
import type { Side } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sign in to score." }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No image received." }, { status: 400 });

  const side = Number(form.get("side"));
  if (side !== 0 && side !== 1) {
    return NextResponse.json({ error: "Unknown player." }, { status: 400 });
  }

  const entry = form.get("file");
  if (!entry || typeof entry === "string") {
    return NextResponse.json({ error: "No image received." }, { status: 400 });
  }
  if (!ALLOWED.has(entry.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG or WebP image." }, { status: 415 });
  }
  if (entry.size > MAX_BYTES) {
    return NextResponse.json({ error: "That image is too large." }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await entry.arrayBuffer());
    const state = await savePhoto(side as Side, entry.type, bytes);
    return NextResponse.json({ state }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof BoardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("photo upload failed", err);
    return NextResponse.json({ error: "The photo could not be saved. Try again." }, { status: 500 });
  }
}

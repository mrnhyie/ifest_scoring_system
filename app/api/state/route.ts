import { NextResponse } from "next/server";
import { getState } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const revParam = new URL(req.url).searchParams.get("rev");
  const state = await getState();
  const rev = revParam === null ? NaN : Number(revParam);
  if (Number.isFinite(rev) && rev === state.rev) {
    return NextResponse.json({ unchanged: true, rev: state.rev }, { headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json({ state }, { headers: { "cache-control": "no-store" } });
}

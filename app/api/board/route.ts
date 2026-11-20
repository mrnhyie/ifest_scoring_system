import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { addPoint, BoardError, endSession, renamePlayer, startSession, undoTurn } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sign in to score." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  try {
    let state;
    switch (body?.action) {
      case "start":
        state = await startSession(body.nameA, body.nameB);
        break;
      case "point":
        state = await addPoint(body.side, body.delta);
        break;
      case "undo":
        state = await undoTurn();
        break;
      case "end":
        state = await endSession();
        break;
      case "rename":
        state = await renamePlayer(body.side, body.name);
        break;
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json({ state }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof BoardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("board action failed", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

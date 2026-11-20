import { NextResponse } from "next/server";
import { getAdmin, isPasswordConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [configured, admin] = await Promise.all([isPasswordConfigured(), getAdmin()]);
  return NextResponse.json(
    {
      needsSetup: !configured,
      authed: !!admin,
    },
    { headers: { "cache-control": "no-store" } }
  );
}

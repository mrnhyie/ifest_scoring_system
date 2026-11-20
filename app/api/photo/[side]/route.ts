import { getPhoto } from "@/lib/board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ side: string }> }) {
  const { side } = await ctx.params;
  const index = Number(side);
  if (index !== 0 && index !== 1) {
    return new Response("Not found", { status: 404 });
  }
  const photo = await getPhoto(index);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "content-type": photo.mime,
      "content-length": String(photo.bytes.length),
      "cache-control": "public, max-age=31536000, immutable",
      etag: `"${photo.rev}"`,
    },
  });
}

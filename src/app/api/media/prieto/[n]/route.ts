import { readFile } from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";

import { auth } from "@/lib/auth";
import { PRIETO_EXAMPLES } from "@/lib/media";

// Streams one Prieto audio example from the private Blob store, to signed-in
// users only. In local development it uses media/prieto/ on disk when present.
export async function GET(request: Request, ctx: { params: Promise<{ n: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Sign in required", { status: 401 });

  const { n: raw } = await ctx.params;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > PRIETO_EXAMPLES) {
    return new Response("Unknown example", { status: 404 });
  }

  const headers = {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "private, max-age=86400",
  };

  if (process.env.NODE_ENV !== "production") {
    try {
      const file = path.join(process.cwd(), "media", "prieto", `Example ${n}, Rhythmic Synchronicity.mp3`);
      const body = await readFile(file);
      return new Response(body, { headers: { ...headers, "Content-Length": String(body.length) } });
    } catch {
      // not on disk: fall through to the Blob store
    }
  }

  let result;
  try {
    result = await get(`prieto/example-${n}.mp3`, { access: "private" });
  } catch {
    return new Response("Audio store not reachable", { status: 503 });
  }
  if (!result || result.statusCode !== 200) {
    return new Response("Not uploaded yet", { status: 404 });
  }
  return new Response(result.stream, {
    headers: { ...headers, "Content-Length": String(result.blob.size) },
  });
}

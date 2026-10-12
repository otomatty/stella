/** P0 spike only. In-memory tickets are deliberately excluded from the production API. */
import { Hono } from "hono";
import type { Env } from "../../../api/src/env.js";
import { ApiError, getCaller } from "../../../api/src/lib/authz.js";
type Ticket = { profile: string; tenant: string; book: string; audio: string; expires: number };
const tickets = new Map<string, Ticket>();
export const mediaSpike = new Hono<{ Bindings: Env }>();
mediaSpike.onError((error, c) =>
  c.json({ error: "Media unavailable" }, error instanceof ApiError ? error.status : 500),
);
mediaSpike.post("/tickets", async (c) => {
  const { caller } = await getCaller(c);
  const body = await c.req.json<{ bookId: string; audioId: string }>();
  const book = await c.env.DB.prepare(
    "SELECT id FROM library_books WHERE tenant_id = ? AND id = ? AND owner_id = ? AND status <> 'deleting'",
  )
    .bind(caller.tenantId, body.bookId, caller.id)
    .first();
  if (!book) throw new ApiError("Media unavailable", 404);
  const token = crypto.randomUUID();
  tickets.set(token, {
    profile: caller.id,
    tenant: caller.tenantId,
    book: body.bookId,
    audio: body.audioId,
    expires: Date.now() + 1000,
  });
  return c.json({ path: `/p0/media/${token}` }, 201, { "Cache-Control": "no-store" });
});
mediaSpike.on(["GET", "HEAD"], "/:token", async (c) => {
  const ticket = tickets.get(c.req.param("token"));
  if (!ticket || ticket.expires <= Date.now()) throw new ApiError("Media unavailable", 404);
  const audio = await c.env.DB.prepare(
    `SELECT a.r2_key FROM library_audios a JOIN library_books b ON b.tenant_id = a.tenant_id AND b.id = a.book_id JOIN library_chapters ch ON ch.tenant_id = a.tenant_id AND ch.book_id = a.book_id AND ch.id = a.chapter_id JOIN profiles p ON p.tenant_id = b.tenant_id AND p.id = b.owner_id WHERE b.tenant_id = ? AND b.id = ? AND p.id = ? AND p.disabled = 0 AND b.status <> 'deleting' AND a.id = ? AND a.status = 'ready' AND ch.revision = a.revision AND ch.speech_hash = a.source_speech_hash`,
  )
    .bind(ticket.tenant, ticket.book, ticket.profile, ticket.audio)
    .first<{ r2_key: string }>();
  const head = audio ? await c.env.LIBRARY_BUCKET?.head(audio.r2_key) : null;
  if (!head || !audio) throw new ApiError("Media unavailable", 404);
  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  });
  let range: { offset: number; length: number } | undefined;
  const input = c.req.header("Range");
  if (input) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(input);
    const suffix = match?.[1] === "";
    const from = suffix ? Math.max(0, head.size - Number(match?.[2])) : Number(match?.[1]);
    const to =
      suffix || match?.[2] === "" ? head.size - 1 : Math.min(Number(match?.[2]), head.size - 1);
    if (
      !match ||
      (!match[1] && !match[2]) ||
      !Number.isSafeInteger(from) ||
      !Number.isSafeInteger(to) ||
      from < 0 ||
      from >= head.size ||
      to < from
    ) {
      headers.set("Content-Range", `bytes */${head.size}`);
      return new Response(null, { status: 416, headers });
    }
    range = { offset: from, length: to - from + 1 };
    headers.set("Content-Range", `bytes ${from}-${to}/${head.size}`);
  }
  headers.set("Content-Length", String(range?.length ?? head.size));
  const object =
    c.req.method === "HEAD" ? null : await c.env.LIBRARY_BUCKET?.get(audio.r2_key, { range });
  if (c.req.method !== "HEAD" && !object) throw new ApiError("Media unavailable", 404);
  return new Response(object?.body ?? null, { status: range ? 206 : 200, headers });
});

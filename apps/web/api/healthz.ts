/**
 * Vercel Serverless Function: GET /api/healthz
 */

export default function handler(_request: Request): Response {
  // `Number("abc")` は NaN → JSON 直列化で null になるため、 必ず有限値にフォールバック。
  const parsed = Number(process.env.ISOLATE_MEMORY_LIMIT);
  const memoryLimitMb = Number.isFinite(parsed) && parsed > 0 ? parsed : 32;
  return Response.json({
    ok: true,
    runner: "quickjs-emscripten",
    memoryLimitMb,
  });
}

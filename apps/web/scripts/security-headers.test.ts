import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { build } from "vite";
import {
  buildContentSecurityPolicy,
  inlineScriptsOf,
  originOf,
  securityHeaders,
} from "../vite-plugins/security-headers";

/** `default-src 'self'; script-src ...` を directive ごとの配列に分ける。 */
function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((part) => {
      const [name = "", ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    }),
  );
}

const sha256 = (script: string) =>
  `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;

describe("originOf", () => {
  it("パスや末尾のスラッシュを落としてオリジンだけを返す", () => {
    expect(originOf("https://pub-xxxx.r2.dev/")).toBe("https://pub-xxxx.r2.dev");
    expect(originOf(" https://materials.example.com/base/path ")).toBe(
      "https://materials.example.com",
    );
    expect(originOf("http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787");
  });

  it.each([undefined, "", "   ", "not a url", "javascript:alert(1)", "data:text/plain,x"])(
    "%j は CSP に入れない",
    (value) => {
      expect(originOf(value)).toBeNull();
    },
  );
});

describe("inlineScriptsOf", () => {
  it("src の無い script の本文だけを取り出す", () => {
    const html = [
      "<script>\n  const a = 1;\n</script>",
      '<script type="module" crossorigin src="/assets/index.js"></script>',
      "<SCRIPT data-x='1'>b()</SCRIPT>",
    ].join("\n");
    expect(inlineScriptsOf(html)).toEqual(["\n  const a = 1;\n", "b()"]);
  });
});

describe("buildContentSecurityPolicy", () => {
  const csp = buildContentSecurityPolicy({
    serverUrl: "https://stella-api.example.workers.dev",
    materialsBaseUrl: "https://pub-xxxx.r2.dev/",
    inlineScripts: ["theme()"],
  });
  const d = directives(csp);

  it("inline script は個別のハッシュでだけ許し、'unsafe-inline' を付けない", () => {
    expect(d.get("script-src")).toContain(sha256("theme()"));
    expect(d.get("script-src")).not.toContain("'unsafe-inline'");
    expect(d.get("script-src")).not.toContain("https:");
  });

  it("通信先を自分・API・教材に絞る", () => {
    expect(d.get("connect-src")).toEqual([
      "'self'",
      "https://stella-api.example.workers.dev",
      "https://pub-xxxx.r2.dev",
    ]);
  });

  it("埋め込み・<object>・<base> の差し替えを禁じる", () => {
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
  });

  it("API が未設定 (デモ) なら外部の宛先を足さない", () => {
    const demo = directives(buildContentSecurityPolicy({ inlineScripts: [] }));
    expect(demo.get("connect-src")).toEqual(["'self'"]);
    expect(demo.get("media-src")).toEqual(["'self'", "blob:"]);
  });

  it("API と教材が同じオリジンでも重ねて書かない", () => {
    const same = directives(
      buildContentSecurityPolicy({
        serverUrl: "https://example.test",
        materialsBaseUrl: "https://example.test/materials",
        inlineScripts: [],
      }),
    );
    expect(same.get("connect-src")).toEqual(["'self'", "https://example.test"]);
  });
});

describe("securityHeaders (Vite build)", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it("書き出した index.html の inline script のハッシュと .env の宛先で dist/_headers を作る", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "stella-web-csp-"));
    roots.push(root);
    const inline = '\n  document.documentElement.dataset.theme = "dark";\n';
    writeFileSync(
      path.join(root, "index.html"),
      `<!doctype html><html><head><script>${inline}</script></head><body><script type="module" src="/main.js"></script></body></html>`,
    );
    writeFileSync(path.join(root, "main.js"), 'document.title = "csp";\n');
    writeFileSync(
      path.join(root, ".env"),
      "VITE_SERVER_URL=https://api.example.test\nVITE_MATERIALS_BASE_URL=https://materials.example.test/base/\n",
    );

    await build({ configFile: false, root, logLevel: "silent", plugins: [securityHeaders()] });

    const headers = readFileSync(path.join(root, "dist/_headers"), "utf8");
    const [pattern, line] = headers.split("\n");
    expect(pattern).toBe("/*");
    expect(line).toMatch(/^ {2}Content-Security-Policy: /);
    const d = directives(line?.replace(/^ {2}Content-Security-Policy: /, "") ?? "");
    // ハッシュは書き出し後の HTML の本文から取る (ソースの index.html と同じ本文であることも確かめる)。
    const built = readFileSync(path.join(root, "dist/index.html"), "utf8");
    expect(inlineScriptsOf(built)).toEqual([inline]);
    expect(d.get("script-src")).toContain(sha256(inline));
    expect(d.get("connect-src")).toEqual([
      "'self'",
      "https://api.example.test",
      "https://materials.example.test",
    ]);
  });
});

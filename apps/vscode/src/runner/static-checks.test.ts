import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localTarget, runStaticChecks } from "./static-checks.js";

const PAGE = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>はじめてのページ</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <h1>  今日の
    学習予定 </h1>
  <a href="about.html#top">このページについて</a>
  <a href="https://example.com/">外部</a>
  <a href="#main">本文へ</a>
  <img src="images/missing.png" alt="">
  <a href="../outside.html">外</a>
</body>
</html>`;

async function makeSite(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "stella-static-"));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, ...rel.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}

describe("runStaticChecks", () => {
  it("文書の形・文字・数・スタイルシートを確かめる", async () => {
    const root = await makeSite({ "index.html": PAGE, "style.css": "", "about.html": "" });
    const results = await runStaticChecks(root, [
      { type: "html-document", path: "index.html" },
      { type: "element-text", path: "index.html", tag: "h1", text: "今日の 学習予定" },
      { type: "element-count", path: "index.html", tag: "a", min: 2, max: 5 },
      { type: "stylesheet-linked", path: "index.html", href: "style.css" },
      { type: "file-exists", path: "about.html", name: "別ページがある" },
    ]);
    expect(results.map((r) => [r.name, r.status])).toEqual([
      ["index.html が HTML 文書の形になっている", "passed"],
      ["index.html の <h1> が「今日の 学習予定」になっている", "passed"],
      ["index.html に <a> が 2〜5 個ある", "passed"],
      ["index.html が style.css を読み込んでいる", "passed"],
      ["別ページがある", "passed"],
    ]);
  });

  it("見つからないリンク先と、課題フォルダーの外を指すリンクを報告する", async () => {
    const root = await makeSite({ "index.html": PAGE, "about.html": "" });
    const [result] = await runStaticChecks(root, [{ type: "links-resolve", path: "index.html" }]);
    expect(result?.status).toBe("failed");
    expect(result?.message).toBe(
      "リンク先のファイルが見つかりません: ./style.css、images/missing.png、../outside.html (課題フォルダーの外を指しています)",
    );
  });

  it("文字の違い・足りない要素・無いファイルを説明する", async () => {
    const root = await makeSite({ "index.html": "<html><body><h1>Hello</h1></body></html>" });
    const results = await runStaticChecks(root, [
      { type: "html-document", path: "index.html" },
      { type: "element-text", path: "index.html", tag: "h1", text: "こんにちは" },
      { type: "element-count", path: "index.html", tag: "p", min: 1 },
      { type: "stylesheet-linked", path: "index.html", href: "style.css" },
      { type: "file-exists", path: "about.html" },
      { type: "html-document", path: "missing.html" },
    ]);
    expect(results.map((r) => r.message)).toEqual([
      '足りないもの: <!doctype html>、<html lang="ja"> の lang、<meta charset="UTF-8">、<title> の文字',
      "<h1> の文字が「こんにちは」になっていません (いまは「Hello」)",
      "<p> が 0 個です (1 個以上必要)",
      '<link rel="stylesheet" href="style.css"> が見つかりません',
      "about.html がありません",
      "missing.html がありません",
    ]);
  });
});

describe("信頼していないフォルダーでも外のファイルを読まない", () => {
  it("シンボリックリンクの HTML は「無い」として扱い、中身を結果に出さない", async () => {
    const outside = await makeSite({ "secret.html": "<h1>社外秘の見出し</h1>" });
    const root = await makeSite({});
    await symlink(path.join(outside, "secret.html"), path.join(root, "index.html"));
    const results = await runStaticChecks(root, [
      { type: "element-text", path: "index.html", tag: "h1", text: "x" },
      { type: "file-exists", path: "index.html" },
    ]);
    expect(results.map((r) => r.message)).toEqual([
      "index.html がありません",
      "index.html がありません",
    ]);
    expect(JSON.stringify(results)).not.toContain("社外秘");
  });

  it("提出できる大きさ (1MB) を超える HTML は読み込まない", async () => {
    const root = await makeSite({ "index.html": `<h1>x</h1>${" ".repeat(1024 * 1024)}` });
    const results = await runStaticChecks(root, [
      { type: "element-text", path: "index.html", tag: "h1", text: "x" },
    ]);
    expect(results.map((r) => r.message)).toEqual(["index.html が大きすぎます (1MB まで)"]);
  });
});

describe("localTarget", () => {
  it("外部 URL・アンカーは対象外。相対パスは課題フォルダー基準にする", () => {
    expect(localTarget("index.html", "https://x")).toBeNull();
    expect(localTarget("index.html", "mailto:a@b")).toBeNull();
    expect(localTarget("index.html", "#a")).toBeNull();
    expect(localTarget("pages/a.html", "../style.css?v=1")).toBe("style.css");
    expect(localTarget("pages/a.html", "./img/%E5%86%99%E7%9C%9F.png")).toBe("pages/img/写真.png");
    expect(localTarget("index.html", "docs/")).toBe("docs/index.html");
  });
});

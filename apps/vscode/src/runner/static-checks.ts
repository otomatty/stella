/**
 * HTML の確認 (static-preview)。Node.js を入れる前の単元でも動くよう、拡張の中だけで
 * ファイルを読んで判定する。外部プロセスは起動しない。
 */

import path from "node:path";
import type { StaticCheck } from "@stella/shared/tasks/manifest";
import type { TestCaseResult } from "@stella/shared/tasks/run-result";
import { type DefaultTreeAdapterMap, parse } from "parse5";
import { isFileInRoot, readFileInRoot } from "./files.js";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type Document = DefaultTreeAdapterMap["document"];

function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function children(node: Node): Node[] {
  if ("content" in node && node.nodeName === "template") return node.content.childNodes;
  return "childNodes" in node ? node.childNodes : [];
}

export function findElements(root: Node, tag: string): Element[] {
  const found: Element[] = [];
  const visit = (node: Node) => {
    if (isElement(node) && node.tagName === tag) found.push(node);
    for (const child of children(node)) visit(child);
  };
  visit(root);
  return found;
}

export function textContent(node: Node): string {
  if (node.nodeName === "#text" && "value" in node) return node.value;
  return children(node).map(textContent).join("");
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function attr(element: Element, name: string): string | undefined {
  return element.attrs.find((a) => a.name === name)?.value;
}

/**
 * HTML を読む。課題フォルダーの中の通常のファイルだけを読み、シンボリックリンクや
 * 外を指すパスは「無い」として扱う (信頼していないフォルダーでも動くため)。
 */
async function loadHtml(root: string, rel: string): Promise<Document | string> {
  if (!(await isFileInRoot(root, rel))) return `${rel} がありません`;
  return parse(new TextDecoder().decode(await readFileInRoot(root, rel)));
}

/** リンク先がローカルのファイルを指すときだけ、課題フォルダーからの相対パスを返す。 */
export function localTarget(fromFile: string, reference: string): string | null {
  const ref = reference.trim();
  if (ref === "" || ref.startsWith("#") || ref.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return null;
  const withoutQuery = ref.split("#")[0]?.split("?")[0] ?? "";
  if (withoutQuery === "") return null;
  let decoded: string;
  try {
    decoded = decodeURI(withoutQuery);
  } catch {
    decoded = withoutQuery;
  }
  const base = decoded.startsWith("/") ? "" : path.posix.dirname(fromFile);
  const joined = path.posix.normalize(path.posix.join(base, decoded.replace(/^\/+/, "")));
  return joined.endsWith("/") ? `${joined}index.html` : joined;
}

/** リンク先を持つ要素と、その属性。 */
const LINK_ATTRIBUTES: Readonly<Record<string, string>> = {
  a: "href",
  link: "href",
  img: "src",
  script: "src",
  source: "src",
  video: "src",
  audio: "src",
  iframe: "src",
};

function allElements(root: Node): Element[] {
  const found: Element[] = [];
  const visit = (node: Node) => {
    if (isElement(node)) found.push(node);
    for (const child of children(node)) visit(child);
  };
  visit(root);
  return found;
}

function defaultName(check: StaticCheck): string {
  switch (check.type) {
    case "file-exists":
      return `${check.path} がある`;
    case "html-document":
      return `${check.path} が HTML 文書の形になっている`;
    case "element-text":
      return `${check.path} の <${check.tag}> が「${check.text}」になっている`;
    case "element-count": {
      const range =
        check.min !== undefined && check.max !== undefined
          ? `${check.min}〜${check.max} 個`
          : check.min !== undefined
            ? `${check.min} 個以上`
            : `${check.max} 個以下`;
      return `${check.path} に <${check.tag}> が ${range}ある`;
    }
    case "links-resolve":
      return `${check.path} のリンク先のファイルがある`;
    case "stylesheet-linked":
      return `${check.path} が ${check.href} を読み込んでいる`;
  }
}

async function runCheck(root: string, check: StaticCheck): Promise<string | null> {
  if (check.type === "file-exists") {
    return (await isFileInRoot(root, check.path)) ? null : `${check.path} がありません`;
  }

  const doc = await loadHtml(root, check.path);
  if (typeof doc === "string") return doc;

  switch (check.type) {
    case "html-document": {
      const missing: string[] = [];
      if (!doc.childNodes.some((n) => n.nodeName === "#documentType"))
        missing.push("<!doctype html>");
      const html = findElements(doc, "html")[0];
      if (!html || !attr(html, "lang")) missing.push('<html lang="ja"> の lang');
      const hasCharset = findElements(doc, "meta").some((m) => attr(m, "charset") !== undefined);
      if (!hasCharset) missing.push('<meta charset="UTF-8">');
      const title = findElements(doc, "title")[0];
      if (!title || normalizeText(textContent(title)) === "") missing.push("<title> の文字");
      return missing.length === 0 ? null : `足りないもの: ${missing.join("、")}`;
    }
    case "element-text": {
      const elements = findElements(doc, check.tag);
      if (elements.length === 0) return `<${check.tag}> が見つかりません`;
      const texts = elements.map((e) => normalizeText(textContent(e)));
      const wanted = normalizeText(check.text);
      const ok = texts.some((t) =>
        check.match === "contains" ? t.includes(wanted) : t === wanted,
      );
      return ok
        ? null
        : `<${check.tag}> の文字が「${wanted}」になっていません (いまは「${texts[0]}」)`;
    }
    case "element-count": {
      const count = findElements(doc, check.tag).length;
      if (check.min !== undefined && count < check.min) {
        return `<${check.tag}> が ${count} 個です (${check.min} 個以上必要)`;
      }
      if (check.max !== undefined && count > check.max) {
        return `<${check.tag}> が ${count} 個です (${check.max} 個まで)`;
      }
      return null;
    }
    case "links-resolve": {
      const broken: string[] = [];
      // 文書の中の順に報告する。
      for (const element of allElements(doc)) {
        const name = LINK_ATTRIBUTES[element.tagName];
        const value = name === undefined ? undefined : attr(element, name);
        if (value === undefined) continue;
        const target = localTarget(check.path, value);
        if (target === null) continue;
        if (target.startsWith("../")) {
          broken.push(`${value} (課題フォルダーの外を指しています)`);
        } else if (!(await isFileInRoot(root, target))) {
          broken.push(value);
        }
      }
      return broken.length === 0
        ? null
        : `リンク先のファイルが見つかりません: ${broken.join("、")}`;
    }
    case "stylesheet-linked": {
      const wanted = localTarget(check.path, check.href);
      const linked = findElements(doc, "link").some((link) => {
        const rel = (attr(link, "rel") ?? "").toLowerCase().split(/\s+/);
        const href = attr(link, "href");
        return (
          rel.includes("stylesheet") &&
          href !== undefined &&
          localTarget(check.path, href) === wanted
        );
      });
      if (!linked) return `<link rel="stylesheet" href="${check.href}"> が見つかりません`;
      return wanted && (await isFileInRoot(root, wanted)) ? null : `${check.href} がありません`;
    }
  }
}

export async function runStaticChecks(
  root: string,
  checks: readonly StaticCheck[],
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];
  for (const check of checks) {
    const problem = await runCheck(root, check);
    results.push({
      name: check.name ?? defaultName(check),
      file: check.path,
      status: problem === null ? "passed" : "failed",
      ...(problem === null ? {} : { message: problem }),
    });
  }
  return results;
}

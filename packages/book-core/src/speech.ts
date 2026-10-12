// Markdownを読み上げ用のテキストに変える(docs/02-architecture/system-architecture.md「読み上げ用テキストへの変換」)。
//   読む:       段落、見出し、箇条書き、引用、強調やリンクの文字、文中のコード
//   読み飛ばす: 表、画像、コードブロック、脚注(参照と本体)、生のHTML
// 検証S-3の spikes/lib/speech-text.mjs を移したもの。
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { Nodes } from "mdast";
import { sha256Hex } from "./util";

function inlineText(node: Nodes): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value;
    case "break":
      return " ";
    case "image":
    case "imageReference":
    case "footnoteReference":
    case "html":
      return "";
    default:
      return "children" in node ? node.children.map((c) => inlineText(c as Nodes)).join("") : "";
  }
}

function walk(node: Nodes, out: string[]) {
  switch (node.type) {
    case "heading": {
      const text = inlineText(node).trim();
      // 見出しは独立した文にする(前後に間が入る)
      if (text) out.push(/[。．.!?！？]$/.test(text) ? text : `${text}。`);
      return;
    }
    case "paragraph": {
      const text = inlineText(node)
        .replace(/\s*\n\s*/g, "")
        .trim();
      if (text) out.push(text);
      return;
    }
    case "table":
    case "code":
    case "footnoteDefinition":
    case "html":
    case "thematicBreak":
    case "definition":
      return;
    default:
      if ("children" in node) for (const child of node.children) walk(child as Nodes, out);
  }
}

/** 読み上げる段落の配列。 */
export function toSpeechParagraphs(markdown: string): string[] {
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const out: string[] = [];
  walk(tree, out);
  return out;
}

/** 読み上げ用テキストのハッシュ。図版・表・脚注だけを直しても変わらない。 */
export function speechHash(markdown: string): Promise<string> {
  return sha256Hex(toSpeechParagraphs(markdown).join("\n"));
}

/** 上限に収まるよう、段落の切れ目で分ける。長すぎる段落は文の切れ目で分ける。つなぐと元の文に戻る(改行を除く)。 */
export function chunkParagraphs(paragraphs: string[], maxChars: number): string[] {
  const units: string[] = [];
  for (const p of paragraphs) {
    let rest = p;
    while (rest.length > maxChars) {
      const window = rest.slice(0, maxChars);
      const cut = Math.max(
        window.lastIndexOf("。"),
        window.lastIndexOf("！"),
        window.lastIndexOf("？"),
        window.lastIndexOf("、"),
      );
      const at = cut > 0 ? cut + 1 : maxChars;
      units.push(rest.slice(0, at));
      rest = rest.slice(at);
    }
    if (rest) units.push(rest);
  }
  const chunks: string[] = [];
  let current = "";
  for (const u of units) {
    if (current && current.length + u.length + 1 > maxChars) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n${u}` : u;
  }
  if (current) chunks.push(current);
  return chunks;
}

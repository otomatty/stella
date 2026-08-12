/**
 * slides.md の front-matter（語彙台帳）を読む。
 * YAML パーサは入れない。台帳のスキーマは check_vocab.mjs が守っており、
 * 使うのはスカラーと文字列配列だけなので行単位で足りる。
 */

import { splitSlides } from "./split-slides.js";

export interface SlidesFrontMatter {
  id: string;
  title: string;
  takeaway: string;
  introduces: string[];
  requires: string[];
  /** `---` 区切りで数えたスライド枚数 */
  slideCount: number;
}

function unquote(value: string): string {
  const t = value.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseList(value: string): string[] {
  const t = value.trim();
  if (!t.startsWith("[") || !t.endsWith("]")) return [];
  const inner = t.slice(1, -1).trim();
  if (inner === "") return [];
  return inner.split(",").map((s) => unquote(s));
}

export function parseSlides(source: string): SlidesFrontMatter {
  const normalized = source.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(normalized);
  if (!match) throw new Error("slides.md に front-matter がありません");

  const head = match[1];
  const fields = new Map<string, string>();
  for (const line of head.split("\n")) {
    const kv = /^([a-zA-Z_]+):\s*(.*)$/.exec(line);
    if (kv) fields.set(kv[1], kv[2]);
  }

  const required = ["id", "title", "takeaway"];
  for (const key of required) {
    if (!fields.has(key)) throw new Error(`front-matter に ${key} がありません`);
  }

  return {
    id: unquote(fields.get("id") ?? ""),
    title: unquote(fields.get("title") ?? ""),
    takeaway: unquote(fields.get("takeaway") ?? ""),
    introduces: parseList(fields.get("introduces") ?? "[]"),
    requires: parseList(fields.get("requires") ?? "[]"),
    // 分割ロジックは split-slides.ts が正本。ここで数え方を二重に持たない。
    slideCount: splitSlides(source).length,
  };
}

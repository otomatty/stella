// OCRの指示文、出力の形、応答の検査と整形(純粋な関数)。
// 指示文と出力の形は検証S-2(spikes/s2-ocr/)で使ったもの。
import { pad } from "./util";

export const OCR_PROMPT = `このPDFは、紙の本をスキャンしたものです(日本語、横書き)。
PDFの {{from}} ページ目から {{to}} ページ目までを、1ページずつ正確に文字起こししてください。ページ番号は、PDFの先頭を1とした番号です(紙面に印刷されたページ番号ではありません)。

守ること:

- 紙面に書かれている文字だけを、そのまま書き写す。要約、言い換え、補足、誤字の修正はしない。読めない文字は「〓」にする
- 文章の途中でページが変わる場合も、そのページにある分だけを書く。前後のページの文を補わない
- 紙面の改行位置で改行しない。段落の切れ目でだけ空行を入れる
- 柱(ページの上や下に繰り返し出る章名・節名)と、ページ番号は書かない
- ルビ(ふりがな)は書かない。親文字だけを書く

Markdownでの表し方:

- 章の見出し(「1章 ○○」「第1章 ○○」など、章の始まり): \`# 見出し\`
- 節の見出し(「1.2 ○○」など): \`## 見出し\`。さらに下の見出しは \`###\`
- 太字: \`**太字**\`
- 箇条書き: \`- \` または \`1. \`
- 表: Markdownの表。Markdownの表で表せない複雑な表は、図として扱う
- プログラムやコマンド(複数行): コードブロック。文中のコードやファイル名: \`\` \`code\` \`\`
- 脚注: 本文中の印(†1、*1、注1 など)は \`[^1]\` にし、ページ下の脚注の文は \`[^1]: 脚注の文\` として、そのページの本文の最後に書く
- 挿絵・図解・写真・画面の画像: 本文中の現れる位置に \`![説明文](fig:1)\` と書く。説明文は紙面のキャプション(「図2-1 ○○」など)をそのまま使う。図の中の文字は書き写さない。図の範囲は figures に入れる

求めた範囲のページは、白紙に近いページも含めてすべて返してください(本文がなければ markdown は空文字)。
`;

export const OCR_SCHEMA = {
  type: "object",
  properties: {
    pages: {
      type: "array",
      description: "求められた範囲のページ。1ページにつき1要素。順番どおり、抜けなく。",
      items: {
        type: "object",
        properties: {
          page: {
            type: "integer",
            description: "PDFの中でのページ番号(1始まり)。紙面に印刷されたページ番号ではない。",
          },
          markdown: { type: "string", description: "そのページの本文(Markdown)。" },
          figures: {
            type: "array",
            description: "そのページにある挿絵・図解・写真。なければ空。",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: 'ページ内の連番。"1"、"2"…。本文の ![説明](fig:1) と対応させる。',
                },
                box: {
                  type: "array",
                  description:
                    "図の範囲 [ymin, xmin, ymax, xmax]。ページの左上が0、右下が1000の相対値。説明文(キャプション)は含めない。",
                  items: { type: "integer" },
                },
                caption: {
                  type: "string",
                  description: "図の説明文。紙面にあればそのまま、なければ空。",
                },
              },
              required: ["id", "box", "caption"],
            },
          },
        },
        required: ["page", "markdown", "figures"],
      },
    },
  },
  required: ["pages"],
} as const;

export const ocrPrompt = (from: number, to: number) =>
  OCR_PROMPT.replaceAll("{{from}}", String(from)).replaceAll("{{to}}", String(to));

export interface RawOcrPage {
  page: number;
  markdown: string;
  figures: { id: string; box: number[]; caption: string }[];
}

/** 切り出す図版。box は [ymin, xmin, ymax, xmax](0〜1000)。 */
export interface FigureSpec {
  fileName: string;
  box: [number, number, number, number];
  caption: string;
}

export class OcrFormatError extends Error {}

/** 応答を読み、求めた範囲のページを過不足なく含んでいるかを確かめる(脱落の検出)。 */
export function parseOcrResponse(text: string, from: number, to: number): RawOcrPage[] {
  let parsed: { pages?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new OcrFormatError("OCRの応答がJSONではありません");
  }
  if (!Array.isArray(parsed?.pages)) throw new OcrFormatError("OCRの応答に pages がありません");
  const pages = parsed.pages as RawOcrPage[];
  const got = pages.map((p) => p?.page);
  const want = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new OcrFormatError(`OCRの応答のページが合いません(求めた範囲 ${from}-${to})`);
  }
  return pages.map((p) => {
    if (typeof p.markdown !== "string" || !Array.isArray(p.figures))
      throw new OcrFormatError("OCRのページ本文または図版一覧の形式が正しくありません");
    const ids = new Set<string>();
    for (const figure of p.figures) {
      if (
        !figure ||
        typeof figure.id !== "string" ||
        !figure.id.trim() ||
        ids.has(figure.id) ||
        typeof figure.caption !== "string" ||
        !validBox(figure.box)
      )
        throw new OcrFormatError("OCRの図版の形式が正しくありません");
      ids.add(figure.id);
    }
    return { page: p.page, markdown: p.markdown, figures: p.figures };
  });
}

const validBox = (box: unknown): box is [number, number, number, number] =>
  Array.isArray(box) &&
  box.length === 4 &&
  box.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000) &&
  box[0] < box[2] &&
  box[1] < box[3];

/**
 * 1ページ分の応答を、保存する形に整える。
 * - 図版の参照 `(fig:ID)` を `(images/p012-01.webp)` に書き換える。範囲が不正な図、本文にない番号の参照は外す
 * - 本文から参照されていない図版は、ページの末尾に置く(図を失わないため)
 * - 脚注の印をページごとに一意にする(`[^1]` → `[^p12-1]`)。紙面の脚注番号はページや章ごとに振り直されるため
 */
export function normalizeOcrPage(
  pageNo: number,
  raw: Pick<RawOcrPage, "markdown" | "figures">,
): { markdown: string; figures: FigureSpec[] } {
  const figures: (FigureSpec & { id: string })[] = [];
  for (const f of raw.figures) {
    if (!validBox(f?.box)) continue;
    figures.push({
      id: String(f.id),
      fileName: `p${pad(pageNo, 3)}-${pad(figures.length + 1, 2)}.webp`,
      box: f.box,
      caption: String(f.caption ?? "").trim(),
    });
  }
  const used = new Set<string>();
  let md = raw.markdown.replace(/!\[([^\]]*)\]\(fig:([^)\s]*)\)/g, (_, alt: string, id: string) => {
    const f = figures.find((x) => x.id === id);
    if (!f) return "";
    used.add(id);
    return `![${alt}](images/${f.fileName})`;
  });
  for (const f of figures)
    if (!used.has(f.id)) md += `\n\n![${f.caption.replace(/[[\]]/g, "")}](images/${f.fileName})`;
  md = md.replace(/\[\^([^\]\s]+)\]/g, (_, label: string) => `[^p${pageNo}-${label}]`);
  return { markdown: md.trim(), figures: figures.map(({ id: _id, ...f }) => f) };
}

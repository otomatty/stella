import { toPcm } from "./providers";
import { describe, expect, it } from "vitest";
import { FRONT_MATTER_TITLE, mergeMarkdown, splitIntoChapters, splitMarkdownAt } from "./chapters";
import { normalizeOcrPage, parseOcrResponse } from "./ocr";
import { chunkParagraphs, speechHash, toSpeechParagraphs } from "./speech";
const pages = (...mds: string[]) => mds.map((markdown, i) => ({ pageNo: i + 1, markdown }));

describe("章分割", () => {
  it("bounds a single long paragraph at Unicode code point boundaries", () => {
    const text = "あ😀".repeat(400);
    const chapters = splitIntoChapters(pages(text), "Book", 1000);
    expect(chapters.length).toBeGreaterThan(1);
    expect(chapters.map((c) => c.markdown).join("")).toBe(text);
    for (const chapter of chapters) {
      expect(new TextEncoder().encode(chapter.markdown).length).toBeLessThanOrEqual(1000);
      expect(chapter.markdown).not.toContain("\uFFFD");
    }
  });
  it("refuses oversized footnotes including footnote-only input", () => {
    const definition = `[^1]: ${"あ".repeat(400)}`;
    expect(() => splitIntoChapters(pages(`本文[^1]\n\n${definition}`), "Book", 1000)).toThrow(
      /上限/,
    );
    expect(() => splitIntoChapters(pages(definition), "Book", 1000)).toThrow(/上限/);
  });
  it("AC-04-1 章の見出しごとに章ができ、見出しが章のタイトルになる", () => {
    const ch = splitIntoChapters(
      pages("# 第1章 はじめに\n\n本文1。", "# 第2章 つぎに\n\n本文2。"),
      "本",
    );
    expect(ch.map((c) => c.title)).toEqual(["第1章 はじめに", "第2章 つぎに"]);
    expect(ch[0].markdown).toBe("# 第1章 はじめに\n\n本文1。");
  });

  it("AC-04-2 最初の章見出しより前の本文は「前付け」の章になる", () => {
    const ch = splitIntoChapters(pages("まえがきです。", "# 第1章\n\n本文。"), "本");
    expect(ch.map((c) => c.title)).toEqual([FRONT_MATTER_TITLE, "第1章"]);
  });

  it("AC-04-3 章見出しが1つもなければ、本のタイトルの1章になる", () => {
    const ch = splitIntoChapters(pages("## 節\n\n本文。", "続き。"), "私の本");
    expect(ch).toHaveLength(1);
    expect(ch[0].title).toBe("私の本");
  });

  it("AC-04-4 ページをまたぐ段落は1つの段落につながる。文が終わっていれば分ける", () => {
    const ch = splitIntoChapters(
      pages("# 章\n\nこの段落は次のページへ", "続いています。\n\n次の段落。", "新しい段落です。"),
      "本",
    );
    expect(ch[0].markdown).toBe(
      "# 章\n\nこの段落は次のページへ続いています。\n\n次の段落。\n\n新しい段落です。",
    );
  });

  it("AC-04-4 ページの末尾の脚注をはさんでも段落はつながり、脚注は章の末尾に集まる", () => {
    const ch = splitIntoChapters(
      pages("# 章\n\n本文[^p1-1]の途中で\n\n[^p1-1]: 脚注1", "ページが変わる。"),
      "本",
    );
    expect(ch[0].markdown).toBe("# 章\n\n本文[^p1-1]の途中でページが変わる。\n\n[^p1-1]: 脚注1");
  });

  it("見出しや表、コードの後ろはつながない。コードブロックの中の # は見出しにしない", () => {
    const ch = splitIntoChapters(pages("# 章\n\n```\n# コメント\n```", "本文。"), "本");
    expect(ch).toHaveLength(1);
    expect(ch[0].markdown).toBe("# 章\n\n```\n# コメント\n```\n\n本文。");
  });

  it("AC-04-5 各章に元のページ範囲が記録される。章の切れ目のページは両方に入る", () => {
    const ch = splitIntoChapters(pages("# 一\n\nA。", "B。\n\n# 二\n\nC。", "D。"), "本");
    expect(ch.map((c) => [c.startPage, c.endPage])).toEqual([
      [1, 2],
      [2, 3],
    ]);
  });

  it("大きすぎる章は段落の切れ目で「続き」の章に分ける", () => {
    const para = "あ".repeat(100);
    const ch = splitIntoChapters(
      pages(`# 長い章\n\n${Array(10).fill(para).join("\n\n")}`),
      "本",
      1000,
    );
    expect(ch.length).toBeGreaterThan(1);
    expect(ch[1].title).toBe("長い章(続き2)");
    expect(ch.map((c) => c.markdown).join("\n\n")).toBe(
      `# 長い章\n\n${Array(10).fill(para).join("\n\n")}`,
    );
  });
});

describe("章の結合・分割", () => {
  it("AC-05-2 結合は本文を順につなぐ", () => {
    expect(mergeMarkdown("A\n", "\nB")).toBe("A\n\nB");
  });
  it("AC-05-3 指定した行の前で分け、脚注は参照している側に移す", () => {
    const md = "前半[^a]。\n\n後半[^b]。\n\n[^a]: 脚注A\n[^b]: 脚注B";
    expect(splitMarkdownAt(md, 3)).toEqual([
      "前半[^a]。\n\n[^a]: 脚注A",
      "後半[^b]。\n\n[^b]: 脚注B",
    ]);
  });
  it("どちらかが空になる位置では分けない", () => {
    expect(splitMarkdownAt("一行だけ", 1)).toBeNull();
    expect(splitMarkdownAt("A\n\n", 3)).toBeNull();
  });
});

describe("読み上げ用テキスト", () => {
  const md = [
    "# 見出し",
    "本文の**強調**と[リンク](https://example.com)と`code`[^1]。",
    "- 箇条1\n- 箇条2",
    "> 引用",
    "| a | b |\n| --- | --- |\n| 1 | 2 |",
    "![図1](images/p001-01.webp)",
    "```\nconsole.log(1)\n```",
    "<script>alert(1)</script>",
    "[^1]: 脚注",
  ].join("\n\n");

  it("AC-10-3 表・図版・コードブロック・脚注・生のHTMLを読み飛ばし、ほかは読む", () => {
    expect(toSpeechParagraphs(md)).toEqual([
      "見出し。",
      "本文の強調とリンクとcode。",
      "箇条1",
      "箇条2",
      "引用",
    ]);
  });

  it("AC-07-3 図版・表・コード・脚注だけの修正では、ハッシュが変わらない", async () => {
    const changed = md
      .replace("images/p001-01.webp", "pages/p0001.webp")
      .replace("| 1 | 2 |", "| 3 | 4 |")
      .replace("脚注", "脚注を直した");
    expect(await speechHash(changed)).toBe(await speechHash(md));
    expect(await speechHash(md.replace("引用", "直した引用"))).not.toBe(await speechHash(md));
  });

  it("AC-10-4 分割は上限に収まり、段落・文の切れ目で分かれ、つなぐと元に戻る", () => {
    const paragraphs = ["一文目です。二文目です。三文目です。", "あ".repeat(25), "短い。"];
    const chunks = chunkParagraphs(paragraphs, 12);
    expect(chunks.every((c) => c.length <= 12)).toBe(true);
    expect(chunks[0]).toBe("一文目です。二文目です。");
    const emoji = `${"a".repeat(299)}😀b`;
    const split = chunkParagraphs([emoji], 300);
    // No sentence break: the forced cut must not leave half of a surrogate pair.
    expect(
      split.every((c) => c.length <= 300 && !/[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/.test(c)),
    ).toBe(true);
    expect(split.join("")).toBe(emoji);
    expect(chunks.join("").replace(/\n/g, "")).toBe(paragraphs.join(""));
  });
});

describe("OCRの応答", () => {
  it.each([
    { page: 1 },
    { page: 1, markdown: 123, figures: [] },
    { page: 1, markdown: "Text" },
    { page: 1, markdown: "Text", figures: {} },
    { page: 1, markdown: "Text", figures: [null] },
    { page: 1, markdown: "Text", figures: [{ id: 1, caption: "Figure", box: [1, 1, 10, 10] }] },
    { page: 1, markdown: "Text", figures: [{ id: "1", box: [1, 1, 10, 10] }] },
    { page: 1, markdown: "Text", figures: [{ id: "1", caption: "Figure", box: [10, 1, 1, 10] }] },
    {
      page: 1,
      markdown: "Text",
      figures: [1, 2].map(() => ({ id: "1", caption: "Figure", box: [1, 1, 10, 10] })),
    },
  ])("rejects incomplete or malformed required page fields: %j", (page) => {
    expect(() => parseOcrResponse(JSON.stringify({ pages: [page] }), 1, 1)).toThrow(/形式/);
  });
  it("accepts a blank page with explicit empty text and figures", () => {
    const page = { page: 1, markdown: "", figures: [] };
    expect(parseOcrResponse(JSON.stringify({ pages: [page] }), 1, 1)).toEqual([page]);
  });
  it("求めた範囲のページが揃っていなければ失敗にする(脱落の検出)", () => {
    expect(() =>
      parseOcrResponse(JSON.stringify({ pages: [{ page: 1 }, { page: 3 }] }), 1, 2),
    ).toThrow(/ページが合いません/);
    expect(() => parseOcrResponse("not json", 1, 1)).toThrow(/JSON/);
  });

  it("AC-03-4 図版の参照を画像ファイルに書き換え、脚注の印をページごとに一意にする", () => {
    const out = normalizeOcrPage(12, {
      markdown: "本文[^1]。\n\n![図1](fig:1)\n\n![ない図](fig:9)\n\n[^1]: 脚注",
      figures: [
        { id: "1", box: [100, 100, 500, 900], caption: "図1" },
        { id: "2", box: [600, 100, 800, 900], caption: "参照のない図" },
        { id: "3", box: [900, 100, 800, 900], caption: "範囲が不正" },
      ],
    });
    expect(out.markdown).toBe(
      "本文[^p12-1]。\n\n![図1](images/p012-01.webp)\n\n\n\n[^p12-1]: 脚注\n\n![参照のない図](images/p012-02.webp)",
    );
    expect(out.figures.map((f) => f.fileName)).toEqual(["p012-01.webp", "p012-02.webp"]);
  });

  it("WAVのヘッダーを外してPCMを取り出す", () => {
    const wav = new Uint8Array(44 + 4);
    const v = new DataView(wav.buffer);
    wav.set(new TextEncoder().encode("RIFF"), 0);
    wav.set(new TextEncoder().encode("WAVEfmt "), 8);
    v.setUint32(16, 16, true);
    v.setUint32(24, 22050, true);
    wav.set(new TextEncoder().encode("data"), 36);
    v.setUint32(40, 4, true);
    expect(toPcm(wav, "audio/wav")).toEqual({ pcm: wav.subarray(44), sampleRate: 22050 });
    expect(toPcm(new Uint8Array(4), "audio/L16;codec=pcm;rate=24000").sampleRate).toBe(24000);
  });
});

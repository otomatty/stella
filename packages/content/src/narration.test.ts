import { describe, expect, it } from "vitest";

import {
  applyReadings,
  docSectionFor,
  type NarrationFile,
  normalizeForMatch,
  parseNarration,
  slidesHash,
  speechOf,
  stringifyNarration,
  validateNarration,
} from "./narration.js";

const SLIDES = [
  "---",
  "id: 1-1-2",
  "title: constとletの違い",
  'takeaway: "constは再代入できない、letはできる"',
  "introduces: [const, let]",
  "requires: [変数]",
  "---",
  "",
  "<!-- _class: lead -->",
  "",
  "# 1-1-2",
  "# constとletの違い",
  "",
  "<!-- ノート: 名前の付け方が2種類あることを学びます。 -->",
  "",
  "---",
  "",
  "## 結論",
  "",
  "**constは再代入できない、letはできる**",
  "",
  "<!-- ノート: 結論を先に言い切る。 -->",
  "",
].join("\n");

const READINGS = { const: "コンスト", let: "レット" };

function narration(overrides: Partial<NarrationFile> = {}): NarrationFile {
  return {
    schema: 1,
    slidesHash: slidesHash(SLIDES),
    slides: [
      { cues: [{ text: "名前の付け方は2種類あります。" }] },
      { cues: [{ text: "結論です。constは再代入できない、letはできる。" }] },
    ],
    ...overrides,
  };
}

const errorsOf = (n: NarrationFile, extra: Partial<Parameters<typeof validateNarration>[1]> = {}) =>
  validateNarration(n, { slidesSource: SLIDES, readings: READINGS, ...extra })
    .filter((i) => i.level === "error")
    .map((i) => i.message);

describe("slidesHash", () => {
  it("同じ入力なら同じ値", () => {
    expect(slidesHash(SLIDES)).toBe(slidesHash(SLIDES));
    expect(slidesHash(SLIDES)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("ノートを直すと変わる", () => {
    expect(slidesHash(SLIDES.replace("結論を先に言い切る。", "結論を言う。"))).not.toBe(
      slidesHash(SLIDES),
    );
  });

  it("語彙台帳 (introduces / requires) を直しても変わらない", () => {
    expect(slidesHash(SLIDES.replace("requires: [変数]", "requires: [変数, 宣言]"))).toBe(
      slidesHash(SLIDES),
    );
  });
});

describe("applyReadings", () => {
  it("英数字の語は単語境界でだけ当てる", () => {
    expect(applyReadings("letとletter", READINGS)).toBe("レットとletter");
  });

  it("長い表記から先に当て、置き換えた結果に再び当てない", () => {
    const readings = { Type: "タイプ", TypeScript: "タイプスクリプト", タイプ: "型" };
    expect(applyReadings("TypeScriptのType", readings)).toBe("タイプスクリプトのタイプ");
  });

  it("日本語の表記は境界なしで当てる", () => {
    expect(applyReadings("再代入する", { 再代入: "さいだいにゅう" })).toBe("さいだいにゅうする");
  });

  it("speech があればそれを読む", () => {
    expect(speechOf({ text: "const", speech: "こんすと" }, READINGS)).toBe("こんすと");
    expect(speechOf({ text: "const" }, READINGS)).toBe("コンスト");
  });

  it("speech にも読み辞書を当てる", () => {
    expect(speechOf({ text: "x", speech: "constです" }, READINGS)).toBe("コンストです");
  });
});

describe("parseNarration / stringifyNarration", () => {
  it("往復できる", () => {
    const n = narration();
    expect(parseNarration(stringifyNarration(n))).toEqual({ ...n, draft: undefined });
  });

  it("形が違えば理由付きで落とす", () => {
    expect(() => parseNarration("{")).toThrow(/JSON/);
    expect(() => parseNarration('{"schema":2,"slidesHash":"x","slides":[]}')).toThrow(/schema/);
    expect(() => parseNarration('{"schema":1,"slidesHash":"x","slides":[{"cues":[{}]}]}')).toThrow(
      /text/,
    );
  });
});

describe("validateNarration", () => {
  it("正しい台本はエラーなし", () => {
    expect(errorsOf(narration())).toEqual([]);
  });

  it("枚数の食い違い", () => {
    const n = narration();
    n.slides.pop();
    expect(errorsOf(n).join()).toMatch(/2 枚ですが、台本は 1 枚/);
  });

  it("スライドが変わったのに台本が古い", () => {
    expect(errorsOf(narration({ slidesHash: "0000000000000000" })).join()).toMatch(
      /変わっています/,
    );
  });

  it("61 字以上・改行・Markdown 記法", () => {
    const n = narration();
    n.slides[0].cues = [{ text: "あ".repeat(61) }, { text: "改\n行" }, { text: "**強調**" }];
    const errors = errorsOf(n).join("\n");
    expect(errors).toMatch(/61 字/);
    expect(errors).toMatch(/改行/);
    expect(errors).toMatch(/Markdown/);
  });

  it("読み上げ文にコード記号・括弧が残る", () => {
    const n = narration();
    n.slides[0].cues = [
      { text: "taxRate = 0.1 と書きます。" },
      { text: "ブラウザ（クライアント）" },
    ];
    const errors = errorsOf(n).join("\n");
    expect(errors).toMatch(/コード記号.*taxRate/);
    expect(errors).toMatch(/コード記号.*クライアント/);
  });

  it("出典に無い数字", () => {
    const n = narration();
    n.slides[0].cues = [{ text: "名前の付け方は3種類あります。" }];
    expect(errorsOf(n).join()).toMatch(/数字「3」/);
  });

  it("doc.md の節にある数字は使ってよい", () => {
    const n = narration();
    n.slides[0].cues = [{ text: "名前の付け方は3種類あります。" }];
    expect(errorsOf(n, { docSection: "## 1-1-2 x\n\n3 つの宣言" })).toEqual([]);
  });

  it("結論スライドが takeaway を含まない", () => {
    const n = narration();
    n.slides[1].cues = [{ text: "constは変えられません。" }];
    expect(errorsOf(n).join()).toMatch(/takeaway/);
  });

  it("次トピックのタイトルを言わない", () => {
    const n = narration();
    n.slides[0].cues = [{ text: "次はconstを基本にする、を学びます。" }];
    expect(errorsOf(n, { nextTopicTitle: "constを基本にする" }).join()).toMatch(/次トピック/);
  });

  it("推定長と辞書に無い英字は警告", () => {
    const warnings = validateNarration(
      narration({
        slides: [
          { cues: [{ text: "名前の付け方は2種類あります。Playgroundで試します。" }] },
          { cues: [{ text: "結論です。constは再代入できない、letはできる。" }] },
        ],
      }),
      { slidesSource: SLIDES, readings: READINGS },
    ).filter((i) => i.level === "warning");
    expect(warnings.map((w) => w.message).join("\n")).toMatch(/推定 \d+ 秒/);
    expect(warnings.map((w) => w.message).join("\n")).toMatch(/Playground/);
  });
});

describe("docSectionFor", () => {
  const doc = "# L\n\n## 1-1-1 a\n\nA\n\n## 1-1-2 b\n\nB 10\n\n## もっと知りたい人へ\n\nC";
  it("該当節だけを返す", () => {
    expect(docSectionFor(doc, "1-1-2")).toBe("## 1-1-2 b\n\nB 10\n");
    expect(docSectionFor(doc, "9-9-9")).toBe("");
  });
});

describe("normalizeForMatch", () => {
  it("句読点・括弧・強調を落とす", () => {
    expect(normalizeForMatch("**nullは「意図的に空である」ことを表す値。**")).toBe(
      "nullは意図的に空であることを表す値",
    );
  });
});

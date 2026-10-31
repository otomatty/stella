import { describe, expect, test } from "vitest";
import { buildTaggedPrompt, readTag } from "../src/prompt.js";

const input = {
  documents: [
    { source: "就業規則.pdf", content: "交通費は翌月 5 日までに申請する。" },
    { source: "経費の手引き.pdf", content: "領収書は写真で添付してよい。" },
  ],
  examples: [{ question: "領収書は要りますか？", answer: "要ります。" }],
  instructions: "資料だけを根拠に、答えを answer のタグの中に書いてください。",
  question: "交通費の申請の締め切りはいつですか？",
};

describe("buildTaggedPrompt", () => {
  test("資料・例・指示・質問の順に、それぞれのタグで包む", () => {
    expect(buildTaggedPrompt(input)).toBe(
      [
        "<documents>",
        '<document index="1">',
        "<source>",
        "就業規則.pdf",
        "</source>",
        "<document_content>",
        "交通費は翌月 5 日までに申請する。",
        "</document_content>",
        "</document>",
        '<document index="2">',
        "<source>",
        "経費の手引き.pdf",
        "</source>",
        "<document_content>",
        "領収書は写真で添付してよい。",
        "</document_content>",
        "</document>",
        "</documents>",
        "",
        "<examples>",
        "<example>",
        "<question>",
        "領収書は要りますか？",
        "</question>",
        "<answer>",
        "要ります。",
        "</answer>",
        "</example>",
        "</examples>",
        "",
        "<instructions>",
        input.instructions,
        "</instructions>",
        "",
        "<question>",
        input.question,
        "</question>",
      ].join("\n"),
    );
  });

  test("資料が先頭、質問が最後に来る", () => {
    const prompt = buildTaggedPrompt(input);
    expect(prompt.startsWith("<documents>")).toBe(true);
    expect(prompt.endsWith("</question>")).toBe(true);
    expect(prompt.indexOf("<instructions>")).toBeGreaterThan(
      prompt.indexOf("</documents>"),
    );
  });

  test("例がなければ、examples のタグを入れない", () => {
    const prompt = buildTaggedPrompt({ ...input, examples: [] });
    expect(prompt).not.toContain("<examples>");
    expect(prompt).toContain("</documents>\n\n<instructions>");
  });

  test("資料がなければ、documents のタグを入れない", () => {
    const prompt = buildTaggedPrompt({ ...input, documents: [], examples: [] });
    expect(prompt).toBe(
      [
        "<instructions>",
        input.instructions,
        "</instructions>",
        "",
        "<question>",
        input.question,
        "</question>",
      ].join("\n"),
    );
  });

  test("受け取った配列を書き換えない", () => {
    const documents = [{ source: "a.pdf", content: "本文" }];
    buildTaggedPrompt({ ...input, documents });
    expect(documents).toEqual([{ source: "a.pdf", content: "本文" }]);
  });
});

describe("readTag", () => {
  test("タグの中身を、前後の空白を除いて返す", () => {
    const text =
      "確認しました。\n<answer>\n翌月 5 日までです。\n</answer>\n以上です。";
    expect(readTag(text, "answer")).toBe("翌月 5 日までです。");
  });

  test("同じタグが複数あれば、最初の中身を返す", () => {
    expect(readTag("<answer>A</answer><answer>B</answer>", "answer")).toBe("A");
  });

  test("タグがなければ null を返す", () => {
    expect(readTag("翌月 5 日までです。", "answer")).toBeNull();
  });

  test("閉じるタグがなければ null を返す", () => {
    expect(readTag("<answer>翌月 5 日まで", "answer")).toBeNull();
  });

  test("ほかのタグの中身は返さない", () => {
    expect(readTag("<quotes>引用</quotes>", "answer")).toBeNull();
  });
});

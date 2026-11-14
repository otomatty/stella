import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyPolish,
  buildPolishRequest,
  judgeRewrites,
  parsePolishResponse,
  polishResponseSchema,
  sayHash,
  type PolishLine,
  type PolishResponse,
} from "./video-polish.js";
import { parseStoryboard, type BoardStoryboard } from "./video-storyboard.js";
const sample = JSON.parse(
  readFileSync(new URL("./__fixtures__/board-video.json", import.meta.url), "utf8"),
) as BoardStoryboard;
const fresh = () => structuredClone(sample);
function responseFor(sb = sample): PolishResponse {
  return {
    summary: "簡潔な台本です。画面と言葉がそろっています。",
    lines: sb.scenes.flatMap((s) =>
      s.beats.map((_, i) => ({
        id: `${s.id}#${i + 1}`,
        verdict: "keep" as const,
        kinds: [],
        reason: "修正不要です",
      })),
    ),
    missing: [],
    offPoint: [],
  };
}
function rewrite(text: string, sb = fresh()) {
  const response = responseFor(sb);
  response.lines[0] = {
    ...response.lines[0],
    verdict: "rewrite",
    rewrite: text,
    kinds: ["wordy"],
    reason: "短くします",
  };
  return { sb, response, judgments: judgeRewrites(sb, response) };
}
describe("台本校正の要求", () => {
  it("ガイド全文・6観点・制約と、設計・ラベル・各文の動きを渡す", () => {
    const sb = fresh();
    sb.scenes[0].beats[0] = {
      say: "説明します。",
      show: ["read"],
      hide: ["quiz"],
      focus: ["web"],
      pulse: ["vscode"],
      unmark: ["result"],
      mark: [{ on: "result", kind: "check" }],
      travel: { along: ["write-check", "check-submit"] },
      zoom: ["vscode"],
    };
    const request = buildPolishRequest(sb, "ガイドの全文\n末尾です");
    expect(request.system).toContain("ガイドの全文\n末尾です");
    for (const term of [
      "unnatural",
      "wordy",
      "written",
      "hard-word",
      "repeats-picture",
      "off-point",
      "意味を変えず",
      "40字",
      "keep",
      "ラベル",
    ])
      expect(request.system).toContain(term);
    const user = JSON.parse(request.user);
    expect(user.brief).toEqual(sb.brief);
    expect(user.labels).toContain(sb.boards.main.nodes[0].label);
    expect(user.scenes[0]).toMatchObject({ role: sb.scenes[0].role, title: sb.scenes[0].title });
    expect(user.scenes[0].lines[0].id).toBe(`${sb.scenes[0].id}#1`);
    const picture = user.scenes[0].lines[0].picture.join("\n");
    expect(picture).toContain("出す: 読む");
    expect(picture).toContain("たどる: 書く → 確認する → 提出する");
    expect(picture).toContain("印: 結果を読む に check");
    for (const verb of ["隠す:", "強調:", "脈動:", "印を消す:", "寄る:"])
      expect(picture).toContain(verb);
    expect(picture).not.toContain("write-check");
    sb.scenes[0].beats[0].zoom = "all";
    expect(buildPolishRequest(sb, "guide").user).toContain("寄る: 全体");
  });
  it("スキーマはGeminiの大文字型とenumを使う", () => {
    expect(polishResponseSchema.type).toBe("OBJECT");
    expect(polishResponseSchema.properties.lines.items.properties.verdict.enum).toEqual([
      "keep",
      "rewrite",
      "cut",
    ]);
  });
});
describe("校正応答の検証", () => {
  it("全idの正常応答を受け付ける", () => {
    const response = responseFor();
    expect(parsePolishResponse(response, sample)).toEqual({ response, issues: [] });
  });
  it("足りないidは警告しkeepを補う", () => {
    const response = responseFor(),
      missing = response.lines.pop() as PolishLine;
    const parsed = parsePolishResponse(response, sample);
    expect(parsed.issues).toEqual([
      expect.objectContaining({ level: "warning", path: missing.id }),
    ]);
    expect(parsed.response?.lines.at(-1)).toMatchObject({ id: missing.id, verdict: "keep" });
  });
  it("知らないid・重複id・rewrite欠落を拒む", () => {
    for (const change of [
      (r: PolishResponse) => {
        r.lines[0].id = "unknown#1";
      },
      (r: PolishResponse) => {
        r.lines.push(r.lines[0]);
      },
      (r: PolishResponse) => {
        r.lines[0].verdict = "rewrite";
      },
      (r: PolishResponse) => {
        r.lines[0].verdict = "rewrite";
        r.lines[0].rewrite = " ";
      },
    ]) {
      const response = responseFor();
      change(response);
      const parsed = parsePolishResponse(response, sample);
      expect(parsed.response).toBeUndefined();
      expect(parsed.issues.some((i) => i.level === "error")).toBe(true);
    }
  });
  it("壊れた形・未知のverdictとkindsを拒む", () => {
    for (const json of [
      null,
      [],
      {},
      { ...responseFor(), summary: 1 },
      { ...responseFor(), missing: [1] },
      { ...responseFor(), offPoint: null },
      { ...responseFor(), lines: null },
      ...[
        null,
        { id: "hook#1", verdict: "oops", kinds: ["other"], reason: 2 },
        { ...responseFor().lines[0], rewrite: 12 },
        { ...responseFor().lines[0], kinds: "wordy" },
      ].map((line) => ({ ...responseFor(), lines: [line] })),
    ]) {
      expect(parsePolishResponse(json, sample).response).toBeUndefined();
    }
  });
});
describe("言い換えの採否と反映", () => {
  it("受け入れた文だけを新しい絵コンテに当て、元と並びを保つ", () => {
    const { sb, judgments } = rewrite("学ぶ場所を見てみましょう。");
    const before = JSON.stringify(sb),
      result = applyPolish(sb, judgments);
    expect(judgments[0].accepted).toBe(true);
    expect(result.scenes[0].beats[0].say).toBe("学ぶ場所を見てみましょう。");
    const expected = fresh();
    expected.scenes[0].beats[0].say = "学ぶ場所を見てみましょう。";
    expect(JSON.stringify(result)).toBe(JSON.stringify(expected));
    expect(JSON.stringify(sb)).toBe(before);
  });
  for (const [text, reason] of [
    ["あ".repeat(40) + "。", "40字"],
    ["文です。次です。", "1文"],
    ["括弧（説明）です。", "禁止記号"],
    ["3回です。", "数字"],
    ["３回です。", "数字"],
    ["三回です。", "数字"],
    ["千回です。", "数字"],
    ["APIを使います。", "英字の語"],
    ["Next.jsを使います。", "英字の語"],
  ])
    it(`危険な案を弾く: ${text}`, () => {
      const { sb, judgments } = rewrite(text);
      expect(judgments[0].accepted).toBe(false);
      expect(judgments[0].rejection).toContain(reason);
      expect(applyPolish(sb, judgments)).toEqual(sb);
    });
  it("数字の部分一致や英単語の部分一致では許可しない", () => {
    const sb = fresh();
    sb.brief.goal += "1876回とJavaScript";
    for (const text of ["876回です。", "Javaを使います。"])
      expect(rewrite(text, sb).judgments[0].accepted).toBe(false);
  });
  it("元の文・brief・ラベルにある数字と英字の語は許可する", () => {
    for (const where of ["say", "brief", "label"]) {
      const sb = fresh();
      const source = "１２回と二回とAPIです。";
      if (where === "say") sb.scenes[0].beats[0].say = source;
      if (where === "brief") sb.brief.stuck = source;
      if (where === "label") sb.boards.main.nodes[0].label = "１２ 二 API";
      expect(rewrite("APIで二回と１２回を確認します。", sb).judgments[0].accepted).toBe(true);
    }
  });
  it("別のbeatの数字は許可しない", () => {
    const sb = fresh();
    sb.scenes[0].beats[1].say = "987回です。";
    expect(rewrite("987回を確かめます。", sb).judgments[0].rejection).toContain("数字");
  });
  it("同じ文・speech付き・cutは反映しない", () => {
    expect(rewrite(sample.scenes[0].beats[0].say).judgments[0].rejection).toContain("同じ");
    const sb = fresh();
    sb.scenes[0].beats[0].speech = "よみ";
    expect(rewrite("学ぶ場所を見てみましょう。", sb).judgments[0].rejection).toContain("speech");
    const response = responseFor();
    response.lines[0].verdict = "cut";
    const judged = judgeRewrites(sample, response);
    expect(judged[0].accepted).toBe(false);
    expect(judged[0].rejection).toContain("cut");
    expect(applyPolish(sample, judged)).toEqual(sample);
  });
});
describe("校正の記録", () => {
  it("sayとspeechが変わるとhashが変わり、他の項目には依存しない", () => {
    const sb = fresh(),
      hash = sayHash(sb);
    sb.polish = { model: "test", sayHash: hash };
    sb.scenes[0].title = "別の題";
    expect(sayHash(sb)).toBe(hash);
    sb.scenes[0].beats[0].speech = "よみ";
    expect(sayHash(sb)).not.toBe(hash);
    delete sb.scenes[0].beats[0].speech;
    sb.scenes[0].beats[0].say = "別の文です。";
    expect(sayHash(sb)).not.toBe(hash);
  });
  it("polishは省略でき、記録の型と必須文字列を検査する", () => {
    const sb = fresh();
    delete sb.polish;
    expect(parseStoryboard(sb).storyboard).toBeDefined();
    sb.polish = { model: "gemini-4-argon", sayHash: sayHash(sb) };
    expect(parseStoryboard(sb).storyboard).toEqual(sb);
    for (const value of [null, {}, { model: "", sayHash: "hash" }, { model: "test", sayHash: 1 }]) {
      const result = parseStoryboard({ ...sb, polish: value });
      expect(result.storyboard).toBeUndefined();
      expect(result.issues.some((i) => i.path.startsWith("polish"))).toBe(true);
    }
  });
});

import { storyboardAssets } from "../scripts/lib/storyboard-assets.js";
import { globSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  casualEnding,
  expandFocus,
  normalizeStoryboard,
  parseStoryboard,
  storyboardStates,
  type Board,
  type BoardScene,
  type BoardStoryboard,
  type CodeScene,
  type VideoStoryboard,
} from "./video-storyboard.js";
const stages = resolve(import.meta.dirname, "../stages");
const sample = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "__fixtures__/board-video.json"), "utf8"),
) as BoardStoryboard;
const fresh = () => structuredClone(sample);
function fails(edit: (s: BoardStoryboard) => void, path: string) {
  const s = fresh();
  edit(s);
  const result = parseStoryboard(s);
  expect(result.storyboard).toBeUndefined();
  expect(
    result.issues.some((i) => i.level === "error" && i.path.includes(path)),
    JSON.stringify(result.issues),
  ).toBe(true);
}
describe("絵コンテ", () => {
  it.each(["title", "summary"])(
    "自動タイトル・廃止した場面のid (%s) を絵コンテに書かせない",
    (id) => {
      fails((s) => {
        s.scenes[0].id = id;
      }, "scenes[0].id");
    },
  );
  it("試作は本文を変えずに検査を通る", () => {
    expect(parseStoryboard(sample).storyboard).toEqual(sample);
  });
  it("囲みのtoneは省略・blue・violetを受け付け、未知の値は拒む", () => {
    for (const tone of [undefined, "blue", "violet"] as const) {
      const s = fresh();
      const zone = s.boards.main.zones?.[0];
      if (!zone) throw new Error("試作のzoneがありません");
      zone.tone = tone;
      expect(parseStoryboard(s).storyboard).toEqual(s);
    }
    const s = fresh();
    Object.assign(s.boards.main.zones?.[0] ?? {}, { tone: "pink" });
    expect(parseStoryboard(s).issues).toContainEqual(
      expect.objectContaining({ level: "error", path: "boards.main.zones[0].tone" }),
    );
  });
  it("全ステージのvideo.jsonにエラーがない", () => {
    for (const file of globSync("**/video.json", { cwd: stages })) {
      const json = JSON.parse(readFileSync(resolve(stages, file), "utf8"));
      const { context } = storyboardAssets(
        resolve(stages, ".."),
        dirname(resolve(stages, file)),
        json,
        { allowMissingClips: true },
      );
      expect(
        parseStoryboard(json, context).issues.filter(
          (i) =>
            i.level === "error" &&
            !i.message.startsWith("ショットがありません:") &&
            !i.message.startsWith("クリップがありません:"),
        ),
        file,
      ).toEqual([]);
    }
  });
  it("未知の値や必須項目を複数集める", () => {
    expect(parseStoryboard(null).issues.length).toBeGreaterThan(5);
    const result = parseStoryboard({
      schema: 3,
      brief: {},
      boards: { main: { nodes: [{}] } },
      scenes: [{}],
    });
    for (const path of [
      "schema",
      "brief.goal",
      "brief.stuck",
      "brief.points",
      "brief.leaveOut",
      "boards.main.cols",
      "boards.main.nodes[0].icon",
      "scenes[0].beats",
    ])
      expect(
        result.issues.some((i) => i.path === path),
        path,
      ).toBe(true);
  });
  const cases: [string, (s: BoardStoryboard) => void, string][] = [
    [
      "要点は1〜3個",
      (s) => {
        s.brief.points = [];
      },
      "brief.points",
    ],
    [
      "省く内容は必須",
      (s) => {
        s.brief.leaveOut = [];
      },
      "brief.leaveOut",
    ],
    [
      "3〜6場面",
      (s) => {
        s.scenes = s.scenes.slice(0, 2);
      },
      "scenes",
    ],
    [
      "1〜5文",
      (s) => {
        s.scenes[0].beats = [];
      },
      "beats",
    ],
    [
      "列の上限",
      (s) => {
        s.boards.main.cols = 7;
      },
      "cols",
    ],
    [
      "行の下限",
      (s) => {
        s.boards.main.rows = 0;
      },
      "rows",
    ],
    [
      "囲みの上限",
      (s) => {
        s.boards.main.zones = Array(4).fill(s.boards.main.zones?.[0]);
      },
      "zones",
    ],
    [
      "ノードの上限",
      (s) => {
        s.boards.main.nodes.push(s.boards.main.nodes[0]);
      },
      "nodes",
    ],
    [
      "矢印の上限",
      (s) => {
        s.boards.main.links = Array(9).fill(s.boards.main.links?.[0]);
      },
      "links",
    ],
    [
      "見出しの字数",
      (s) => {
        s.scenes[0].title = "あ".repeat(17);
      },
      "title",
    ],
    [
      "Unicodeの字数",
      (s) => {
        s.boards.main.nodes[0].label = "😀".repeat(11);
      },
      "label",
    ],
    [
      "囲みの字数",
      (s) => {
        if (s.boards.main.zones) s.boards.main.zones[0].label = "あ".repeat(13);
      },
      "label",
    ],
    [
      "矢印の字数",
      (s) => {
        if (s.boards.main.links) s.boards.main.links[0].label = "あ".repeat(7);
      },
      "label",
    ],
    [
      "文の字数",
      (s) => {
        s.scenes[0].beats[0].say = "あ".repeat(40) + "。";
      },
      "say",
    ],
    [
      "アイコンの許可リスト",
      (s) => {
        Object.assign(s.boards.main.nodes[0], { icon: "company-logo" });
      },
      "icon",
    ],
    [
      "routeの許可リスト",
      (s) => {
        Object.assign(s.boards.main.links?.[0] ?? {}, { route: "through" });
      },
      "route",
    ],
    [
      "markの許可リスト",
      (s) => {
        s.scenes[0].beats[1].mark = [{ on: "web", kind: "oops" as "check" }];
      },
      "kind",
    ],
    [
      "resetの型",
      (s) => {
        Object.assign(s.scenes[1], { reset: 1 });
      },
      "reset",
    ],
    [
      "ノードの重複id",
      (s) => {
        s.boards.main.nodes[1].id = "read";
      },
      "boards.main",
    ],
    [
      "種別をまたぐ重複id",
      (s) => {
        s.boards.main.nodes[0].id = "web";
      },
      "boards.main",
    ],
    [
      "場面の重複id",
      (s) => {
        s.scenes[1].id = "hook";
      },
      "scenes",
    ],
    [
      "ノードの位置",
      (s) => {
        s.boards.main.nodes[0].at = [5, 1];
      },
      "at",
    ],
    [
      "位置は整数",
      (s) => {
        s.boards.main.nodes[0].at = [1.5, 1];
      },
      "at",
    ],
    [
      "同じセル",
      (s) => {
        s.boards.main.nodes[1].at = [1, 1];
      },
      "nodes.at",
    ],
    [
      "囲みの位置",
      (s) => {
        if (s.boards.main.zones) s.boards.main.zones[0].cells = [1, 2, 1, 2];
      },
      "cells",
    ],
    [
      "囲みの重なり",
      (s) => {
        if (s.boards.main.zones) s.boards.main.zones[0].cells = [1, 1, 2, 2];
      },
      "cells",
    ],
    [
      "存在しない図解",
      (s) => {
        s.scenes[1].board = "missing";
      },
      "board",
    ],
    [
      "存在しない矢印の端",
      (s) => {
        if (s.boards.main.links) s.boards.main.links[0].from = "missing";
      },
      "from",
    ],
    [
      "存在しないshow",
      (s) => {
        s.scenes[0].beats[0].show = ["missing"];
      },
      "show",
    ],
    [
      "存在しないzoom",
      (s) => {
        s.scenes[0].beats[0].zoom = ["missing"];
      },
      "zoom",
    ],
    [
      "リンクには印を置かない",
      (s) => {
        s.scenes[0].beats[1].mark = [{ on: "read-quiz", kind: "check" }];
      },
      "mark",
    ],
    [
      "pointの番号必須",
      (s) => {
        delete s.scenes[1].point;
      },
      "point",
    ],
    [
      "point以外の番号禁止",
      (s) => {
        s.scenes[0].point = 1;
      },
      "point",
    ],
    [
      "番号の範囲",
      (s) => {
        s.scenes[1].point = 4;
      },
      "point",
    ],
    [
      "hookから始める",
      (s) => {
        s.scenes[0].role = "recap";
      },
      "role",
    ],
    [
      "recapで終わる",
      (s) => {
        s.scenes[s.scenes.length - 1].role = "hook";
      },
      "role",
    ],
    [
      "全要点を説明",
      (s) => {
        s.scenes[3].point = 2;
      },
      "scenes",
    ],
    [
      "番号は昇順",
      (s) => {
        s.scenes[1].point = 2;
        s.scenes[2].point = 1;
      },
      "scenes",
    ],
    [
      "空の動き",
      (s) => {
        s.scenes[0].beats[0] = { say: "説明します。" };
      },
      "beats[0]",
    ],
    [
      "既出showの空振り",
      (s) => {
        s.scenes[0].beats[1] = { say: "説明します。", show: ["web"] };
      },
      "beats[1]",
    ],
    [
      "非表示hideの空振り",
      (s) => {
        s.scenes[0].beats[1] = { say: "説明します。", hide: ["read"] };
      },
      "beats[1]",
    ],
    [
      "非表示focusの空振り",
      (s) => {
        s.scenes[0].beats[1] = { say: "説明します。", focus: ["read"] };
      },
      "beats[1]",
    ],
    [
      "非表示pulseの空振り",
      (s) => {
        s.scenes[0].beats[1] = { say: "説明します。", pulse: ["read"] };
      },
      "beats[1]",
    ],
    [
      "非表示markの空振り",
      (s) => {
        s.scenes[0].beats[1] = { say: "説明します。", mark: [{ on: "read", kind: "check" }] };
      },
      "beats[1]",
    ],
    [
      "印のないunmark",
      (s) => {
        s.scenes[0].beats[1] = { say: "説明します。", unmark: ["web"] };
      },
      "beats[1]",
    ],
    [
      "同じzoomの空振り",
      (s) => {
        s.scenes[0].beats[1] = { say: "説明します。", zoom: "all" };
      },
      "beats[1]",
    ],
    [
      "非表示travel",
      (s) => {
        s.scenes[0].beats[1].travel = { along: ["read-quiz"] };
      },
      "travel",
    ],
    [
      "存在しないtravel",
      (s) => {
        s.scenes[0].beats[1].travel = { along: ["missing"] };
      },
      "travel",
    ],
    [
      "つながらないtravel",
      (s) => {
        s.scenes[4].beats[1].travel = { along: ["write-check", "submit-result"] };
      },
      "travel",
    ],
  ];
  for (const [name, edit, path] of cases) it(name, () => fails(edit, path));
  for (const say of [
    "一文。二文。",
    "終わりがない",
    "問い？？",
    "改行\nです。",
    "括弧（説明）です。",
    "**強調**です。",
    "矢印→です。",
    "片方/です。",
    "省略…です。",
    "[リンク](url)です。",
  ])
    it(`文の禁止記法: ${say}`, () =>
      fails((s) => {
        s.scenes[0].beats[0].say = say;
      }, "say"));
  it("まとめが未完成なら警告だけ", () => {
    const s = fresh();
    s.scenes[4].beats[2].hide = ["quiz"];
    const r = parseStoryboard(s);
    expect(r.storyboard).toBeDefined();
    expect(r.issues.some((i) => i.level === "warning" && i.message.includes("全ノード"))).toBe(
      true,
    );
  });
  it("短い時間は警告、300秒超はエラー", () => {
    const s = fresh();
    for (const scene of s.scenes) for (const b of scene.beats) b.speech = "あ";
    expect(
      parseStoryboard(s).issues.some(
        (i) => i.level === "warning" && i.message.includes("推定時間"),
      ),
    ).toBe(true);
    s.scenes[0].beats[0].speech = "あ".repeat(2000);
    expect(
      parseStoryboard(s).issues.some((i) => i.level === "error" && i.message.includes("推定時間")),
    ).toBe(true);
  });
  it("文の字数・参照・重複・空振りをまとめて指摘する", () => {
    const s = fresh();
    s.scenes[0].beats[0].say = "あ".repeat(41) + "。";
    s.scenes[1].id = "hook";
    s.scenes[1].beats[0].show = ["missing"];
    s.scenes[2].beats[0] = { say: "説明します。" };
    const r = parseStoryboard(s);
    for (const path of ["say", "scenes", "show", "scenes[2].beats[0]"])
      expect(
        r.issues.some((issue) => issue.path.includes(path)),
        path,
      ).toBe(true);
  });
  it("キー順でハッシュ用の文字列が変わらない", () => {
    expect(normalizeStoryboard({ b: 1, a: { d: 2, c: 3 } })).toBe(
      normalizeStoryboard({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });
});
describe("場面の状態", () => {
  it("可視要素・印・カメラを引き継ぎ、focusとpulseは持ち越さない", () => {
    const before = JSON.stringify(sample),
      states = storyboardStates(sample);
    expect(states[1].start).toEqual(states[0].end);
    expect(states[1].start.marks.web).toBe("question");
    expect(states[3].start.zoom).toEqual(["vscode"]);
    expect(states[2].beats[0].focus).toEqual([]);
    expect(states[4].end.visible).toHaveLength(14);
    expect(states[4].end.marks.result).toBe("check");
    expect(JSON.stringify(sample)).toBe(before);
  });
  it("resetとboard変更で空から始まり、以前のboardへ戻っても復元しない", () => {
    const s = fresh();
    s.scenes[2].reset = true;
    expect(storyboardStates(s)[2].start).toEqual({ visible: [], marks: {}, zoom: "all" });
    s.boards.other = structuredClone(s.boards.main);
    s.scenes[2].board = "other";
    expect(storyboardStates(s)[3].start.visible).toEqual([]);
  });
  it("囲みのfocusは内部のノードと内部のリンクだけを含む", () => {
    expect(expandFocus(sample.boards.main, ["web"]).sort()).toEqual(
      ["web", "read", "quiz", "read-quiz"].sort(),
    );
    expect(expandFocus(sample.boards.main, ["vscode"])).not.toContain("quiz-write");
  });
  it("showの同じ文で印とtravelを使える", () => {
    const s = fresh();
    s.scenes[0].beats[0].show?.push("read-quiz");
    s.scenes[0].beats[0].travel = { along: ["read-quiz"] };
    expect(parseStoryboard(s).storyboard).toBeDefined();
  });
  it("schema 1 の状態に emphasis を付けない", () => {
    const visit = (value: unknown): boolean => {
      if (Array.isArray(value)) return value.some(visit);
      if (typeof value === "object" && value !== null)
        return Object.entries(value).some(([key, child]) => key === "emphasis" || visit(child));
      return false;
    };
    expect(visit(storyboardStates(sample))).toBe(false);
  });
});

it("同じクリップで始まる次の view は直前の最後のコマを引き継ぐ", () => {
  const view = {
    kind: "view" as const,
    id: "first",
    role: "hook" as const,
    title: "操作",
    image: "clip:web/read#open",
    beats: [{ say: "開きます。", clip: "web/read#open" }],
  };
  const states = storyboardStates({
    schema: 1,
    brief: sample.brief,
    scenes: [
      view,
      { ...view, id: "second", beats: [{ say: "読みます。", spot: ["all"] }] },
      { ...view, id: "other", image: "clip:web/other#open", beats: [] },
    ],
  });
  expect(states[1]).toMatchObject({
    start: { lastFrame: true },
    beats: [{ before: { lastFrame: true }, after: { lastFrame: true } }],
  });
  if (states[2].kind !== "view") throw new Error("view expected");
  expect(states[2].start.lastFrame).toBeUndefined();
});

describe("コードの場面の検査", () => {
  const codeVideo = () => ({
    ...fresh(),
    scenes: ["hook", "point", "recap"].map((role, i) => ({
      id: `code-${i}`,
      kind: "code",
      role,
      ...(role === "point" ? { point: 1 } : {}),
      title: "名前と値",
      code: ["// 価格を作る", "const price = 1200;"],
      panel: { kind: "values", items: ["price"] },
      beats: [{ say: "価格に名前を付けます。", type: [0, 1], set: { price: "1200" } }],
    })),
    brief: { ...fresh().brief, points: ["名前と値"] },
  });
  it.each([
    { code: ["// 価格を作る", "  // 名前を付ける", " "], rejects: true },
    { code: ["", "", " "], rejects: true },
    { code: ["  // 価格を作る", "const price = 1200;", ""], rejects: false },
  ])("コメントや空行だけのコードを拒む: %j", ({ code, rejects }) => {
    const json = codeVideo();
    json.scenes[0].code = code;
    const result = parseStoryboard(json);
    const errors = result.issues.filter((issue) => issue.level === "error");
    if (rejects) {
      expect(result.storyboard).toBeUndefined();
      expect(errors).toEqual([
        {
          level: "error",
          path: "scenes[0].code",
          message: expect.stringContaining("コメントと空行だけのコードの場面です"),
        },
      ]);
    } else {
      expect(result.storyboard).toBeDefined();
      expect(errors).toEqual([]);
    }
  });
  it("数直線の6文を受け付け、ほかの場面では数直線の動きを拒む", () => {
    const json = codeVideo();
    Object.assign(json.scenes[1], {
      panel: { kind: "numberLine", from: 18, to: 21, items: ["points"] },
      beats: [
        { say: "コードを書きます。", type: [0, 1] },
        { say: "点を置きます。", plot: { at: 19.8, label: "19.8" } },
        { say: "間にあります。", range: [19, 20] },
        { say: "切り捨てます。", snap: { to: 19, label: "切り捨て" } },
        { say: "二十ではありません。", tick: [{ at: 20, kind: "cross" }] },
        { say: "値を入れます。", set: { points: "19" } },
      ],
    });
    expect(parseStoryboard(json).storyboard).toBeDefined();
    for (const kind of ["board", "view"]) {
      const other = fresh();
      Object.assign(other.scenes[0], { kind });
      Object.assign(other.scenes[0].beats[0], {
        plot: { at: 19.8, label: "19.8" },
        range: [19, 20],
        snap: { to: 19, label: "切り捨て" },
        tick: [{ at: 20, kind: "cross" }],
      });
      const { issues } = parseStoryboard(other);
      for (const key of ["plot", "range", "snap", "tick"])
        expect(issues.some((i) => i.path === `scenes[0].beats[0].${key}`)).toBe(true);
    }
  });
  it("boardなしで受け付け、既存の状態APIにつなぐ", () => {
    const json = codeVideo();
    delete (json as { boards?: unknown }).boards;
    const { storyboard } = parseStoryboard(json);
    expect(storyboard).toBeDefined();
    if (!storyboard) return;
    expect(storyboardStates(storyboard)[0]).toMatchObject({
      kind: "code",
      start: { visible: [], values: {} },
      end: { visible: [0, 1], values: { price: "1200" } },
    });
  });
  it.each([
    { code: Array(15).fill("a") },
    { code: ["あ".repeat(41)] },
    { code: ["a".repeat(81)] },
    { code: [null] },
    { show: "true" },
    { panel: { kind: "unknown" } },
    { panel: { kind: "values", items: ["price", "price"] } },
    { panel: { kind: "calls", rows: [{ call: 1, result: "2" }] } },
  ])("不正な場面を拒む: %j", (change) => {
    const json = codeVideo();
    Object.assign(json.scenes[0], change);
    expect(parseStoryboard(json).storyboard).toBeUndefined();
  });
  it.each([
    { type: [-1] },
    { type: [2] },
    { type: [0.5] },
    { type: ["1"] },
    { type: [1, 1] },
    { type: [] },
    { focus: [2] },
    { clear: [2] },
    { part: { line: 1, text: "missing" } },
    { part: null },
    { set: { missing: "1" } },
    { set: { price: 1 } },
    { set: {} },
    { calc: { on: "missing", expr: "1+2", result: "3" } },
    { calc: { on: "price", result: "3" } },
    { row: [0] },
    { mark: [{ line: 1, kind: "question" }] },
    { mark: [{ line: 2, kind: "cross" }] },
    { type: [1], clear: [1] },
    { calc: { on: "price", expr: "1+2", result: "3" }, set: { price: "3" } },
  ])("不正な動きを拒む: %j", (change) => {
    const json = codeVideo();
    Object.assign(json.scenes[0].beats[0], change);
    expect(parseStoryboard(json).storyboard).toBeUndefined();
  });
  it("callsは存在する行だけを出せ、valuesの動きは使えない", () => {
    const json = codeVideo();
    Object.assign(json.scenes[0], {
      panel: { kind: "calls", rows: [{ call: "addTax(980)", result: "1078", note: "税額は98円" }] },
      beats: [{ say: "結果を確かめます。", row: [0] }],
    });
    expect(parseStoryboard(json).storyboard).toBeDefined();
    Object.assign(json.scenes[0].beats[0], { row: [1] });
    expect(parseStoryboard(json).storyboard).toBeUndefined();
    Object.assign(json.scenes[0].beats[0], { row: [0], set: { price: "1" } });
    expect(parseStoryboard(json).storyboard).toBeUndefined();
  });
  it("出ていない行の強調・印と、絵が変わらない文を拒む", () => {
    for (const action of [
      { focus: [1] },
      { part: { line: 1, text: "=" } },
      { mark: [{ line: 1, kind: "cross" }] },
      {},
    ]) {
      const json = codeVideo();
      Object.assign(json.scenes[0], { beats: [{ say: "名前を確かめます。", ...action }] });
      expect(parseStoryboard(json).storyboard).toBeUndefined();
    }
    const json = codeVideo();
    json.scenes[0].beats.push(structuredClone(json.scenes[0].beats[0]));
    expect(parseStoryboard(json).issues.some((i) => i.message.includes("空振り"))).toBe(true);
  });
  it("半角80文字・全角40文字と空行を受け付ける", () => {
    const json = codeVideo();
    json.scenes[0].code = ["a".repeat(80), "あ".repeat(40), ""];
    expect(parseStoryboard(json).storyboard).toBeDefined();
  });
});

it("空行だけの打ち込みや、暗くなる行のないfocusは空振りにする", () => {
  const base = {
    schema: 1,
    brief: { goal: "名前を付ける", stuck: "名前と値", points: ["名前"], leaveOut: ["関数"] },
    scenes: ["hook", "point", "recap"].map((role, i) => ({
      id: `code-${i}`,
      kind: "code",
      role,
      ...(role === "point" ? { point: 1 } : {}),
      title: "名前",
      code: ["const price = 1200;"],
      beats: [{ say: "名前を付けます。", type: [0] }],
    })),
  };
  expect(parseStoryboard(base).storyboard).toBeDefined();
  const blank = structuredClone(base);
  blank.scenes[0].code = [""];
  expect(parseStoryboard(blank).issues.some((i) => i.message.includes("空振り"))).toBe(true);
  const focused = structuredClone(base);
  Object.assign(focused.scenes[0], { show: true, beats: [{ say: "名前を見ます。", focus: [0] }] });
  expect(parseStoryboard(focused).issues.some((i) => i.message.includes("空振り"))).toBe(true);
});

describe("schema 2 のレッスン型", () => {
  const lesson = (): BoardStoryboard => ({
    schema: 2,
    brief: { ...sample.brief, points: ["値を比べる。"] },
    boards: sample.boards,
    scenes: (
      ["goal", "example", "syntax", "apply", "note", "quiz", "answer", "explain", "usage"] as const
    ).map((role) => ({
      id: role,
      role,
      title: "値を比べる",
      board: "main",
      reset: true,
      beats: [{ say: "値を比べます。", show: ["read"] }],
    })),
  });
  it.each([
    "係がすることは、さっきと同じですね。",
    "見終えると、形が分かるようになりますよ。",
    "関数には、値を受け取る入口があるんです。",
    "金額でしたね。",
    "読みましょうね。",
    "待ってくださいね。",
    "どちらなんですか？",
    "先に読むんでした。",
    "答えは金額でしたよね?",
  ])("くだけた文末を schema 2 の say でエラーにする (%s)", (say) => {
    expect(casualEnding(say)).toBe(true);
    const storyboard = lesson();
    storyboard.scenes[0].beats[0].say = say;
    expect(parseStoryboard(storyboard).issues.filter((issue) => issue.level === "error")).toEqual([
      {
        level: "error",
        path: "scenes[0].beats[0].say",
        message: "くだけた文末 (〜ね・〜よ・〜んです) は使いません。丁寧な説明の文末にしてください",
      },
    ]);

    const legacy = fresh();
    legacy.scenes[0].beats[0].say = say;
    expect(parseStoryboard(legacy).storyboard).toEqual(legacy);
  });
  it.each([
    "値を受け取る入口があります。",
    "返す値を、戻り値と呼びます。",
    "読んでみましょう。",
    "思い浮かべてください。",
    "いくつでしょうか？",
    "数値だけではありません。",
    "理由があるのです。",
    "骨は、ほねと読みます。",
    "屋根を見ます。",
  ])("丁寧な文末を受け付ける (%s)", (say) => {
    expect(casualEnding(say)).toBe(false);
  });
  it("speech のくだけた文末は検査しない", () => {
    const storyboard = lesson();
    storyboard.scenes[0].beats[0].speech = "値を比べますね。";
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
  });
  it.each([
    ["値です。", "名前です。", "です"],
    ["どちらでしょうか？", "どの値でしょうか?", "うか"],
  ])("続く文の末尾が同じなら、後ろの文でエラーにする (%s %s)", (first, second, ending) => {
    const storyboard = lesson();
    storyboard.scenes[0].beats = [
      { say: first, show: ["read"] },
      { say: second, show: ["quiz"] },
    ];
    expect(parseStoryboard(storyboard).issues.filter((issue) => issue.level === "error")).toEqual([
      {
        level: "error",
        path: "scenes[0].beats[1].say",
        message: `同じ文末 (〜${ending}) が続いています。言い方を変えてください`,
      },
    ]);
  });
  it("同じ文末でも、間に違う文末があるか場面が変われば通る", () => {
    const storyboard = lesson();
    storyboard.scenes[0].beats = [
      { say: "値です。", show: ["read"] },
      { say: "値を比べます。", show: ["quiz"] },
      { say: "答えです。", hide: ["quiz"] },
    ];
    storyboard.scenes[1].beats[0].say = "次の例です。";
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
  });
  it("schema 1 では同じ文末が続いても通る", () => {
    const storyboard = fresh();
    storyboard.scenes[0].beats.forEach((beat) => {
      beat.say = "ここが目印です。";
    });
    expect(storyboard.scenes[0].beats.length).toBeGreaterThan(1);
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
  });
  it("9場面で通り、最後の図解に全ノードが出なくてもよい", () => {
    const storyboard = lesson();
    const result = parseStoryboard(storyboard);
    expect(result.storyboard).toEqual(storyboard);
    expect(result.issues).toEqual([
      expect.objectContaining({ level: "warning", message: expect.stringContaining("180〜480秒") }),
    ]);
  });
  it.each([17, 18, 19])("%d場面を検査する", (count) => {
    const storyboard = lesson();
    const note = storyboard.scenes[4];
    storyboard.scenes.splice(
      4,
      0,
      ...Array.from({ length: count - 9 }, (_, i) => ({
        ...note,
        id: `note-${i}`,
      })),
    );
    const result = parseStoryboard(storyboard);
    if (count <= 18) expect(result.storyboard).toEqual(storyboard);
    else {
      expect(result.storyboard).toBeUndefined();
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "scenes",
          message: expect.stringContaining("9〜18"),
        }),
      );
    }
  });
  const invalid = [
    [
      "順序",
      (s: BoardStoryboard) => s.scenes.splice(2, 2, s.scenes[3], s.scenes[2]),
      "scenes[3].role",
    ],
    [
      "不足",
      (s: BoardStoryboard) => {
        s.scenes[3].role = "syntax";
      },
      "scenes",
    ],
    [
      "goalの重複",
      (s: BoardStoryboard) => {
        s.scenes[1].role = "goal";
      },
      "scenes[1].role",
    ],
    [
      "quizの重複",
      (s: BoardStoryboard) => {
        s.scenes[6].role = "quiz";
      },
      "scenes[6].role",
    ],
    [
      "answerの重複",
      (s: BoardStoryboard) => {
        s.scenes[7].role = "answer";
      },
      "scenes[7].role",
    ],
    [
      "旧role",
      (s: BoardStoryboard) => {
        s.scenes[0].role = "hook";
      },
      "scenes[0].role",
    ],
    [
      "要点の数",
      (s: BoardStoryboard) => {
        s.brief.points.push("別の要点。");
      },
      "brief.points",
    ],
    [
      "要点の番号",
      (s: BoardStoryboard) => {
        s.scenes[1].point = 1;
      },
      "scenes[1].point",
    ],
    [
      "場面数",
      (s: BoardStoryboard) => {
        s.scenes.splice(4, 1);
      },
      "scenes",
    ],
    [
      "最初の補足",
      (s: BoardStoryboard) => {
        s.scenes.unshift(...s.scenes.splice(4, 1));
      },
      "scenes[0].role",
    ],
    [
      "最後の補足",
      (s: BoardStoryboard) => {
        s.scenes.push(...s.scenes.splice(4, 1));
      },
      "scenes[8].role",
    ],
    [
      "問題直後の補足",
      (s: BoardStoryboard) => {
        const [note] = s.scenes.splice(4, 1);
        s.scenes.splice(5, 0, note);
      },
      "scenes[5].role",
    ],
    [
      "間が短い",
      (s: BoardStoryboard) => {
        s.scenes[0].beats[0].pause = 0.49;
      },
      "scenes[0].beats[0].pause",
    ],
    [
      "間が長い",
      (s: BoardStoryboard) => {
        s.scenes[0].beats[0].pause = 8.01;
      },
      "scenes[0].beats[0].pause",
    ],
    [
      "考える時間が短い",
      (s: BoardStoryboard) => {
        s.scenes[5].think = 2.99;
      },
      "scenes[5].think",
    ],
    [
      "考える時間が長い",
      (s: BoardStoryboard) => {
        s.scenes[5].think = 15.01;
      },
      "scenes[5].think",
    ],
    [
      "問題以外の考える時間",
      (s: BoardStoryboard) => {
        s.scenes[0].think = 6;
      },
      "scenes[0].think",
    ],
  ] as const;
  it.each(invalid)("%sを検査する", (_name, edit, path) => {
    const storyboard = lesson();
    edit(storyboard);
    const result = parseStoryboard(storyboard);
    expect(result.storyboard).toBeUndefined();
    expect(result.issues).toContainEqual(expect.objectContaining({ level: "error", path }));
  });
  it.each([0, 1, 8])("コードを出せない場面 %i を検査する", (index) => {
    const storyboard = lesson();
    const scene = storyboard.scenes[index];
    Object.assign(scene, {
      kind: "code",
      code: ["// 値を比べる", "const larger = 2 > 1;"],
      beats: [{ say: "値を比べます。", type: [0, 1] }],
    });
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({ level: "error", path: `scenes[${index}].kind` }),
    );
  });
  it("schema 1 では新しいrole・pause・thinkを拒む", () => {
    fails((s) => {
      s.scenes[0].role = "goal";
    }, "scenes[0].role");
    fails((s) => {
      s.scenes[0].beats[0].pause = 1;
    }, "scenes[0].beats[0].pause");
    fails((s) => {
      s.scenes[0].think = 6;
    }, "scenes[0].think");
  });
  it("next は usage のあとに複数並べられる", () => {
    const storyboard = lesson();
    const next = { ...storyboard.scenes[0], id: "next-board", role: "next" } as const;
    storyboard.scenes.push(next, { ...next, id: "next-again" });
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
    for (const role of ["usage", "note"] as const) {
      const misplaced = structuredClone(storyboard);
      misplaced.scenes.push({ ...next, role, id: "misplaced" });
      expect(parseStoryboard(misplaced).issues).toContainEqual(
        expect.objectContaining({ level: "error", path: "scenes[11].role" }),
      );
    }
    storyboard.scenes.splice(7, 0, { ...next, id: "early" });
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        path: "scenes[7].role",
        message: "next は usage のあとに置いてください",
      }),
    );
  });

  it.each([
    [[], "term"],
    [null, "term"],
    [{}, "term.text"],
    [{ text: " " }, "term.text"],
    [{ text: "長".repeat(11) }, "term.text"],
    [{ text: "改\n行" }, "term.text"],
    [{ text: "引数", note: 1 }, "term.note"],
    [{ text: "引数", note: "長".repeat(17) }, "term.note"],
    [{ text: "引数", ruby: "引数" }, "term.ruby"],
  ])("不正な term を拒む (%j)", (term, path) => {
    const storyboard = lesson();
    Object.assign(storyboard.scenes[0].beats[0], { term });
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({ level: "error", path: `scenes[0].beats[0].${path}` }),
    );
  });

  it.each([
    [{ text: "引数" }, false],
    [{ text: "のこり" }, true],
    [{ text: "引数", ruby: "ひきすう" }, true],
    [{ text: "引数", ruby: "ヒキスウー" }, true],
    ...["", "aたい", "ア・タイ", "あ".repeat(31)].map(
      (ruby) => [{ text: "引数", ruby }, false] as const,
    ),
  ] as const)("漢字のある用語には読みが必須で、ひらがなだけなら任意 (%j)", (term, valid) => {
    const storyboard = lesson();
    Object.assign(storyboard.scenes[0].beats[0], { term });
    const result = parseStoryboard(storyboard);
    if (valid) expect(result.storyboard).toEqual(storyboard);
    else
      expect(result.issues).toContainEqual(
        expect.objectContaining({ level: "error", path: "scenes[0].beats[0].term.ruby" }),
      );
  });

  it("term を schema 1 では拒み、schema 2 では3種類の場面で動きに数える", () => {
    fails((s) => {
      s.scenes[0].beats[0].term = { text: "値" };
    }, "scenes[0].beats[0].term");
    const storyboard = lesson();
    const termBeat = {
      say: "値を比べます。",
      term: { text: "値", ruby: "あたい", note: "比べるもの" },
    };
    storyboard.scenes[0].beats = [termBeat];
    Object.assign(storyboard.scenes[2], {
      kind: "code",
      show: true,
      code: ["// 値を作る", "const value = 1;"],
      panel: { kind: "figure", board: "pair" },
      beats: [termBeat],
    });
    const mixed = {
      ...storyboard,
      boards: {
        ...storyboard.boards,
        pair: {
          cols: 2,
          rows: 1,
          nodes: [
            { id: "a", label: "入力", icon: "read", at: [1, 1] },
            { id: "b", label: "出力", icon: "write", at: [2, 1] },
          ],
        },
      },
    };
    Object.assign(mixed.scenes[3], {
      kind: "view",
      image: "shot:web/sample",
      beats: [{ say: "こちらが例です。" }, termBeat],
    });
    expect(parseStoryboard(mixed).storyboard).toEqual(mixed);
  });

  const dialog = { title: "完成したコード", code: ["// 一行の説明", "const value = 1;"] };
  it.each([
    [{ title: " " }, "dialog.title"],
    [{ title: "長".repeat(25) }, "dialog.title"],
    [{ title: "改\n行" }, "dialog.title"],
    [{ code: [] }, "dialog.code"],
    [{ code: Array(9).fill("const a = 1;") }, "dialog.code"],
    [{ code: ["漢".repeat(41)] }, "dialog.code[0]"],
    [{ code: ["x".repeat(81)] }, "dialog.code[0]"],
    [{ code: ["const\tx = 1;"] }, "dialog.code[0]"],
    [{ code: ["const x = 1;\nconst y = 2;"] }, "dialog.code[0]"],
    [{ code: ["const x = 1;\u2028const y = 2;"] }, "dialog.code[0]"],
    [{ code: ["", "  // コメント", " "] }, "dialog.code"],
    [{ code: ["/* コメント", "続き */", ""] }, "dialog.code"],
  ])("不正な dialog を拒む (%j)", (change, path) => {
    const storyboard = lesson();
    Object.assign(storyboard.scenes[0].beats[0], { dialog: { ...dialog, ...change } });
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({ level: "error", path: `scenes[0].beats[0].${path}` }),
    );
  });

  it("dialog の見出し24字とコード8行を上限まで使える", () => {
    const storyboard = lesson();
    Object.assign(storyboard.scenes[0].beats[0], {
      dialog: {
        title: "題".repeat(24),
        code: ["//" + "漢".repeat(39), "", "x".repeat(80), "", "", "", "", "x = 1;"],
      },
    });
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
  });

  it("dialog は schema 1 と term を指定した文では使えない", () => {
    fails((s) => {
      s.scenes[0].beats[0].dialog = dialog;
    }, "scenes[0].beats[0].dialog");
    const storyboard = lesson();
    Object.assign(storyboard.scenes[0].beats[0], { term: { text: "よみ" }, dialog });
    expect(parseStoryboard(storyboard).issues).toContainEqual({
      level: "error",
      path: "scenes[0].beats[0].dialog",
      message: "term と dialog は同じ文に書けません",
    });
  });

  it("dialog だけでも3種類の場面で動きに数え、学ぶこと・身近な例・使う場面で使える", () => {
    const storyboard = lesson();
    const beat = { say: "値を比べます。", dialog };
    Object.assign(storyboard.scenes[0], {
      kind: "view",
      image: "shot:web/sample",
      beats: [{ say: "こちらが例です。" }, beat],
    });
    expect(storyboard.scenes[0].role).toBe("goal");
    storyboard.scenes[1].beats = [beat];
    Object.assign(storyboard.scenes[2], {
      kind: "code",
      show: true,
      code: ["const value = 1;"],
      panel: { kind: "figure", board: "pair" },
      beats: [beat],
    });
    const usage = storyboard.scenes.find((s) => s.role === "usage");
    if (!usage) throw new Error("使う場面がありません");
    usage.beats = [beat];
    const mixed = {
      ...storyboard,
      boards: {
        ...storyboard.boards,
        pair: {
          cols: 2,
          rows: 1,
          nodes: [
            { id: "a", label: "入力", icon: "read", at: [1, 1] },
            { id: "b", label: "出力", icon: "write", at: [2, 1] },
          ],
        },
      },
    };
    expect(parseStoryboard(mixed).storyboard).toEqual(mixed);
  });

  it("間だけの文は空振りになる", () => {
    const storyboard = lesson();
    storyboard.scenes[0].beats = [{ say: "値を比べます。", pause: 1 }];
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        path: "scenes[0].beats[0]",
        message: expect.stringContaining("空振り"),
      }),
    );
  });
  it.each([
    [230, undefined],
    [310, "warning"],
    [900, "error"],
  ] as const)("読み上げの長さに応じて推定時間を検査する（%i文字）", (chars, level) => {
    const storyboard = lesson();
    for (const scene of storyboard.scenes) scene.beats[0].speech = "あ".repeat(chars);
    const issue = parseStoryboard(storyboard).issues.find((i) => i.message.includes("180〜480秒"));
    expect(issue?.level).toBe(level);
  });
  it("schema 2 は空の pulse を受け付け、schema 1 は個数で拒む", () => {
    const storyboard = lesson();
    storyboard.scenes[0].beats = [
      { say: "読む場所を出します。", show: ["read"], pulse: ["read"] },
      { say: "強調はここまでです。", pulse: [] },
    ];
    expect(parseStoryboard(storyboard).issues.filter((issue) => issue.level === "error")).toEqual(
      [],
    );
    const schema1 = fresh();
    schema1.scenes[0].beats[0].pulse = [];
    expect(parseStoryboard(schema1).issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        path: "scenes[0].beats[0].pulse",
        message: expect.stringContaining("1〜32個"),
      }),
    );
  });
  it("schema 2 の pulse は強調の集合が変わるときだけ空振りにならない", () => {
    const whiffs = (beats: BoardStoryboard["scenes"][number]["beats"]) => {
      const storyboard = lesson();
      storyboard.scenes[0].beats = beats;
      return parseStoryboard(storyboard).issues.filter(
        (issue) => issue.level === "error" && issue.message.includes("空振り"),
      );
    };
    const at = expect.objectContaining({ path: "scenes[0].beats[1]" });
    expect(
      whiffs([
        { say: "読む場所を出します。", show: ["read", "quiz"], pulse: ["read"] },
        { say: "同じ場所ですね。", pulse: ["read"] },
      ]),
    ).toContainEqual(at);
    expect(
      whiffs([
        { say: "読む場所を出します。", show: ["read", "quiz"], pulse: ["read", "quiz"] },
        { say: "順を変えてみましょう。", pulse: ["quiz", "read"] },
      ]),
    ).toContainEqual(at);
    expect(
      whiffs([
        { say: "読む場所を出します。", show: ["read", "quiz"], pulse: ["read"] },
        { say: "問題を見ましょう。", pulse: ["quiz"] },
      ]),
    ).toEqual([]);
    expect(
      whiffs([
        { say: "読む場所を出します。", show: ["read"], pulse: ["read"] },
        { say: "強調はここまでです。", pulse: [] },
      ]),
    ).toEqual([]);
    expect(
      whiffs([
        { say: "読む場所を出します。", show: ["read"] },
        { say: "強調はありません。", pulse: [] },
      ]),
    ).toContainEqual(at);
    expect(
      whiffs([
        { say: "読む場所を出します。", show: ["read"], pulse: ["read"] },
        { say: "出ていない場所です。", pulse: ["quiz"] },
      ]),
    ).toContainEqual(at);
  });
  it("emphasis は文をまたぎ、場面の頭では消える", () => {
    const storyboard: VideoStoryboard = {
      schema: 2,
      brief: { ...sample.brief, points: ["値を比べる。"] },
      boards: sample.boards,
      scenes: [
        {
          id: "goal",
          role: "goal",
          title: "値を比べる",
          board: "main",
          beats: [
            { say: "読む場所を出します。", show: ["read", "quiz", "write"], pulse: ["read"] },
            { say: "出ていない場所です。", pulse: ["submit"] },
            { say: "ほかも出します。", show: ["check"] },
            { say: "問題も見ます。", pulse: ["quiz", "read", "quiz"] },
            { say: "問題を隠します。", hide: ["quiz"] },
          ],
        },
        {
          id: "example",
          role: "example",
          title: "続き",
          board: "main",
          beats: [{ say: "問題を戻します。", show: ["quiz"] }],
        },
        {
          id: "names",
          kind: "code",
          role: "syntax",
          title: "図",
          code: ["const price = 1;"],
          panel: { kind: "figure", board: "main" },
          beats: [
            { say: "行を打ちます。", type: [0] },
            { say: "読む場所を見ます。", figure: { pulse: ["read"] } },
            { say: "名前を続けます。", type: [0] },
            { say: "問題も見ます。", figure: { pulse: ["quiz", "read", "quiz"] } },
            { say: "問題を隠します。", figure: { hide: ["quiz"] } },
          ],
        },
        {
          id: "apply",
          role: "apply",
          title: "そのあと",
          board: "main",
          beats: [{ say: "確認を見ます。", focus: ["check"] }],
        },
      ],
    };
    const [first, next, code, later] = storyboardStates(storyboard);
    if (first.kind === "code" || first.kind === "view" || first.kind === "motion")
      throw new Error("最初が図解ではありません");
    expect(first.start).not.toHaveProperty("emphasis");
    expect(first.beats[0].after.emphasis).toEqual(["read"]);
    expect(first.beats[1].after.emphasis).toEqual(["read"]);
    expect(first.beats[2].before.emphasis).toEqual(["read"]);
    expect(first.beats[2].after.emphasis).toEqual(["read"]);
    expect(first.beats[3].after.emphasis).toEqual(["quiz", "read"]);
    expect(first.beats[4].after.emphasis).toEqual(["read"]);
    expect(first.end.emphasis).toEqual(["read"]);
    if (next.kind === "code" || next.kind === "view" || next.kind === "motion")
      throw new Error("次が図解ではありません");
    expect(next.start.visible).toEqual(first.end.visible);
    expect(next.start).not.toHaveProperty("emphasis");
    if (code.kind !== "code" || !code.figure) throw new Error("図の状態がありません");
    expect(code.figure.start.visible).toEqual(next.end.visible);
    expect(code.figure.start).not.toHaveProperty("emphasis");
    expect(code.figure.beats[0].after).not.toHaveProperty("emphasis");
    expect(code.figure.beats[1].after.emphasis).toEqual(["read"]);
    expect(code.figure.beats[2].after.emphasis).toEqual(["read"]);
    expect(code.figure.beats[3].after.emphasis).toEqual(["quiz", "read"]);
    expect(code.figure.beats[4].after.emphasis).toEqual(["read"]);
    expect(code.figure.end.emphasis).toEqual(["read"]);
    if (later.kind === "code" || later.kind === "view" || later.kind === "motion")
      throw new Error("最後が図解ではありません");
    expect(later.start).not.toHaveProperty("emphasis");
    expect(later.start.visible).toEqual(code.figure.end.visible);
  });
});

describe("概念図の値の札", () => {
  const tagged = () => {
    const s = fresh();
    s.scenes[0].beats = [
      { say: "読む場所を出します。", show: ["read"], tag: { read: "短い" } },
      { say: "値を変えます。", tag: { read: "長い" } },
    ];
    s.scenes[1].reset = false;
    s.scenes[1].beats = [
      { say: "札を外します。", untag: ["read"] },
      { say: "値を戻します。", tag: { read: "短い" } },
      { say: "読む場所を隠します。", hide: ["read"] },
      { say: "読む場所を出します。", show: ["read"] },
    ];
    return s;
  };
  it("札だけの変化で通り、入れ替え・場面の引き継ぎ・外す・hideを状態に反映する", () => {
    const s = tagged();
    expect(parseStoryboard(s).storyboard).toEqual(s);
    const [first, next] = storyboardStates(s);
    expect(first.start).not.toHaveProperty("tags");
    expect(first.beats[0].after.tags).toEqual({ read: "短い" });
    expect(first.end.tags).toEqual({ read: "長い" });
    expect(next.start.tags).toEqual({ read: "長い" });
    expect(next.beats[0].after).not.toHaveProperty("tags");
    expect(next.beats[1].after.tags).toEqual({ read: "短い" });
    expect(next.beats[2].after).not.toHaveProperty("tags");
    expect(next.beats[3].after).not.toHaveProperty("tags");
  });
  it.each([
    [{ tag: { read: "短い" } }, "空振り"],
    [{ tag: { quiz: "値" } }, "空振り"],
    [{ untag: ["quiz"] }, "空振り"],
    [{ tag: { web: "値" } }, "ノード"],
    [{ tag: { "write-check": "値" } }, "ノード"],
    [{ untag: ["unknown"] }, "ノード"],
    [{ tag: { read: "値" }, untag: ["read"] }, "両方"],
    [{ tag: { read: "123456789" } }, "8字"],
    [{ tag: { read: "" } }, "空でない"],
    [{ tag: { read: "値\n次" } }, "1行"],
  ] as const)("札 %j を検査する", (edit, message) => {
    const s = tagged();
    s.scenes[0].beats[1] = {
      say: "札を確認します。",
      ...structuredClone(edit),
    } as BoardStoryboard["scenes"][number]["beats"][number];
    const result = parseStoryboard(s);
    expect(result.storyboard).toBeUndefined();
    expect(result.issues).toContainEqual(
      expect.objectContaining({ level: "error", message: expect.stringContaining(message) }),
    );
  });
});

describe("コードの横の概念図", () => {
  const fixture = () => {
    const board: Board = {
      cols: 2,
      rows: 2,
      nodes: [
        { id: "total", label: "合計", icon: "file", at: [1, 2] },
        { id: "price", label: "価格", icon: "file", at: [1, 1] },
        { id: "shipping", label: "送料", icon: "file", at: [2, 1] },
      ],
      links: [
        { id: "price-shipping", from: "price", to: "shipping" },
        { id: "shipping-total", from: "shipping", to: "total" },
      ],
    };
    const code: CodeScene = {
      kind: "code",
      id: "names",
      role: "point",
      point: 1,
      title: "価格を使う",
      code: ["// 価格に名前を付ける", "const price = 1200;", "const total = price;"],
      show: [1],
      panel: { kind: "figure", board: "shop" },
      beats: [
        { say: "価格に印を付けます。", figure: { mark: [{ on: "price", kind: "check" }] } },
        {
          say: "合計に渡す値は、この価格です。",
          figure: {
            travel: { along: ["price-shipping", "shipping-total"] },
            tag: { total: "1200" },
          },
        },
      ],
    };
    const scenes: VideoStoryboard["scenes"] = [
      {
        id: "prior",
        role: "hook",
        title: "お店の例",
        board: "shop",
        beats: [
          {
            say: "お店の例を見ます。",
            show: ["price", "shipping", "total", "price-shipping", "shipping-total"],
            tag: { price: "1200" },
          },
        ],
      },
      code,
      {
        id: "later",
        role: "recap",
        title: "お店の例",
        board: "shop",
        beats: [{ say: "印を外します。", unmark: ["price"] }],
      },
    ];
    const storyboard: VideoStoryboard = {
      schema: 1,
      brief: { ...sample.brief, points: ["価格"] },
      boards: { shop: board },
      scenes,
    };
    return { storyboard, board, code };
  };

  it("図だけが変わる文が通り、board → figure → board で矢印・ノード・印・札を引き継ぐ", () => {
    const { storyboard } = fixture();
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
    const [first, code, last] = storyboardStates(storyboard);
    if (code.kind !== "code" || !code.figure) throw new Error("図の状態がありません");
    if (first.kind === "motion") throw new Error("最初が図解ではありません");
    expect(code.figure.start).toEqual(first.end);
    expect(code.figure.beats[0].after.marks).toEqual({ price: "check" });
    expect(code.figure.end.tags).toEqual({ price: "1200", total: "1200" });
    expect(last.start).toEqual(code.figure.end);
    if (last.kind === "code" || last.kind === "view" || last.kind === "motion")
      throw new Error("最後の場面が図解ではありません");
    expect(last.end.marks).toEqual({});
    expect(code.start.visible).toEqual([1]);
    expect(code.beats[0].after.visible).toEqual([1]);
    expect(code.start).not.toHaveProperty("figure");
  });

  it("reset で空から始まり、その後の board はコード場面の終了状態を使う", () => {
    const { storyboard, code } = fixture();
    code.reset = true;
    code.beats[0].figure = { show: ["price"], tag: { price: "500" } };
    code.beats[1].figure = { show: ["shipping", "total"] };
    const lastScene = storyboard.scenes[2] as BoardScene;
    lastScene.beats[0] = { say: "価格の札を外します。", untag: ["price"] };
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
    const [, state, last] = storyboardStates(storyboard);
    if (state.kind !== "code" || !state.figure) throw new Error("図の状態がありません");
    expect(state.figure.start).toEqual({ visible: [], marks: {}, zoom: "all" });
    expect(last.start).toEqual({
      visible: ["price", "shipping", "total"],
      marks: {},
      tags: { price: "500" },
      zoom: "all",
    });
  });

  it.each([
    [
      "図解がない",
      ({ code }) => {
        code.panel = { kind: "figure", board: "missing" };
      },
      "scenes[1].panel.board",
    ],
    [
      "ノードが5個",
      ({ board }) => {
        board.cols = 3;
        board.nodes.push(
          { id: "a", label: "品物", icon: "file", at: [3, 1] },
          { id: "b", label: "袋", icon: "file", at: [3, 2] },
        );
      },
      "scenes[1].panel.board",
    ],
    [
      "囲みがある",
      ({ board }) => {
        board.zones = [{ id: "area", label: "店", cells: [1, 1, 2, 2] }];
      },
      "scenes[1].panel.board",
    ],
    [
      "隣でない矢印",
      ({ board }) => {
        board.links?.push({ id: "skip", from: "price", to: "total" });
      },
      "scenes[1].panel.board",
    ],
    [
      "逆向きの矢印",
      ({ board }) => {
        board.links?.push({ id: "back", from: "shipping", to: "price" });
      },
      "scenes[1].panel.board",
    ],
    [
      "重複した矢印",
      ({ board }) => {
        board.links?.push({ id: "extra", from: "price", to: "shipping" });
      },
      "scenes[1].panel.board",
    ],
    [
      "figure パネルなしの figure",
      ({ code }) => {
        delete code.panel;
        code.beats[0].type = [0];
      },
      "scenes[1].beats[0].figure",
    ],
    [
      "figure パネルなしの reset",
      ({ code }) => {
        delete code.panel;
        code.reset = false;
      },
      "scenes[1].reset",
    ],
    [
      "reset が真偽値でない",
      ({ code }) => {
        Object.assign(code, { reset: "true" });
      },
      "scenes[1].reset",
    ],
    [
      "空の figure",
      ({ code }) => {
        code.beats[0].figure = {};
      },
      "scenes[1].beats[0].figure",
    ],
    [
      "figure の zoom",
      ({ code }) => {
        Object.assign(code.beats[0], { figure: { zoom: "all" } });
      },
      "scenes[1].beats[0].figure.zoom",
    ],
    [
      "存在しない id",
      ({ code }) => {
        code.beats[0].figure = { pulse: ["missing"] };
      },
      "scenes[1].beats[0].figure.pulse[0]",
    ],
    [
      "矢印への印",
      ({ code }) => {
        code.beats[0].figure = { mark: [{ on: "price-shipping", kind: "check" }] };
      },
      "scenes[1].beats[0].figure.mark[0].on",
    ],
    [
      "隠れた矢印をたどる",
      ({ code }) => {
        code.beats[1].figure = { hide: ["price-shipping"], travel: { along: ["price-shipping"] } };
      },
      "scenes[1].beats[1].figure.travel.along[0]",
    ],
    [
      "つながらない矢印をたどる",
      ({ code }) => {
        code.beats[1].figure = { travel: { along: ["shipping-total", "price-shipping"] } };
      },
      "scenes[1].beats[1].figure.travel.along[1]",
    ],
    [
      "空振りの図の動き",
      ({ code }) => {
        code.beats[0].figure = { show: ["price"] };
      },
      "scenes[1].beats[0]",
    ],
    [
      "行番号の範囲外",
      ({ code }) => {
        code.show = [3];
      },
      "scenes[1].show[0]",
    ],
    [
      "行番号の重複",
      ({ code }) => {
        code.show = [1, 1];
      },
      "scenes[1].show",
    ],
  ] satisfies [string, (setup: ReturnType<typeof fixture>) => void, string][])(
    "%sを検査する",
    (_name, edit, path) => {
      const setup = fixture();
      edit(setup);
      const result = parseStoryboard(setup.storyboard);
      expect(result.storyboard).toBeUndefined();
      expect(result.issues).toContainEqual(expect.objectContaining({ level: "error", path }));
    },
  );

  it("schema 2 の書き方の場面に figure パネルが必要", () => {
    const { storyboard, code } = fixture();
    storyboard.schema = 2;
    const example = storyboard.scenes[0] as BoardScene;
    storyboard.scenes = (
      ["goal", "example", "syntax", "apply", "note", "quiz", "answer", "explain", "usage"] as const
    ).map((role) =>
      role === "syntax"
        ? { ...code, role, point: undefined }
        : { ...example, id: role, role, reset: true },
    );
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
    storyboard.scenes[2] = {
      ...code,
      role: "syntax",
      point: undefined,
      panel: { kind: "values" as const, items: ["price"] },
      beats: [{ say: "価格に名前を付けます。", type: [0] }],
    };
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        path: "scenes[2].panel",
        message: expect.stringContaining("コードだけの場面は作れません"),
      }),
    );
  });

  it("figure があるコード場面で色分けだけの文を schema 2 の動きに数える", () => {
    const { storyboard, code } = fixture();
    const classify = { fixed: [{ line: 1, text: "const" }] };
    code.beats.push({ say: "書き方を色分けします。", classify });
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({ path: "scenes[1].beats[2].classify" }),
    );
    storyboard.schema = 2;
    const example = storyboard.scenes[0] as BoardScene;
    storyboard.scenes = (
      ["goal", "example", "syntax", "apply", "note", "quiz", "answer", "explain", "usage"] as const
    ).map((role) =>
      role === "syntax"
        ? { ...code, role, point: undefined }
        : { ...example, id: role, role, reset: true },
    );
    expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
    code.beats.push({ say: "同じ色分けですね。", classify });
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({
        path: "scenes[2].beats[3]",
        message: expect.stringContaining("空振り"),
      }),
    );
  });
});

it("最上位の ruby を拒む", () => {
  const storyboard = fresh();
  const { issues } = parseStoryboard({ ...storyboard, ruby: {} });
  expect(issues).toContainEqual({
    level: "error",
    path: "ruby",
    message: "ruby は廃止しました。フリガナは用語の表示 (term.ruby) だけに書きます",
  });
});

it.each([null, false, "", "あ".repeat(9), "改\n行", "改\u2028行"])(
  "part.note の形を検査する (%j)",
  (note) => {
    const storyboard = fresh();
    Object.assign(storyboard.scenes[1], {
      kind: "code",
      show: true,
      code: ["// 値を作る", "const value = 1;"],
      beats: [{ say: "値を作ります。", part: { line: 1, text: "value", note } }],
    });
    expect(parseStoryboard(storyboard).issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        path: "scenes[1].beats[0].part.note",
      }),
    );
  },
);

it("part.note だけの変更も絵が変わる動きに数える", () => {
  const storyboard = fresh();
  Object.assign(storyboard.scenes[1], {
    kind: "code",
    show: true,
    code: ["// 値を作る", "const value = 1;"],
    beats: [
      { say: "値を作ります。", part: { line: 1, text: "value", note: "値" } },
      { say: "英語の意味です。", part: { line: 1, text: "value", note: "価値" } },
    ],
  });
  expect(parseStoryboard(storyboard).storyboard).toEqual(storyboard);
});

describe("motion の場面", () => {
  const source = () =>
    JSON.parse(
      readFileSync(
        resolve(
          stages,
          "devlab-ts-ch01/modules/u01-let-const/l1-let-const/t1-read-problem/video.json",
        ),
        "utf8",
      ),
    );

  it("重ね表示の文を数に含めず、場面の状態を並びに残す", () => {
    const json = source();
    const { storyboard, issues } = parseStoryboard(json);
    expect(issues.filter(({ level }) => level === "error")).toEqual([]);
    if (!storyboard) throw new Error("絵コンテがありません");
    expect(storyboardStates(storyboard)[0]).toEqual({ kind: "motion" });
  });

  it("前後の view 場面で再生済みクリップのコマを引き継がない", () => {
    const { storyboard } = parseStoryboard(source());
    if (!storyboard) throw new Error("絵コンテがありません");
    const clip = "web/demo#open";
    const [previous, motion, next] = storyboardStates({
      ...storyboard,
      scenes: [
        {
          kind: "view",
          id: "previous",
          role: "goal",
          title: "手前",
          image: "shot:web/demo",
          beats: [{ say: "操作します。", clip }],
        },
        storyboard.scenes[0],
        {
          kind: "view",
          id: "next",
          role: "example",
          title: "次",
          image: `clip:${clip}`,
          beats: [{ say: "結果です。" }],
        },
      ],
    });
    expect(previous).toMatchObject({ kind: "view", end: { lastFrame: true } });
    expect(motion).toEqual({ kind: "motion" });
    expect(next.start).not.toHaveProperty("lastFrame");
  });

  it.each([
    [
      "scenes[0].motion",
      "vending-change",
      (json) => {
        json.scenes[0].motion = "toString";
      },
    ],
    [
      "scenes[0].beats",
      "この動きは 5 文ぶんです",
      (json) => {
        json.scenes[0].beats.splice(0, 1);
      },
    ],
    [
      "scenes[0].kind",
      "schema 2",
      (json) => {
        json.schema = 1;
      },
    ],
    [
      "scenes[0].point",
      "指定できない",
      (json) => {
        json.scenes[0].point = 1;
      },
    ],
    [
      "scenes[0].think",
      "指定できない",
      (json) => {
        json.scenes[0].think = 6;
      },
    ],
    [
      "scenes[0].image",
      "指定できない",
      (json) => {
        json.scenes[0].image = "art:order";
      },
    ],
    [
      "scenes[0].beats[0].show",
      "指定できない",
      (json) => {
        json.scenes[0].beats[0].show = [];
      },
    ],
    [
      "scenes[0].beats[0].spot",
      "指定できない",
      (json) => {
        json.scenes[0].beats[0].spot = [];
      },
    ],
    [
      "scenes[0].beats[0].say",
      "くだけた文末",
      (json) => {
        json.scenes[0].beats[0].say = "自動販売機ですね。";
      },
    ],
  ] satisfies [string, string, (json: ReturnType<typeof source>) => void][])(
    "%s を検査する",
    (path, message, edit) => {
      const json = source();
      edit(json);
      const result = parseStoryboard(json);
      expect(result.storyboard).toBeUndefined();
      expect(result.issues).toContainEqual({
        level: "error",
        path,
        message: expect.stringContaining(message),
      });
    },
  );
});

import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  expandFocus,
  normalizeStoryboard,
  parseStoryboard,
  storyboardStates,
  type VideoStoryboard,
} from "./video-storyboard.js";
const stages = resolve(import.meta.dirname, "../stages");
const sample = JSON.parse(
  readFileSync(
    resolve(
      stages,
      "dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop/video.json",
    ),
    "utf8",
  ),
) as VideoStoryboard;
const fresh = () => structuredClone(sample);
function fails(edit: (s: VideoStoryboard) => void, path: string) {
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
    for (const file of globSync("**/video.json", { cwd: stages }))
      expect(
        parseStoryboard(JSON.parse(readFileSync(resolve(stages, file), "utf8"))).issues.filter(
          (i) => i.level === "error",
        ),
        file,
      ).toEqual([]);
  });
  it("未知の値や必須項目を複数集める", () => {
    expect(parseStoryboard(null).issues.length).toBeGreaterThan(5);
    const result = parseStoryboard({
      schema: 2,
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
  const cases: [string, (s: VideoStoryboard) => void, string][] = [
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
  it("短い時間は警告、180秒超はエラー", () => {
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
});

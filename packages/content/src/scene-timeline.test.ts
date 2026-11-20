import { describe, expect, it } from "vitest";
import {
  sceneCaptionAt,
  sceneSpeeches,
  sceneTimelines,
  sceneVideoSequence,
  sceneTitleOpacity,
  SCENE_TIMING,
} from "./scene-timeline.js";
import type { Scene, ViewBeat } from "./video-storyboard.js";
import { viewBusyRanges } from "./scene-view.js";
const scenes = [0, 1, 2].map(
  (_, i): Scene => ({
    id: String(i),
    role: i === 0 ? "hook" : i === 2 ? "recap" : "point",
    title: "図解",
    board: "main",
    beats: [{ say: "文です。" }, { say: "次です。" }],
  }),
);
it("タイトルと絵コンテの文・場面を保ち、最後の余韻に0.8秒のフェードを足す", () => {
  const durations = [
    [1, 2],
    [1, 2],
    [1, 2],
  ];
  const original = sceneTimelines(scenes, durations);
  const sequence = sceneVideoSequence(
    scenes,
    durations,
    {
      title: "学ぶ流れ",
      header: "開発環境",
      takeaway: "Webで読み、VS Codeで書きます。",
    },
    {},
    { title: 1 },
  );
  expect(sequence[0]).toEqual({
    scene: { kind: "text", id: "title", title: "学ぶ流れ", header: "開発環境", duration: 2.6 },
    timing: { start: 0, duration: 2.6, beats: [{ start: 0.6, end: 1.6, say: "学ぶ流れ" }] },
    sourceIndex: -1,
  });
  for (const [i, entry] of sequence.slice(1).entries()) {
    expect(entry.scene).toBe(scenes[i]);
    expect(entry.sourceIndex).toBe(i);
    expect(entry.timing).toEqual({
      ...original[i],
      start: original[i].start + 2.6,
      ...(i === scenes.length - 1
        ? {
            duration: Math.round((original[i].duration + 0.8) * 30) / 30,
            fadeOut: { start: original[i].duration, duration: 0.8 },
          }
        : {}),
    });
  }
  expect(sequence.at(-1)?.scene).toBe(scenes.at(-1));
  expect(sequence.map((entry) => entry.scene.id)).toEqual(["title", "0", "1", "2"]);
  expect(sequence.reduce((n, e) => n + e.timing.duration, 0)).toBeCloseTo(
    original.reduce((n, t) => n + t.duration, 0) + 2.6 + 0.8,
  );
});
it.each([0.2, 1.2, 1.8, 5, 5.013])("読み上げ%s秒から長さを決め、30fpsへ切り上げる", (speech) => {
  const sequence = sceneVideoSequence(
    [],
    [],
    { title: "タイトル", takeaway: "まとめ" },
    {},
    {
      title: speech,
    },
  );
  for (const [i, minimum, lead, tail, fade] of [[0, 2.6, 0.6, 0.8, 0.4]]) {
    const { timing, scene } = sequence[i];
    const expected = Math.max(minimum, lead + speech + tail);
    expect(timing.duration).toBeGreaterThanOrEqual(expected - 1e-9);
    expect(timing.duration).toBeLessThan(expected + 1 / 30);
    expect(timing.duration * 30).toBeCloseTo(Math.round(timing.duration * 30));
    expect(scene).toMatchObject({ duration: timing.duration });
    expect(timing.beats[0].start).toBe(lead);
    expect(timing.beats[0].end).toBeCloseTo(lead + speech);
    expect(timing.duration - fade).toBeGreaterThan(timing.beats[0].end);
  }
  expect(sequence).toHaveLength(1);
});
it.each([0.013, 1.2, 5.017])(
  "最後の読み上げ%s秒の通常の余韻の後に、24フレームのフェードを置く",
  (speech) => {
    const scene = scenes[0];
    const original = sceneTimelines([scene], [[speech, speech]])[0];
    const sequence = sceneVideoSequence([scene], [[speech, speech]], {
      title: "タイトル",
      takeaway: "読まない",
    });
    const last = sequence[1].timing;
    expect(last.fadeOut).toEqual({ start: original.duration, duration: 0.8 });
    if (!last.fadeOut) throw new Error("フェードがありません");
    expect(last.fadeOut.start - last.beats[1].end).toBeGreaterThanOrEqual(
      SCENE_TIMING.between + SCENE_TIMING.tail - 1e-9,
    );
    expect(last.duration).toBeCloseTo(original.duration + 0.8);
    expect(last.duration * 30).toBeCloseTo(Math.round(last.duration * 30));
    expect(sequence[0].timing.fadeOut).toBeUndefined();
  },
);
it("見積もりにも読み辞書を使い、headerは読み上げに含めない", () => {
  const topic = { title: "STELLA", header: "読まない見出し", takeaway: "Ctrl + S（Mac は ⌘ + S）" };
  const readings = {
    STELLA: "ステラで学習を進めます",
    "Ctrl + S（Mac は ⌘ + S）": "保存のショートカットキーを押します",
  };
  const sequence = sceneVideoSequence([], [], { ...topic, readings });
  expect(sequence.map(({ scene }) => sceneSpeeches(scene, readings))).toEqual([[readings.STELLA]]);
  expect(sequence[0].timing.duration).toBeGreaterThan(
    sceneVideoSequence([], [], topic)[0].timing.duration,
  );
});
it.each([
  [0, 0],
  [0.2, 0.5],
  [1, 1],
  [2.6, 1],
  [2.8, 0.5],
  [3, 0],
  [10, 0],
])("タイトルの不透明度: %s秒で%s", (time, expected) => {
  expect(sceneTitleOpacity(time)).toBeCloseTo(expected);
});
describe("場面の時刻", () => {
  it("冒頭・文間・末尾の間を足し、30fpsの境界へ丸める", () => {
    const t = sceneTimelines(scenes, [
      [1, 2],
      [1.01, 2.01],
      [1, 2],
    ]);
    expect(t[0].beats).toEqual([
      { say: "文です。", start: 0.8, end: 1.8 },
      { say: "次です。", start: 3, end: 5 },
    ]);
    expect(t[0].duration).toBeCloseTo(7.4);
    expect(t[1].start).toBe(t[0].duration);
    expect(t[2].start).toBe(t[0].duration + t[1].duration);
    expect(t[2].duration).toBeCloseTo(7.4);
    expect(t[2].duration - t[2].beats[1].end).toBeCloseTo(SCENE_TIMING.between + SCENE_TIMING.tail);
    for (const scene of t) expect(scene.duration * 30).toBeCloseTo(Math.round(scene.duration * 30));
  });
  it("字幕は場面内の時刻で読み上げ中だけ返し、sayを変えない", () => {
    const t = sceneTimelines(scenes, [
      [1, 2],
      [1, 2],
      [1, 2],
    ]);
    t[0].beats[0].say = "<b>&";
    for (const [time, say] of [
      [0, ""],
      [0.8, "<b>&"],
      [1.799, "<b>&"],
      [1.8, ""],
      [2.999, ""],
      [3, "次です。"],
      [5, ""],
      [t[0].duration, ""],
    ] as const)
      expect(sceneCaptionAt(t[0], time)).toBe(say);
    expect(sceneCaptionAt(t[1], 0.8)).toBe("文です。");
    expect(sceneCaptionAt({ start: 0, duration: 1, beats: [] }, 0)).toBe("");
  });
});

it("操作と切り替えと0.6秒を待ち、字幕は音声が終わるところまで", () => {
  const clip = {
    video: "fixture.mp4",
    width: 1600,
    height: 1000,
    fps: 30,
    duration: 20,
    marks: { open: [2, 12] as [number, number] },
    regions: {},
  };
  const scene: Scene = {
    kind: "view",
    id: "s",
    role: "hook",
    title: "操作",
    image: "shot:vscode/one",
    beats: [
      { say: "操作します。", clip: "web/action#open", speed: 2 },
      { say: "読みます。", zoom: "all" },
    ],
  };
  const t = sceneTimelines([scene], [[1, 8]], { "web/action": clip })[0];
  expect(t.beats[0].start).toBe(0.8);
  expect(t.beats[0].clip?.start).toBeCloseTo(1.8);
  expect(t.beats[0].clip?.end).toBeCloseTo(6.8);
  expect(t.beats[0].end).toBeCloseTo(7.4);
  expect(t.beats[1].start).toBeCloseTo(8.6);
  expect(t.beats[0].speechStart).toBeCloseTo(1.2);
  expect(t.beats[0].speechEnd).toBeCloseTo(2.2);
  expect(sceneCaptionAt(t, 0.8)).toBe("");
  expect(sceneCaptionAt(t, 2.199)).toBe("操作します。");
  expect(sceneCaptionAt(t, 2.2)).toBe("");
  const longSpeech = sceneTimelines([scene], [[10, 8]], { "web/action": clip })[0];
  expect(longSpeech.beats[0].end).toBeCloseTo(11.2);
  expect(longSpeech.beats[1].start).toBeCloseTo(12.4);
  scene.beats[0] = { say: "操作します。", clip: "web/action#open" };
  scene.image = "clip:web/action#open";
  const opening = sceneTimelines(
    [{ ...scene, image: "shot:vscode/one", beats: [] }, scene],
    [[], [1, 8]],
    { "web/action": clip },
  )[1];
  expect(opening.beats[0].clip?.start).toBeCloseTo(1);
  expect(opening.beats[0].speechStart).toBeUndefined();
  expect(opening.beats[0].speechEnd).toBeCloseTo(1.8);
});

it.each(["shot:vscode/one", "clip:vscode/action#open"])(
  "文の開始で %s に切り替えると読み上げと字幕だけ0.4秒遅らせる",
  (target) => {
    const scene: Scene = {
      kind: "view",
      id: "switch",
      role: "point",
      title: "切り替え",
      image: "shot:web/one",
      beats: [
        { say: "最初です。" },
        {
          say: "切り替えます。",
          ...(target.startsWith("clip:") ? { clip: target.slice(5) } : { image: target }),
        },
        { say: "続けます。" },
        { say: "同じアプリです。", image: "shot:vscode/two" },
      ],
    };
    const timing = sceneTimelines([scene], [[1.013, 2, 1, 1]])[0];
    const beat = timing.beats[1];
    expect(SCENE_TIMING.switchSpeechDelay).toBe(0.4);
    expect(beat.start).toBeCloseTo(3.013);
    expect(beat.speechStart).toBeCloseTo(3.413);
    expect(beat.speechEnd).toBeCloseTo(5.413);
    expect(beat.end).toBeCloseTo(5.413);
    expect(timing.beats[2].start).toBeCloseTo(6.613);
    for (const i of [0, 2, 3]) {
      expect(timing.beats[i].speechStart).toBeUndefined();
      expect(timing.beats[i].end - timing.beats[i].start).toBeCloseTo(i === 0 ? 1.013 : 1);
    }
    const speechStart = beat.speechStart ?? beat.start;
    expect(sceneCaptionAt(timing, beat.start)).toBe("");
    expect(sceneCaptionAt(timing, speechStart - 0.001)).toBe("");
    expect(sceneCaptionAt(timing, speechStart)).toBe(beat.say);
    expect(sceneCaptionAt(timing, beat.end - 0.001)).toBe(beat.say);
    expect(sceneCaptionAt(timing, beat.end)).toBe("");
    const firstCaptionFrame = Math.ceil(speechStart * 30) / 30;
    expect(viewBusyRanges(timing)).toContainEqual([speechStart, speechStart + 1 / 30]);
    expect(
      viewBusyRanges(timing).some(([a, b]) => a <= firstCaptionFrame && firstCaptionFrame <= b),
    ).toBe(true);
  },
);

it.each([
  { spot: ["button"] },
  { label: [{ at: "button", text: "押す" }] },
  { click: "button" },
] satisfies Partial<ViewBeat>[])(
  "強調 %j は読み終わりから1.5秒待ち、字幕は先に消える",
  (highlight) => {
    const scene: Scene = {
      kind: "view",
      id: "s",
      role: "hook",
      title: "操作",
      image: "shot:web/one",
      beats: [
        { say: "押します。", ...highlight },
        { say: "次です。", zoom: "all" },
      ],
    };
    const t = sceneTimelines([scene], [[0.5, 1]])[0];
    expect(SCENE_TIMING.highlightHold).toBe(1.5);
    expect(t.beats[0].speechEnd).toBeCloseTo(1.3);
    expect(t.beats[0].end).toBeCloseTo(2.8);
    expect(t.beats[1].start).toBeCloseTo(4);
    expect(t.beats[1].speechEnd).toBeUndefined();
    expect(sceneCaptionAt(t, 1.299)).toBe("押します。");
    expect(sceneCaptionAt(t, 1.3)).toBe("");
    expect(sceneCaptionAt(t, 3)).toBe("");
  },
);

it("空のspot・labelには待ち時間を足さず、操作が長ければその終わりを待つ", () => {
  const scene: Scene = {
    kind: "view",
    id: "s",
    role: "hook",
    title: "操作",
    image: "clip:web/action#open",
    beats: [{ say: "読みます。", spot: [], label: [] }],
  };
  expect(sceneTimelines([scene], [[1]])[0].beats[0]).toEqual({
    start: 0.8,
    end: 1.8,
    say: "読みます。",
  });
  scene.beats[0] = { say: "押します。", clip: "web/action#open", click: "button" };
  const clips = {
    "web/action": {
      video: "fixture.mp4",
      width: 1600,
      height: 1000,
      fps: 30,
      duration: 10,
      marks: { open: [0, 6] as [number, number] },
      regions: {},
    },
  };
  const t = sceneTimelines([scene], [[1]], clips)[0];
  expect(t.beats[0].end).toBeCloseTo(7.4);
  expect(t.beats[0].speechEnd).toBeCloseTo(1.8);
  expect(sceneTimelines([scene], [[8]], clips)[0].beats[0].end).toBeCloseTo(10.3);
});

it("schema 2 の文間・余韻と pause は読み上げとは別に計る", () => {
  const scene: Scene = {
    ...scenes[0],
    role: "goal",
    beats: [{ say: "文です。", pause: 2 }, { say: "次です。" }],
  };
  const [timing] = sceneTimelines([scene], [[1, 2]], {}, 2);
  const [first, last] = timing.beats;
  expect(first.speechEnd).toBeCloseTo(1.8);
  expect(first.end).toBeCloseTo(3.8);
  expect(last.start - first.end).toBeCloseTo(1.6);
  expect(timing.duration - last.end).toBeCloseTo(2.4);
  expect(sceneCaptionAt(timing, 2)).toBe("");
  expect(
    sceneTimelines(scenes, [
      [1, 2],
      [1, 2],
      [1, 2],
    ]),
  ).toEqual(
    sceneTimelines(
      scenes,
      [
        [1, 2],
        [1, 2],
        [1, 2],
      ],
      {},
      1,
    ),
  );
});

it.each([undefined, 3.5])("問題の強調と pause のあとに考える時間 %s を置く", (think) => {
  const quiz: Scene = {
    kind: "view",
    id: "quiz",
    role: "quiz",
    title: "問題",
    image: "shot:web/one",
    think,
    beats: [{ say: "答えは何ですか？", spot: ["question"], pause: 2 }],
  };
  const sequence = sceneVideoSequence(
    [quiz],
    [[2]],
    { title: "学ぶ流れ", takeaway: "確認する" },
    {},
    undefined,
    2,
  );
  const { timing } = sequence[1];
  expect(timing.beats[0].end - (timing.beats[0].speechEnd ?? 0)).toBeCloseTo(3.5);
  expect(timing.think?.start).toBeCloseTo(timing.beats[0].end + 0.6);
  expect(timing.think?.duration).toBe(think ?? 6);
  expect(sceneCaptionAt(timing, (timing.think?.start ?? 0) + 1)).toBe("");
  expect(timing.fadeOut?.start).toBeCloseTo(timing.beats[0].end + 0.6 + (think ?? 6) + 2.4);
  expect(timing.duration * SCENE_TIMING.fps).toBeCloseTo(
    Math.round(timing.duration * SCENE_TIMING.fps),
  );
});

it("用語は読み終わりから1.5秒保ち、そのあとに pause と文間を足す", () => {
  const scene: Scene = {
    id: "term",
    role: "syntax",
    title: "引数",
    board: "main",
    beats: [
      { say: "引数です。", term: { text: "引数" }, pause: 1 },
      { say: "次の文です。", term: { text: "値" } },
    ],
  };
  const [{ beats }] = sceneTimelines([scene], [[2, 3]], {}, 2);
  expect(beats[0].speechEnd).toBeCloseTo(2.8);
  expect(beats[0].end).toBeCloseTo(5.3);
  expect(beats[1].start).toBeCloseTo(6.9);
  expect(beats[1].end - (beats[1].speechEnd ?? 0)).toBeCloseTo(1.5);
  expect(sceneCaptionAt({ start: 0, duration: 15, beats }, 4)).toBe("");
});

it("ダイアログは読み終わりから2.5秒保ち、そのあとに pause と文間を足す", () => {
  const dialog = { title: "完成したコード", code: ["const value = 1;"] };
  const scene: Scene = {
    kind: "view",
    id: "goal",
    role: "goal",
    title: "学ぶこと",
    image: "shot:web/example",
    beats: [
      { say: "コードを読みます。", dialog, pause: 1.5, label: [{ at: "editor", text: "コード" }] },
      { say: "次のコードです。", dialog },
    ],
  };
  const [timing] = sceneTimelines([scene], [[2, 3]], {}, 2);
  const [first, second] = timing.beats;
  expect(first.speechEnd).toBeCloseTo(2.8);
  expect(first.end).toBeCloseTo(2.8 + 2.5 + 1.5);
  expect(second.start).toBeCloseTo(first.end + 1.6);
  expect(second.end - (second.speechEnd ?? 0)).toBeCloseTo(2.5);
  expect(sceneCaptionAt(timing, first.start + 0.4)).toBe(first.say);
  expect(sceneCaptionAt(timing, first.end - 1 / 30)).toBe("");
});

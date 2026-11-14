import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { sceneTimelines } from "../../src/scene-timeline.js";
import { storyboardStates, type BoardStoryboard } from "../../src/video-storyboard.js";
import { sceneHtml, type ScenePageWindow } from "./scene-html.js";
const sample = JSON.parse(
  readFileSync(new URL("../../src/__fixtures__/board-video.json", import.meta.url), "utf8"),
) as BoardStoryboard;
function page(index: number, sb = sample) {
  const states = storyboardStates(sb),
    timelines = sceneTimelines(
      sb.scenes,
      sb.scenes.map((s) => s.beats.map(() => 2)),
    );
  const html = sceneHtml({
    board: sb.boards.main,
    scene: sb.scenes[index],
    state: states[index],
    timing: timelines[index],
    index,
    total: sb.scenes.length,
    previous: sb.scenes[index - 1],
  });
  const script = /<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "";
  interface TestElement {
    attrs: Record<string, string>;
    style: Record<string, string>;
    setAttribute: (key: string, value: string) => void;
    querySelector: (selector: string) => TestElement | null;
    querySelectorAll: () => never[];
    getTotalLength: () => number;
  }
  const elements = new Map<string, TestElement>();
  const document = {
    getElementById: (id: string): TestElement => {
      let el = elements.get(id);
      if (!el) {
        const attrs: Record<string, string> = {};
        el = {
          attrs,
          style: {},
          setAttribute: (k, v) => {
            attrs[k] = v;
          },
          querySelector: (selector) =>
            selector === ".ring"
              ? document.getElementById(`ring-${id}`)
              : selector === ".link" && sb.boards.main.links?.some((l) => id === `element-${l.id}`)
                ? document.getElementById(`path-${id}`)
                : null,
          getTotalLength: () => 100,
          querySelectorAll: () => [],
        };
        elements.set(id, el);
      }
      return el;
    },
    querySelectorAll: () => [],
  };
  const window = {} as ScenePageWindow;
  runInNewContext(script, { window, document });
  return { window, elements, html, timing: timelines[index] };
}
describe("場面HTMLの時刻による描画", () => {
  it("単体で実行でき、同じ時刻は前の呼び出し順に依存しない", () => {
    const p = page(4);
    p.window.__setTime(1);
    const snap = JSON.stringify([...p.elements]);
    p.window.__setTime(7);
    p.window.__setTime(0);
    p.window.__setTime(1);
    expect(JSON.stringify([...p.elements])).toBe(snap);
  });
  it("空の囲みは大きいまま引き継ぎ、最初のノードで0.5秒かけて縮む", () => {
    const hook = page(0),
      places = page(1);
    hook.window.__setTime(hook.timing.duration);
    places.window.__setTime(0);
    for (const id of ["web", "vscode"]) {
      const icon = `zone-icon-${id}`,
        label = `zone-label-${id}`;
      expect(hook.elements.get(icon)?.attrs.width).toBe("160");
      expect(places.elements.get(icon)?.attrs).toEqual(hook.elements.get(icon)?.attrs);
      expect(places.elements.get(label)?.attrs["font-size"]).toBe("64");
    }
    const start = places.timing.beats[0].start;
    places.window.__setTime(start + 0.25);
    expect(Number(places.elements.get("zone-icon-web")?.attrs.width)).toBeCloseTo(98);
    places.window.__setTime(start + 0.5);
    expect(places.elements.get("zone-icon-web")?.attrs.width).toBe("36");
    expect(places.elements.get("zone-label-web")?.attrs["font-size"]).toBe("36");
    expect(places.elements.get("zone-icon-vscode")?.attrs.width).toBe("160");
    const snap = JSON.stringify([...places.elements]);
    places.window.__setTime(places.timing.duration);
    places.window.__setTime(start + 0.5);
    expect(JSON.stringify([...places.elements])).toBe(snap);
  });
  it("zone経由のノードとリンクは薄くせず、直接指定した要素だけ強調する", () => {
    for (const direct of [undefined, "read", "read-quiz"]) {
      const sb = structuredClone(sample);
      const beat = sb.scenes[1].beats[0];
      beat.show = ["read", "quiz", "read-quiz"];
      beat.focus = direct ? ["web", direct] : ["web"];
      const p = page(1, sb);
      p.window.__setTime(p.timing.beats[0].start + 1);
      for (const id of ["read", "quiz", "read-quiz"])
        expect(p.elements.get(`element-${id}`)?.attrs.opacity).toBe("1");
      expect(p.elements.get("ring-element-read")?.attrs.opacity).toBe(
        direct === "read" ? "1" : "0",
      );
      expect(p.elements.get("ring-element-quiz")?.attrs.opacity).toBe("0");
      expect(p.elements.get("path-element-read-quiz")?.attrs.stroke).toBe(
        direct === "read-quiz" ? "#E62F9A" : "#5C5C66",
      );
      expect(p.elements.get("ring-element-web")?.attrs.stroke).toBe("#2563EB");
      expect(Number(p.elements.get("element-vscode")?.attrs.opacity)).toBeCloseTo(0.3);
    }
  });
  it("最初のノードと囲み内のリンクは0.3秒遅れて現れ、囲みと境界をまたぐリンクはすぐ動く", () => {
    const sb = structuredClone(sample);
    sb.scenes[1].beats[0].show = ["read", "quiz", "read-quiz", "write", "quiz-write"];
    const p = page(1, sb),
      start = p.timing.beats[0].start;
    p.window.__setTime(start + 0.2);
    expect(Number(p.elements.get("zone-icon-web")?.attrs.width)).toBeLessThan(160);
    for (const id of ["read", "quiz", "read-quiz", "write"])
      expect(p.elements.get(`element-${id}`)?.attrs.opacity).toBe("0");
    expect(p.elements.get("path-element-read-quiz")?.attrs["stroke-dashoffset"]).toBe("100");
    expect(p.elements.get("path-element-read-quiz")?.attrs["marker-end"]).toBe("");
    expect(Number(p.elements.get("element-quiz-write")?.attrs.opacity)).toBeGreaterThan(0);
    p.window.__setTime(start + 0.55);
    expect(Number(p.elements.get("element-read")?.attrs.opacity)).toBeCloseTo(0.875);
    expect(
      Number(p.elements.get("path-element-read-quiz")?.attrs["stroke-dashoffset"]),
    ).toBeCloseTo(12.5);
    const snap = JSON.stringify([...p.elements]);
    p.window.__setTime(p.timing.duration);
    p.window.__setTime(start + 0.55);
    expect(JSON.stringify([...p.elements])).toBe(snap);
    p.window.__setTime(start + 0.81);
    expect(p.elements.get("element-read")?.attrs.opacity).toBe("1");
    expect(p.elements.get("path-element-read-quiz")?.attrs["stroke-dashoffset"]).toBe("0");
    expect(p.elements.get("path-element-read-quiz")?.attrs["marker-end"]).toBe("url(#arrow)");
    expect(p.window.__busyRanges.some(([a, b]) => a <= start + 0.3 && b >= start + 0.8)).toBe(true);
  });
  it("すでにノードのあるzoneへの追加と、zone外のノードは遅らせない", () => {
    const p = page(1),
      start = p.timing.beats[1].start;
    p.window.__setTime(start + 0.2);
    expect(Number(p.elements.get("element-quiz")?.attrs.opacity)).toBeGreaterThan(0);
    expect(
      Number(p.elements.get("path-element-read-quiz")?.attrs["stroke-dashoffset"]),
    ).toBeLessThan(100);
    const sb = structuredClone(sample);
    sb.boards.main.zones = [];
    sb.scenes[1].beats[0].focus = [];
    const outside = page(1, sb);
    outside.window.__setTime(outside.timing.beats[0].start + 0.2);
    expect(Number(outside.elements.get("element-read")?.attrs.opacity)).toBeGreaterThan(0);
  });
  it("focus・pulseの矢じりは線と同じaccentになり、最後に通常色に戻る", () => {
    const spec = sample.scenes[3].beats[0];
    const original = structuredClone(spec);
    try {
      for (const effect of ["focus", "pulse"] as const) {
        spec[effect] = ["write-check"];
        const p = page(3),
          start = p.timing.beats[0].start;
        p.window.__setTime(start + 0.3);
        const path = p.elements.get("path-element-write-check");
        expect(path?.attrs.stroke).toBe("#E62F9A");
        expect(path?.attrs["marker-end"]).toBe("url(#arrow-accent)");
        p.window.__setTime(p.timing.beats[0].end + 0.25);
        expect(path?.attrs.stroke).toBe("#5C5C66");
        expect(path?.attrs["marker-end"]).toBe("url(#arrow)");
        delete spec[effect];
      }
    } finally {
      Object.assign(spec, original);
      delete spec.pulse;
    }
  });
  it("toneのある囲みのfocusは自分の色を保ち、pulseはaccentを使う", () => {
    const zone = sample.boards.main.zones?.[0];
    if (!zone) throw new Error("囲みがありません");
    const original = zone.tone;
    const spec = sample.scenes[0].beats[1];
    const originalBeat = structuredClone(spec);
    try {
      for (const [tone, color] of [
        ["blue", "#2563EB"],
        ["violet", "#8330C7"],
      ] as const) {
        zone.tone = tone;
        spec.focus = [zone.id];
        const p = page(0);
        p.window.__setTime(p.timing.beats[1].start + 0.3);
        const ring = p.elements.get(`ring-element-${zone.id}`);
        expect(ring?.attrs).toMatchObject({
          stroke: color,
          "stroke-opacity": "1",
          "stroke-width": "4",
          fill: color,
          "fill-opacity": "0.10",
        });
        p.window.__setTime(p.timing.beats[1].end + 0.25);
        expect(ring?.attrs.opacity).toBe("0");
        expect(ring?.attrs.stroke).toBe("#E62F9A");
        delete spec.focus;
        spec.pulse = [zone.id];
        const pulse = page(0);
        pulse.window.__setTime(pulse.timing.beats[1].start + 0.3);
        expect(pulse.elements.get(`ring-element-${zone.id}`)?.attrs.stroke).toBe("#E62F9A");
        delete spec.pulse;
      }
      delete zone.tone;
      spec.focus = [zone.id];
      expect(page(0).html).toContain('fill="rgba(230,47,154,0.08)" stroke="#E62F9A"');
    } finally {
      zone.tone = original;
      for (const key of ["focus", "pulse"] as const) delete spec[key];
      Object.assign(spec, originalBeat);
    }
  });
  it("矢じりは通常色とaccentの三角形で、印は白縁と白い記号を持つ", () => {
    const { html } = page(0);
    expect(html).toContain('d="M1 1L9 5L1 9Z" fill="#5C5C66"');
    expect(html).toContain('d="M1 1L9 5L1 9Z" fill="#E62F9A"');
    for (const color of ["#16A34A", "#E5342B", "#5C5C66", "#E62F9A"])
      expect(html).toContain(`r="28" fill="${color}" stroke="white" stroke-width="3"`);
    expect(html).toContain('stroke-opacity="0.45"');
    expect(html).toContain('fill-opacity="0.05"');
  });
  it("前の場面の可視状態とカメラから始まる", () => {
    const p = page(3);
    p.window.__setTime(0);
    expect(p.elements.get("element-check")?.attrs.opacity).toBe("1");
    expect(p.elements.get("diagram")?.attrs.viewBox).not.toBe("0 170 1920 760");
  });
  it("focusは文の間だけで、その後に不透明度が戻る", () => {
    const p = page(3);
    p.window.__setTime(1);
    expect(Number(p.elements.get("element-write")?.attrs.opacity)).toBeCloseTo(0.3);
    p.window.__setTime(p.timing.beats[0].end + 0.25);
    expect(p.elements.get("element-write")?.attrs.opacity).toBe("1");
  });
  it("showと白からのフェードが時刻だけで決まる", () => {
    const p = page(0);
    p.window.__setTime(0);
    expect(p.elements.get("white")?.style.opacity).toBe("1");
    expect(p.elements.get("element-web")?.attrs.opacity).toBe("0");
    p.window.__setTime(p.timing.beats[0].start + 0.25);
    expect(Number(p.elements.get("element-web")?.attrs.opacity)).toBeGreaterThan(0);
    expect(Number(p.elements.get("element-web")?.attrs.opacity)).toBeLessThan(1);
    p.window.__setTime(p.timing.beats[0].start + 0.7);
    expect(p.elements.get("element-web")?.attrs.opacity).toBe("1");
  });
  it("travelの全文区間とfocusを戻す区間はbusyに含む", () => {
    const p = page(3),
      b = p.timing.beats[1];
    expect(p.window.__busyRanges.some(([start, end]) => start <= b.start && end >= b.end)).toBe(
      true,
    );
    expect(
      p.window.__busyRanges.some(([start, end]) => start === p.timing.beats[0].end && end > start),
    ).toBe(true);
  });
  it("字幕を焼き込まず、外部リソースと時計を含まない", () => {
    const { html } = page(4);
    expect(html.split("<script>")[0]).not.toContain(sample.scenes[4].beats[0].say);
    expect(html).not.toMatch(/(?:src|href)="https?:/);
    expect(html).not.toMatch(/requestAnimationFrame|setInterval|Date\.now|transition:/);
    expect(html).toContain("file://");
  });
});

it("イラストの上端からラベルの72px枠の上までを画像に使う", () => {
  const sb = structuredClone(sample);
  sb.art = { read: { prompt: "Learner" } };
  sb.boards.main.nodes[0].art = "read";
  const html = page(0, sb).html;
  const node = /<g id="element-read">([\s\S]*?)<g class="mark">/.exec(html)?.[1] ?? "";
  const image = /<image [^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/.exec(node);
  const box = JSON.parse(/data-fit='([^']+)'/.exec(node)?.[1] ?? "{}");
  expect(box.h).toBe(72);
  expect(Number(image?.[1]) + Number(image?.[2])).toBe(box.y);
  const cardY = Number(/<rect [^>]*y="([\d.]+)"/.exec(node)?.[1]);
  expect(Number(image?.[1]) - cardY).toBe(8);
});

it("1行のノードとリンクのラベル枠は文字サイズの1.5倍以上ある", () => {
  const { html } = page(4);
  for (const match of html.matchAll(
    /<text data-fit='([^']+)'[^>]*font-size="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g,
  )) {
    if ((match[3].match(/<tspan/g) ?? []).length !== 1) continue;
    expect(JSON.parse(match[1]).h).toBeGreaterThanOrEqual(Number(match[2]) * 1.5);
  }
});

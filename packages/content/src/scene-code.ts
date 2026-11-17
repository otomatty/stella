import type { SceneTimeline } from "./scene-timeline.js";
import type { Issue } from "./video-storyboard.js";

export interface CodeBeat {
  say: string;
  speech?: string;
  type?: number[];
  focus?: number[];
  part?: { line: number; text: string };
  set?: Record<string, string>;
  calc?: { on: string; expr: string; result: string };
  row?: number[];
  mark?: { line: number; kind: "cross" | "check" }[];
  clear?: number[];
}
export interface CodeScene {
  kind: "code";
  id: string;
  role: "hook" | "point" | "recap";
  point?: number;
  title: string;
  code: string[];
  show?: boolean;
  panel?:
    | { kind: "values"; items: string[] }
    | { kind: "calls"; rows: { call: string; result: string; note?: string }[] };
  beats: CodeBeat[];
}
export interface CodeState {
  visible: number[];
  values: Record<string, string>;
  rows: number[];
  marks: Record<number, "cross" | "check">;
}
export interface CodeSceneState {
  kind: "code";
  start: CodeState;
  beats: { before: CodeState; after: CodeState }[];
  end: CodeState;
}
export function codeSceneState(scene: CodeScene): CodeSceneState {
  const start: CodeState = {
    visible: scene.show ? scene.code.map((_, i) => i) : [],
    values: {},
    rows: [],
    marks: {},
  };
  let current = start;
  const beats = scene.beats.map((beat) => {
    const before = structuredClone(current);
    current = structuredClone(current);
    for (const line of beat.clear ?? []) {
      current.visible = current.visible.filter((n) => n !== line);
      delete current.marks[line];
    }
    current.visible = [...new Set([...current.visible, ...(beat.type ?? [])])].sort(
      (a, b) => a - b,
    );
    current.values = { ...current.values, ...beat.set };
    if (beat.calc) current.values = { ...current.values, [beat.calc.on]: beat.calc.result };
    current.rows = [...new Set([...current.rows, ...(beat.row ?? [])])].sort((a, b) => a - b);
    for (const mark of beat.mark ?? []) current.marks[mark.line] = mark.kind;
    return { before, after: structuredClone(current) };
  });
  return { kind: "code", start, beats, end: structuredClone(current) };
}
/** ASCII は半角、それ以外は全角として数える。 */
export function codeLineWidth(text: string): number {
  return Array.from(text).reduce((n, c) => n + (/[\x20-\x7e\uff61-\uff9f]/u.test(c) ? 0.5 : 1), 0);
}
/** 不正な形は状態計算に渡さず、JSON の誤りをまとめて報告する。 */
export function validateCodeScene(input: Record<string, unknown>, path: string): Issue[] {
  const issues: Issue[] = [];
  const error = (p: string, message: string) => issues.push({ level: "error", path: p, message });
  const obj = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const text = (v: unknown, p: string) => {
    if (typeof v !== "string" || !v.trim() || /[\r\n\t]/u.test(v))
      error(p, "空でない1行の文字列にしてください");
  };
  const list = (v: unknown, p: string, max = 14): unknown[] => {
    if (!Array.isArray(v)) {
      error(p, "配列にしてください");
      return [];
    }
    if (!v.length || v.length > max) error(p, `1〜${max}個にしてください`);
    return v;
  };
  const code = list(input.code, `${path}.code`);
  code.forEach((v, i) => {
    if (typeof v !== "string" || /[\r\n\t]/u.test(v))
      error(`${path}.code[${i}]`, "1行の文字列にしてください（字下げは空白）");
    else if (codeLineWidth(v) > 40) error(`${path}.code[${i}]`, "全角換算40字以内にしてください");
  });
  if (input.show !== undefined && typeof input.show !== "boolean")
    error(`${path}.show`, "真偽値にしてください");
  const panel = obj(input.panel) ? input.panel : undefined;
  const names = new Set<string>();
  let rowCount = 0;
  if (input.panel !== undefined) {
    if (!panel || !["values", "calls"].includes(String(panel.kind)))
      error(`${path}.panel`, "values・callsのパネルにしてください");
    else if (panel.kind === "values") {
      for (const [i, v] of list(panel.items, `${path}.panel.items`).entries()) {
        text(v, `${path}.panel.items[${i}]`);
        if (typeof v === "string") {
          if (names.has(v)) error(`${path}.panel.items[${i}]`, "名前が重複しています");
          names.add(v);
        }
      }
    } else {
      const rows = list(panel.rows, `${path}.panel.rows`);
      rowCount = rows.length;
      rows.forEach((v, i) => {
        const p = `${path}.panel.rows[${i}]`;
        if (!obj(v)) {
          error(p, "オブジェクトにしてください");
          return;
        }
        text(v.call, `${p}.call`);
        text(v.result, `${p}.result`);
        if (v.note !== undefined) text(v.note, `${p}.note`);
      });
    }
  }
  const line = (v: unknown, p: string, count = code.length) => {
    if (!Number.isInteger(v) || Number(v) < 0 || Number(v) >= count)
      error(p, "存在する行の0始まりの番号にしてください");
  };
  const box = (v: unknown, p: string) => {
    if (panel?.kind !== "values" || typeof v !== "string" || !names.has(v))
      error(p, "valuesパネルの存在する箱の名前にしてください");
  };
  if (!Array.isArray(input.beats)) return issues;
  input.beats.forEach((b, i) => {
    if (!obj(b)) return;
    const p = `${path}.beats[${i}]`;
    for (const key of ["type", "focus", "clear", "row"] as const) {
      if (b[key] === undefined) continue;
      if (key === "row" && panel?.kind !== "calls")
        error(`${p}.row`, "rowはcallsパネルだけに指定できます");
      const values = list(b[key], `${p}.${key}`);
      values.forEach((v, j) => {
        line(v, `${p}.${key}[${j}]`, key === "row" ? rowCount : code.length);
      });
      if (new Set(values).size !== values.length) error(`${p}.${key}`, "番号が重複しています");
    }
    if (b.part !== undefined) {
      if (!obj(b.part)) error(`${p}.part`, "オブジェクトにしてください");
      else {
        line(b.part.line, `${p}.part.line`);
        text(b.part.text, `${p}.part.text`);
        if (
          typeof b.part.text === "string" &&
          typeof code[Number(b.part.line)] === "string" &&
          !(code[Number(b.part.line)] as string).includes(b.part.text)
        )
          error(`${p}.part.text`, "行に存在する部分を指定してください");
      }
    }
    if (b.set !== undefined) {
      if (!obj(b.set) || !Object.keys(b.set).length)
        error(`${p}.set`, "名前と値のオブジェクトにしてください");
      else
        for (const [name, value] of Object.entries(b.set)) {
          box(name, `${p}.set.${name}`);
          text(value, `${p}.set.${name}`);
        }
    }
    if (b.calc !== undefined) {
      if (!obj(b.calc)) error(`${p}.calc`, "オブジェクトにしてください");
      else {
        box(b.calc.on, `${p}.calc.on`);
        text(b.calc.expr, `${p}.calc.expr`);
        text(b.calc.result, `${p}.calc.result`);
      }
    }
    if (b.mark !== undefined)
      list(b.mark, `${p}.mark`).forEach((m, j) => {
        const q = `${p}.mark[${j}]`;
        if (!obj(m)) {
          error(q, "オブジェクトにしてください");
          return;
        }
        line(m.line, `${q}.line`);
        if (m.kind !== "cross" && m.kind !== "check")
          error(`${q}.kind`, "cross・checkから選んでください");
      });
  });
  if (issues.length || !(input.beats as unknown[]).every(obj)) return issues;
  const scene = input as unknown as CodeScene;
  const states = codeSceneState(scene);
  scene.beats.forEach((beat, i) => {
    const p = `${path}.beats[${i}]`,
      { before, after } = states.beats[i];
    for (const n of [
      ...(beat.focus ?? []),
      ...(beat.part ? [beat.part.line] : []),
      ...(beat.mark ?? []).map((m) => m.line),
    ])
      if (!after.visible.includes(n)) error(p, "強調・印は出ている行に指定してください");
    if ((beat.type ?? []).some((n) => beat.clear?.includes(n)))
      error(p, "同じ行をtypeとclearに指定できません");
    if (beat.calc && Object.hasOwn(beat.set ?? {}, beat.calc.on))
      error(p, "同じ箱をsetとcalcに指定できません");
    const previous = scene.beats[i - 1];
    const focusChanged = after.visible.some((line) => {
      if (!scene.code[line]) return false;
      const wasDim = !!previous?.focus?.length && !previous.focus.includes(line);
      const isDim = !!beat.focus?.length && !beat.focus.includes(line);
      return wasDim !== isDim;
    });
    const visualState = (state: CodeState) => ({
      ...state,
      visible: state.visible.filter((line) => scene.code[line].length > 0),
    });
    const partChanged = JSON.stringify(previous?.part) !== JSON.stringify(beat.part);
    if (
      JSON.stringify(visualState(before)) === JSON.stringify(visualState(after)) &&
      !focusChanged &&
      !partChanged &&
      !beat.calc
    )
      error(p, "絵が変わる動きを指定してください（空振りです）");
  });
  return issues;
}

/** 全行を順に打つ。Unicodeの文字単位で、全体を読み上げ時間の7割以内に終える。 */
export function codeFrame(
  scene: CodeScene,
  state: CodeSceneState,
  timing: SceneTimeline,
  time: number,
) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  let index = -1;
  timing.beats.forEach((b, i) => {
    if (time >= b.start) index = i;
  });
  const beat = index < 0 ? undefined : scene.beats[index];
  const timed = index < 0 ? undefined : timing.beats[index];
  const before = index < 0 ? state.start : state.beats[index].before;
  const after = index < 0 ? state.start : state.beats[index].after;
  const elapsed = timed ? time - timed.start : 0;
  const duration = timed ? (timed.speechEnd ?? timed.end) - (timed.speechStart ?? timed.start) : 0;
  const typed = (beat?.type ?? []).filter((n) => !before.visible.includes(n));
  const total = typed.reduce((n, line) => n + Array.from(scene.code[line]).length, 0);
  const typingDuration = Math.min(total * 0.055, duration * 0.7);
  let remaining = Math.floor(
    total * (typingDuration > 0 ? clamp(elapsed / typingDuration) : 1) + 1e-9,
  );
  const lengths: Record<number, number> = {};
  for (const n of typed) {
    lengths[n] = Math.min(remaining, Array.from(scene.code[n]).length);
    remaining -= lengths[n];
  }
  return {
    lines: scene.code.map((text, n) => ({
      text: after.visible.includes(n)
        ? Array.from(text)
            .slice(0, lengths[n] ?? Infinity)
            .join("")
        : "",
      visible: after.visible.includes(n),
      dim: !!beat?.focus?.length && !beat.focus.includes(n),
      mark:
        after.visible.includes(n) &&
        (lengths[n] === undefined || lengths[n] === Array.from(text).length)
          ? after.marks[n]
          : undefined,
    })),
    part: beat?.part,
    values: after.values,
    oldValues: before.values,
    rows: after.rows,
    newRows: beat?.row ?? [],
    activeValues: [...Object.keys(beat?.set ?? {}), ...(beat?.calc ? [beat.calc.on] : [])],
    valueProgress: clamp(elapsed / 0.6),
    calc: beat?.calc,
    resultProgress: clamp(
      (elapsed - Math.min(0.65, duration * 0.25)) / Math.min(0.4, Math.max(0.01, duration * 0.2)),
    ),
    typingDuration,
  };
}

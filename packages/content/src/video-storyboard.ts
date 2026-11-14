/** 絵コンテの契約・状態遷移。I/O と描画に依存しない。 */
import { estimateSpeechSeconds } from "./narration.js";

export const VIDEO_ICONS = {
  browser: "panels-top-left",
  editor: "code-xml",
  read: "book-open",
  quiz: "list-checks",
  write: "pencil",
  check: "circle-check",
  send: "send",
  result: "clipboard-list",
  repeat: "repeat",
  file: "file",
  folder: "folder",
  person: "user",
  question: "circle-help",
  idea: "lightbulb",
  search: "search",
  download: "download",
  extension: "puzzle",
  save: "save",
  terminal: "terminal",
  ai: "sparkles",
  clock: "clock",
  flag: "flag",
} as const;
export type IconName = keyof typeof VIDEO_ICONS;
export interface Zone {
  tone?: "blue" | "violet";
  id: string;
  label: string;
  icon?: IconName;
  cells: [number, number, number, number];
}
export interface Node {
  id: string;
  label: string;
  icon: IconName;
  at: [number, number];
}
export interface Link {
  id: string;
  from: string;
  to: string;
  label?: string;
  route?: "direct" | "under" | "over";
}
export interface Board {
  cols: number;
  rows: number;
  zones?: Zone[];
  nodes: Node[];
  links?: Link[];
}
export type MarkKind = "check" | "cross" | "question" | "redo";
export interface Beat {
  say: string;
  speech?: string;
  show?: string[];
  hide?: string[];
  focus?: string[];
  pulse?: string[];
  mark?: { on: string; kind: MarkKind }[];
  unmark?: string[];
  travel?: { along: string[]; icon?: IconName };
  zoom?: string[] | "all";
}
export interface Scene {
  id: string;
  role: "hook" | "point" | "recap";
  point?: number;
  title: string;
  board: string;
  reset?: boolean;
  beats: Beat[];
}
export interface VideoStoryboard {
  schema: 1;
  polish?: { model: string; sayHash: string };
  brief: { goal: string; stuck: string; points: string[]; leaveOut: string[] };
  boards: Record<string, Board>;
  scenes: Scene[];
}
export interface Issue {
  level: "error" | "warning";
  path: string;
  message: string;
}
export interface BoardState {
  visible: string[];
  marks: Record<string, MarkKind>;
  zoom: string[] | "all";
}
export interface BeatState {
  before: BoardState;
  after: BoardState;
  focus: string[];
  pulse: string[];
}
export interface SceneState {
  start: BoardState;
  beats: BeatState[];
  end: BoardState;
}
export const emptyBoardState = (): BoardState => ({ visible: [], marks: {}, zoom: "all" });
const cloneState = (s: BoardState): BoardState => ({
  visible: [...s.visible],
  marks: { ...s.marks },
  zoom: s.zoom === "all" ? "all" : [...s.zoom],
});

/** zone の焦点には内側のノードと、両端が内側のリンクを含む。 */
export function expandFocus(board: Board, ids: string[]): string[] {
  const result = new Set(ids);
  for (const zone of board.zones ?? []) {
    if (!result.has(zone.id)) continue;
    const [x, y, w, h] = zone.cells;
    const inside = new Set(
      board.nodes
        .filter((n) => n.at[0] >= x && n.at[0] < x + w && n.at[1] >= y && n.at[1] < y + h)
        .map((n) => n.id),
    );
    for (const id of inside) result.add(id);
    for (const link of board.links ?? [])
      if (inside.has(link.from) && inside.has(link.to)) result.add(link.id);
  }
  return [...result];
}
export function storyboardStates(storyboard: VideoStoryboard): SceneState[] {
  const states: SceneState[] = [];
  for (const [i, scene] of storyboard.scenes.entries()) {
    const start =
      i > 0 && storyboard.scenes[i - 1].board === scene.board && !scene.reset
        ? cloneState(states[i - 1].end)
        : emptyBoardState();
    let current = cloneState(start);
    const beats = scene.beats.map((beat) => {
      const before = cloneState(current);
      const visible = new Set(current.visible);
      for (const id of beat.show ?? []) visible.add(id);
      for (const id of beat.hide ?? []) visible.delete(id);
      const marks = { ...current.marks };
      for (const id of beat.unmark ?? []) delete marks[id];
      for (const mark of beat.mark ?? []) if (visible.has(mark.on)) marks[mark.on] = mark.kind;
      current = { visible: [...visible].sort(), marks, zoom: beat.zoom ?? current.zoom };
      return {
        before,
        after: cloneState(current),
        focus: expandFocus(storyboard.boards[scene.board], beat.focus ?? []),
        pulse: beat.pulse ?? [],
      };
    });
    states.push({ start, beats, end: cloneState(current) });
  }
  return states;
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function parseStoryboard(json: unknown): { storyboard?: VideoStoryboard; issues: Issue[] } {
  const issues: Issue[] = [];
  let usable = true;
  const error = (path: string, message: string) => issues.push({ level: "error", path, message });
  const obj = (v: unknown, p: string): Record<string, unknown> => {
    if (record(v)) return v;
    usable = false;
    error(p, "オブジェクトにしてください");
    return {};
  };
  const str = (v: unknown, p: string, max = Infinity) => {
    if (typeof v !== "string") usable = false;
    if (typeof v !== "string" || !v.trim() || Array.from(v).length > max)
      error(p, `空でない文字列${max < Infinity ? `（${max}字以内）` : ""}にしてください`);
  };
  const arr = (v: unknown, p: string, min: number, max: number): unknown[] => {
    if (!Array.isArray(v)) {
      usable = false;
      error(p, "配列にしてください");
      return [];
    }
    if (v.length < min || v.length > max) error(p, `${min}〜${max}個にしてください`);
    return v;
  };
  const integer = (v: unknown, p: string, min: number, max: number) => {
    if (typeof v !== "number") usable = false;
    if (!Number.isInteger(v) || Number(v) < min || Number(v) > max)
      error(p, `${min}〜${max}の整数にしてください`);
  };
  const icon = (v: unknown, p: string) => {
    if (typeof v !== "string" || !Object.hasOwn(VIDEO_ICONS, v))
      error(p, "許可されたアイコン名にしてください");
  };
  const tuple = (v: unknown, p: string, size: number) =>
    arr(v, p, size, size).forEach((n, i) => {
      integer(n, `${p}[${i}]`, 1, 6);
    });
  const root = obj(json, "$");
  if (root.schema !== 1) error("schema", "1にしてください");
  if (root.polish !== undefined) {
    const polish = obj(root.polish, "polish");
    str(polish.model, "polish.model");
    str(polish.sayHash, "polish.sayHash");
  }
  const brief = obj(root.brief, "brief");
  for (const key of ["goal", "stuck"]) str(brief[key], `brief.${key}`);
  for (const key of ["points", "leaveOut"])
    arr(brief[key], `brief.${key}`, 1, key === "points" ? 3 : Infinity).forEach((v, i) => {
      str(v, `brief.${key}[${i}]`);
    });
  const boards = obj(root.boards, "boards");
  if (!Object.keys(boards).length) error("boards", "図解を1つ以上置いてください");
  for (const [name, value] of Object.entries(boards)) {
    str(name, "boardsの名前");
    const p = `boards.${name}`,
      b = obj(value, p);
    integer(b.cols, `${p}.cols`, 1, 6);
    integer(b.rows, `${p}.rows`, 1, 3);
    for (const kind of ["zones", "nodes", "links"] as const) {
      if (kind !== "nodes" && b[kind] === undefined) continue;
      arr(
        b[kind],
        `${p}.${kind}`,
        kind === "nodes" ? 1 : 0,
        kind === "zones" ? 3 : kind === "nodes" ? 6 : 8,
      ).forEach((value, i) => {
        const q = `${p}.${kind}[${i}]`,
          el = obj(value, q);
        str(el.id, `${q}.id`);
        if (kind !== "links" || el.label !== undefined)
          str(el.label, `${q}.label`, kind === "zones" ? 12 : kind === "nodes" ? 10 : 6);
        if (kind === "nodes" || el.icon !== undefined) icon(el.icon, `${q}.icon`);
        if (kind === "nodes") tuple(el.at, `${q}.at`, 2);
        if (kind === "zones") {
          tuple(el.cells, `${q}.cells`, 4);
          if (el.tone !== undefined && el.tone !== "blue" && el.tone !== "violet")
            error(`${q}.tone`, "blue・violetから選んでください");
        }
        if (kind === "links") {
          str(el.from, `${q}.from`);
          str(el.to, `${q}.to`);
          if (
            el.route !== undefined &&
            (typeof el.route !== "string" || !["direct", "under", "over"].includes(el.route))
          )
            error(`${q}.route`, "direct・under・overから選んでください");
        }
      });
    }
  }
  arr(root.scenes, "scenes", 3, 6).forEach((value, i) => {
    const p = `scenes[${i}]`,
      s = obj(value, p);
    str(s.id, `${p}.id`);
    str(s.title, `${p}.title`, 16);
    str(s.board, `${p}.board`);
    if (typeof s.role !== "string" || !["hook", "point", "recap"].includes(s.role))
      error(`${p}.role`, "hook・point・recapから選んでください");
    if (s.role === "point")
      integer(s.point, `${p}.point`, 1, Array.isArray(brief.points) ? brief.points.length : 3);
    else if (s.point !== undefined) error(`${p}.point`, "pointの場面だけに指定してください");
    if (s.reset !== undefined && typeof s.reset !== "boolean")
      error(`${p}.reset`, "真偽値にしてください");
    arr(s.beats, `${p}.beats`, 1, 5).forEach((value, j) => {
      const q = `${p}.beats[${j}]`,
        beat = obj(value, q);
      str(beat.say, `${q}.say`, 40);
      if (
        typeof beat.say === "string" &&
        (!/^[^。?？]*[。?？]$/.test(beat.say) ||
          /[\r\n()[\]{}（）「」『』【】<>*_`#~|→/…\\]/u.test(beat.say) ||
          /^\s*(?:[-+>]|\d+[.)])\s/u.test(beat.say))
      )
        error(`${q}.say`, "文末を1つにした1文にし、括弧・改行・Markdown・禁止記号を除いてください");
      if (beat.speech !== undefined) str(beat.speech, `${q}.speech`);
      for (const key of ["show", "hide", "focus", "pulse", "unmark", "zoom"]) {
        if (beat[key] === undefined || (key === "zoom" && beat[key] === "all")) continue;
        arr(beat[key], `${q}.${key}`, 1, 32).forEach((id, k) => {
          str(id, `${q}.${key}[${k}]`);
        });
      }
      if (beat.mark !== undefined)
        arr(beat.mark, `${q}.mark`, 1, 9).forEach((v, k) => {
          const m = obj(v, `${q}.mark[${k}]`);
          str(m.on, `${q}.mark[${k}].on`);
          if (
            typeof m.kind !== "string" ||
            !["check", "cross", "question", "redo"].includes(m.kind)
          )
            error(`${q}.mark[${k}].kind`, "check・cross・question・redoから選んでください");
        });
      if (beat.travel !== undefined) {
        const t = obj(beat.travel, `${q}.travel`);
        arr(t.along, `${q}.travel.along`, 1, 8).forEach((id, k) => {
          str(id, `${q}.travel.along[${k}]`);
        });
        if (t.icon !== undefined) icon(t.icon, `${q}.travel.icon`);
      }
    });
  });
  if (!usable) return { issues };
  const sb = json as VideoStoryboard;
  const unique = (ids: string[], p: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) error(p, `id「${id}」が重複しています`);
      seen.add(id);
    }
  };
  unique(
    sb.scenes.map((s) => s.id),
    "scenes",
  );
  for (const [name, b] of Object.entries(sb.boards)) {
    const p = `boards.${name}`;
    unique(
      [...(b.zones ?? []), ...b.nodes, ...(b.links ?? [])].map((e) => e.id),
      p,
    );
    unique(
      b.nodes.map((n) => n.at.join(",")),
      `${p}.nodes.at`,
    );
    b.nodes.forEach((n, i) => {
      if (n.at[0] > b.cols || n.at[1] > b.rows) error(`${p}.nodes[${i}].at`, "グリッドの外です");
    });
    (b.zones ?? []).forEach((z, i) => {
      const [x, y, w, h] = z.cells;
      if (x + w - 1 > b.cols || y + h - 1 > b.rows)
        error(`${p}.zones[${i}].cells`, "グリッドの外です");
      for (const other of (b.zones ?? []).slice(0, i)) {
        const [a, c, d, e] = other.cells;
        if (x < a + d && a < x + w && y < c + e && c < y + h)
          error(`${p}.zones[${i}].cells`, "囲みが重なっています");
      }
    });
    (b.links ?? []).forEach((l, i) => {
      for (const key of ["from", "to"] as const)
        if (!b.nodes.some((n) => n.id === l[key]))
          error(`${p}.links[${i}].${key}`, "存在しないノードです");
    });
  }
  const pointNumbers: number[] = [];
  sb.scenes.forEach((s, i) => {
    const p = `scenes[${i}]`;
    const expected = i === 0 ? "hook" : i === sb.scenes.length - 1 ? "recap" : "point";
    if (s.role !== expected) error(`${p}.role`, `${expected}の場面にしてください`);
    if (s.point !== undefined) pointNumbers.push(s.point);
    if (!Object.hasOwn(sb.boards, s.board)) {
      error(`${p}.board`, "存在しない図解です");
      return;
    }
    const b = sb.boards[s.board];
    const ids = new Set([...(b.zones ?? []), ...b.nodes, ...(b.links ?? [])].map((e) => e.id));
    s.beats.forEach((beat, j) => {
      const q = `${p}.beats[${j}]`;
      for (const key of ["show", "hide", "focus", "pulse", "unmark", "zoom"] as const) {
        const refs = beat[key];
        if (!refs || refs === "all") continue;
        refs.forEach((id, k) => {
          if (!ids.has(id)) error(`${q}.${key}[${k}]`, `存在しないid「${id}」です`);
        });
      }
      beat.mark?.forEach((m, k) => {
        if (!b.nodes.some((n) => n.id === m.on) && !b.zones?.some((z) => z.id === m.on))
          error(`${q}.mark[${k}].on`, "ノードか囲みを指定してください");
      });
      beat.unmark?.forEach((id) => {
        if (b.links?.some((l) => l.id === id))
          error(`${q}.unmark`, "ノードか囲みを指定してください");
      });
      beat.travel?.along.forEach((id, k) => {
        if (!b.links?.some((l) => l.id === id))
          error(`${q}.travel.along[${k}]`, "存在しない矢印です");
      });
    });
  });
  sb.brief.points.forEach((_, i) => {
    if (!pointNumbers.includes(i + 1)) error("scenes", `要点${i + 1}の場面がありません`);
  });
  if (pointNumbers.some((n, i) => i > 0 && n < pointNumbers[i - 1]))
    error("scenes", "要点の番号は昇順にしてください");
  // 参照の誤りがあっても、ほかの場面の空振り・時間の指摘まで集める。
  const analysisBoards: Record<string, Board> = Object.fromEntries([
    ...Object.entries(sb.boards),
    ...sb.scenes
      .filter((s) => !Object.hasOwn(sb.boards, s.board))
      .map((s) => [s.board, { cols: 1, rows: 1, nodes: [] } satisfies Board]),
  ]);
  const states = storyboardStates({ ...sb, boards: analysisBoards });
  sb.scenes.forEach((s, i) => {
    s.beats.forEach((b, j) => {
      const q = `scenes[${i}].beats[${j}]`,
        state = states[i].beats[j];
      const visible = new Set(state.after.visible);
      const change =
        (b.show ?? []).some((id) => !state.before.visible.includes(id) && visible.has(id)) ||
        (b.hide ?? []).some((id) => state.before.visible.includes(id) && !visible.has(id)) ||
        (b.focus ?? []).some((id) => visible.has(id)) ||
        (b.pulse ?? []).some((id) => visible.has(id)) ||
        (b.mark ?? []).some((m) => visible.has(m.on) && state.before.marks[m.on] !== m.kind) ||
        (b.unmark ?? []).some((id) => state.before.marks[id] !== undefined && visible.has(id)) ||
        b.travel !== undefined ||
        (b.zoom !== undefined && JSON.stringify(state.before.zoom) !== JSON.stringify(b.zoom));
      if (!change) error(q, "絵が変わる動きを指定してください（空振りです）");
      const links = b.travel?.along.map((id) =>
        analysisBoards[s.board].links?.find((l) => l.id === id),
      );
      links?.forEach((l, k) => {
        if (!l) return;
        if (!visible.has(l.id)) error(`${q}.travel.along[${k}]`, "出ている矢印だけをたどれます");
        if (k > 0 && links[k - 1]?.to !== l.from)
          error(`${q}.travel.along[${k}]`, "矢印がつながっていません");
      });
    });
  });
  const last = sb.scenes.length - 1;
  if (
    last >= 0 &&
    analysisBoards[sb.scenes[last].board].nodes.some(
      (n) => !states[last].end.visible.includes(n.id),
    )
  )
    issues.push({
      level: "warning",
      path: `scenes[${last}]`,
      message: "まとめの終わりで全ノードが出ていません",
    });
  const seconds = sb.scenes.reduce(
    (n, s, i) =>
      n +
      0.5 +
      (i === last ? 1.5 : 0.7) +
      s.beats.reduce((t, b) => t + estimateSpeechSeconds(b.speech ?? b.say) + 0.35, 0),
    0,
  );
  if (seconds < 50 || seconds > 130)
    issues.push({
      level: seconds > 180 ? "error" : "warning",
      path: "scenes",
      message: `推定時間${seconds.toFixed(1)}秒は50〜130秒の範囲外です`,
    });
  return { storyboard: issues.some((i) => i.level === "error") ? undefined : sb, issues };
}
/** キー順に依存しない正規化。配列の意味のある順序は保つ。 */
export function normalizeStoryboard(value: unknown): string {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : record(v)
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .filter((k) => v[k] !== undefined)
              .map((k) => [k, canonical(v[k])]),
          )
        : v;
  return JSON.stringify(canonical(value));
}

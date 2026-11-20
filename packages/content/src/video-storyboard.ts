export type { CodeScene, CodeBeat } from "./scene-code.js";
import {
  codeSceneState,
  validateCodeScene,
  validateCodeLines,
  validateCodeMotion,
  type CodeScene,
  type CodeSceneState,
} from "./scene-code.js";
/** 絵コンテの契約・状態遷移。I/O と描画に依存しない。 */
import { parseVideoArt, type VideoArt } from "./video-art.js";
import { SHOT_ID, type ShotRegion } from "./video-shots.js";
import { estimateSpeechSeconds } from "./narration.js";
import { sceneTimelines } from "./scene-timeline.js";

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
  icon?: IconName;
  art?: string;
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
const LESSON_SEQUENCE: readonly Exclude<keyof typeof LESSON_ROLE_LABELS, "note">[] = [
  "goal",
  "example",
  "syntax",
  "apply",
  "quiz",
  "answer",
  "explain",
  "usage",
  "next",
] as const;
const LESSON_ROLE_LABELS = {
  goal: "学ぶこと",
  example: "身近な例",
  syntax: "書き方",
  apply: "例を書く",
  note: "補足",
  quiz: "問題",
  answer: "答え合わせ",
  explain: "解説",
  usage: "使う場面",
  next: "次の課題",
} as const;
export type SceneRole = "hook" | "point" | "recap" | keyof typeof LESSON_ROLE_LABELS;

export function sceneRoleLabel(scene: Pick<Scene, "role" | "point" | "kind">): string {
  switch (scene.role) {
    case "hook":
      return scene.kind === "code" ? "つかみ" : "";
    case "point":
      return `要点 ${scene.point}`;
    case "recap":
      return "問題へ";
    default:
      return LESSON_ROLE_LABELS[scene.role];
  }
}

export interface BoardMotion {
  show?: string[];
  hide?: string[];
  focus?: string[];
  pulse?: string[];
  mark?: { on: string; kind: MarkKind }[];
  unmark?: string[];
  tag?: Record<string, string>;
  untag?: string[];
  travel?: { along: string[]; icon?: IconName };
  zoom?: string[] | "all";
}
export interface NarratedBeat {
  say: string;
  speech?: string;
  pause?: number;
  term?: { text: string; ruby?: string; note?: string };
  dialog?: { title: string; code: string[] };
}
export interface Beat extends BoardMotion, NarratedBeat {}
export interface BoardScene {
  kind?: "board";
  id: string;
  role: SceneRole;
  think?: number;
  point?: number;
  title: string;
  board: string;
  reset?: boolean;
  beats: Beat[];
}
export interface ClipInfo {
  video: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  marks: Record<string, [number, number]>;
  regions: Record<string, ShotRegion>;
  browser?: { tab: string; address: string };
}
export function clipReference(ref: string) {
  const match = /^([a-z0-9-]+\/[a-z0-9-]+)#([a-z0-9-]+)$/.exec(ref);
  return match ? { id: match[1], mark: match[2] } : undefined;
}
export interface ViewBeat extends NarratedBeat {
  image?: string;
  clip?: string;
  speed?: number;
  spot?: string[];
  zoom?: string;
  label?: { at: string; text: string }[];
  click?: string;
}
export interface ViewScene {
  kind: "view";
  id: string;
  role: SceneRole;
  think?: number;
  point?: number;
  title: string;
  image: string;
  beats: ViewBeat[];
}
export type Scene = BoardScene | ViewScene | CodeScene;
export function sceneBoardName(scene: Scene): string | undefined {
  if (scene.kind === "view") return undefined;
  if (scene.kind === "code") return scene.panel?.kind === "figure" ? scene.panel.board : undefined;
  return scene.board;
}

export function figureNodes(board: Board): Node[] {
  return [...board.nodes].sort((a, b) => a.at[1] - b.at[1] || a.at[0] - b.at[0]);
}
export interface StoryboardContext {
  clips?: Record<string, ClipInfo>;
  shots: Record<string, { width: number; height: number; regions: Record<string, ShotRegion> }>;
  artFiles: Set<string>;
}
export interface VideoStoryboard {
  schema: 1 | 2;
  polish?: { model: string; sayHash: string };
  brief: { goal: string; stuck: string; points: string[]; leaveOut: string[] };
  art?: Record<string, Omit<VideoArt, "aspect"> & { aspect?: VideoArt["aspect"] }>;
  boards?: Record<string, Board>;
  scenes: Scene[];
}
export type BoardStoryboard = Omit<VideoStoryboard, "boards" | "scenes"> & {
  boards: Record<string, Board>;
  scenes: BoardScene[];
};
export interface Issue {
  level: "error" | "warning";
  path: string;
  message: string;
}
export interface BoardState {
  visible: string[];
  marks: Record<string, MarkKind>;
  tags?: Record<string, string>;
  zoom: string[] | "all";
}
export interface BeatState {
  before: BoardState;
  after: BoardState;
  focus: string[];
  pulse: string[];
}
export interface SceneState {
  kind?: "board";
  start: BoardState;
  beats: BeatState[];
  end: BoardState;
}
export const emptyBoardState = (): BoardState => ({ visible: [], marks: {}, zoom: "all" });
const cloneState = (s: BoardState): BoardState => ({
  visible: [...s.visible],
  marks: { ...s.marks },
  ...(s.tags && Object.keys(s.tags).length ? { tags: { ...s.tags } } : {}),
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
export interface ViewState {
  /** 再生後は最後のコマを次の文・場面にも引き継ぐ。 */
  lastFrame?: boolean;
  image: string;
  spot: string[];
  zoom: string;
  label: { at: string; text: string }[];
  click?: string;
}
export interface ViewSceneState {
  kind: "view";
  start: ViewState;
  beats: { before: ViewState; after: ViewState }[];
  end: ViewState;
}
export function storyboardStates(storyboard: BoardStoryboard): SceneState[];
export function storyboardStates(
  storyboard: VideoStoryboard,
): (SceneState | ViewSceneState | CodeSceneState)[];
export function storyboardStates(
  storyboard: VideoStoryboard,
): (SceneState | ViewSceneState | CodeSceneState)[] {
  const states: (SceneState | ViewSceneState | CodeSceneState)[] = [];
  const boards = storyboard.boards ?? {};
  let lastBoard: { name: string; end: BoardState } | undefined;
  for (const scene of storyboard.scenes) {
    if (scene.kind === "code") {
      const figure =
        scene.panel?.kind === "figure"
          ? boardState(
              scene.panel.board,
              scene.reset,
              scene.beats.map((beat) => beat.figure ?? {}),
            )
          : undefined;
      states.push(codeSceneState(scene, figure));
      continue;
    }
    if (scene.kind === "view") {
      const previous = states.at(-1);
      const start: ViewState = {
        image: scene.image,
        spot: [],
        zoom: "all",
        label: [],
        ...(previous?.kind === "view" &&
        previous.end.image === scene.image &&
        previous.end.lastFrame
          ? { lastFrame: true }
          : {}),
      };
      let current = start;
      const beats = scene.beats.map((beat) => {
        const before = structuredClone(current);
        const image = beat.clip ? `clip:${beat.clip}` : (beat.image ?? current.image);
        const changed = image !== current.image;
        current = {
          image,
          ...(beat.clip || (!changed && current.lastFrame) ? { lastFrame: true } : {}),
          zoom: beat.zoom ?? (changed ? "all" : current.zoom),
          spot: beat.spot ?? [],
          label: beat.label ?? [],
          ...(beat.click ? { click: beat.click } : {}),
        };
        return { before, after: structuredClone(current) };
      });
      states.push({ kind: "view", start, beats, end: structuredClone(current) });
      continue;
    }
    states.push(boardState(scene.board, scene.reset, scene.beats));
  }
  return states;

  function boardState(
    name: string,
    reset: boolean | undefined,
    motions: BoardMotion[],
  ): SceneState {
    const board = boards[name];
    const start =
      lastBoard?.name === name && !reset ? cloneState(lastBoard.end) : emptyBoardState();
    let current = cloneState(start);
    const beats = motions.map((beat) => {
      const before = cloneState(current);
      const visible = new Set(current.visible);
      for (const id of beat.show ?? []) visible.add(id);
      for (const id of beat.hide ?? []) visible.delete(id);
      const marks = { ...current.marks };
      for (const id of beat.unmark ?? []) delete marks[id];
      for (const mark of beat.mark ?? []) if (visible.has(mark.on)) marks[mark.on] = mark.kind;
      const tags = Object.fromEntries(
        [...Object.entries(current.tags ?? {}), ...Object.entries(beat.tag ?? {})].filter(
          ([id]) => !beat.hide?.includes(id) && !beat.untag?.includes(id),
        ),
      );
      current = {
        visible: [...visible].sort(),
        marks,
        zoom: beat.zoom ?? current.zoom,
        ...(Object.keys(tags).length ? { tags } : {}),
      };
      return {
        before,
        after: cloneState(current),
        focus: expandFocus(board, beat.focus ?? []),
        pulse: beat.pulse ?? [],
      };
    });
    lastBoard = { name, end: cloneState(current) };
    return { start, beats, end: cloneState(current) };
  }
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function parseStoryboard(
  json: unknown,
  context?: StoryboardContext,
): { storyboard?: VideoStoryboard; issues: Issue[] } {
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
  const validateBoardMotionShape = (beat: Record<string, unknown>, q: string) => {
    if (beat.tag !== undefined)
      for (const [id, value] of Object.entries(obj(beat.tag, `${q}.tag`))) {
        str(value, `${q}.tag.${id}`, 8);
        if (typeof value === "string" && /[\r\n\u2028\u2029]/u.test(value))
          error(`${q}.tag.${id}`, "札の文字は1行にしてください");
      }
    if (beat.untag !== undefined)
      arr(beat.untag, `${q}.untag`, 0, Infinity).forEach((id, k) => {
        str(id, `${q}.untag[${k}]`);
      });
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
        if (typeof m.kind !== "string" || !["check", "cross", "question", "redo"].includes(m.kind))
          error(`${q}.mark[${k}].kind`, "check・cross・question・redoから選んでください");
      });
    if (beat.travel !== undefined) {
      const t = obj(beat.travel, `${q}.travel`);
      arr(t.along, `${q}.travel.along`, 1, 8).forEach((id, k) => {
        str(id, `${q}.travel.along[${k}]`);
      });
      if (t.icon !== undefined) icon(t.icon, `${q}.travel.icon`);
    }
  };
  const root = obj(json, "$");
  if (root.schema !== 1 && root.schema !== 2) error("schema", "1か2にしてください");
  if (Object.hasOwn(root, "ruby")) {
    error("ruby", "ruby は廃止しました。フリガナは用語の表示 (term.ruby) だけに書きます");
    return { issues };
  }
  const lesson = root.schema === 2;
  const inSeconds = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const oneLine = (v: unknown, p: string, max: number) => {
    str(v, p, max);
    if (typeof v === "string" && /[\r\n\t\u0085\u2028\u2029]/u.test(v))
      error(p, "1行の文字列にしてください");
  };
  const reading = (v: unknown, p: string) => {
    if (
      typeof v !== "string" ||
      Array.from(v).length > 30 ||
      !/^[ぁ-ゖゝ-ゟァ-ヺヽ-ヿー]+$/u.test(v)
    )
      error(p, "ひらがな・カタカナ・長音だけで1〜30字にしてください");
  };
  if (root.polish !== undefined) {
    const polish = obj(root.polish, "polish");
    str(polish.model, "polish.model");
    str(polish.sayHash, "polish.sayHash");
  }
  const brief = obj(root.brief, "brief");
  for (const key of ["goal", "stuck"]) str(brief[key], `brief.${key}`);
  for (const key of ["points", "leaveOut"])
    arr(
      brief[key],
      `brief.${key}`,
      lesson && key === "points" ? 0 : 1,
      key === "points" && !lesson ? 3 : Infinity,
    ).forEach((v, i) => {
      str(v, `brief.${key}[${i}]`);
    });
  if (lesson && Array.isArray(brief.points) && brief.points.length !== 1)
    error(
      "brief.points",
      "動画1本の要点は1つにしてください。2つ以上あるならトピックを分けてください",
    );
  try {
    parseVideoArt(root.art);
  } catch (e) {
    error("art", (e as Error).message);
    usable = false;
  }
  const art = record(root.art) ? root.art : {};
  const boards = root.boards === undefined ? {} : obj(root.boards, "boards");
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
        if ((kind === "nodes" && el.art === undefined) || el.icon !== undefined)
          icon(el.icon, `${q}.icon`);
        if (kind === "nodes" && el.art !== undefined) {
          str(el.art, `${q}.art`);
          if (typeof el.art !== "string" || !Object.hasOwn(art, el.art))
            error(`${q}.art`, "存在しないイラストです");
          else if (context && !context.artFiles.has(el.art))
            issues.push({
              level: "warning",
              path: `${q}.art`,
              message: "イラストがまだありません。video:art を実行してください",
            });
        }
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
  arr(root.scenes, "scenes", lesson ? 9 : 3, lesson ? 16 : 6).forEach((value, i) => {
    const p = `scenes[${i}]`,
      s = obj(value, p);
    str(s.id, `${p}.id`);
    if (s.id === "title") error(`${p}.id`, "title は自動で入るタイトルの場面に使うidです");
    if (s.id === "summary") error(`${p}.id`, "summary は廃止した場面のidなので使えません");
    str(s.title, `${p}.title`, 16);
    if (s.kind !== undefined && s.kind !== "board" && s.kind !== "view" && s.kind !== "code")
      error(`${p}.kind`, "board・view・codeから選んでください");
    if (s.kind === "view") str(s.image, `${p}.image`);
    else if (s.kind !== "code") str(s.board, `${p}.board`);
    if (s.kind === "code") {
      const codeIssues = validateCodeScene(s, p);
      issues.push(...codeIssues);
      if (codeIssues.length) usable = false;
      if (lesson && (!record(s.panel) || s.panel.kind !== "figure"))
        error(
          `${p}.panel`,
          "コードだけの場面は作れません。panel に figure を指定して、概念図を横に出してください",
        );
    }
    if (lesson) {
      if (typeof s.role !== "string" || !Object.hasOwn(LESSON_ROLE_LABELS, s.role))
        error(`${p}.role`, `${Object.keys(LESSON_ROLE_LABELS).join("・")}から選んでください`);
      if (s.point !== undefined) error(`${p}.point`, "schema 2 の場面から point を外してください");
      if (s.kind === "code" && (s.role === "goal" || s.role === "example" || s.role === "usage"))
        error(`${p}.kind`, "実際の画面か概念図・イラストで見せてください");
    } else {
      if (typeof s.role !== "string" || !["hook", "point", "recap"].includes(s.role))
        error(`${p}.role`, "hook・point・recapから選んでください");
      if (s.role === "point")
        integer(s.point, `${p}.point`, 1, Array.isArray(brief.points) ? brief.points.length : 3);
      else if (s.point !== undefined) error(`${p}.point`, "pointの場面だけに指定してください");
    }
    if (s.think !== undefined) {
      if (!lesson || s.role !== "quiz")
        error(`${p}.think`, "think は schema 2 の quiz の場面だけに指定できます");
      else if (!inSeconds(s.think, 3, 15)) error(`${p}.think`, "think は3〜15秒にしてください");
    }
    if (s.kind !== "code" && s.reset !== undefined && typeof s.reset !== "boolean")
      error(`${p}.reset`, "真偽値にしてください");
    arr(s.beats, `${p}.beats`, 1, s.kind === "code" ? 6 : 5).forEach((value, j) => {
      const q = `${p}.beats[${j}]`,
        beat = obj(value, q);
      str(beat.say, `${q}.say`, 40);
      if (
        typeof beat.say === "string" &&
        (!/^[^。?？]*[。?？]$/.test(beat.say) ||
          /[\r\n()[\]{}（）『』【】<>*_`#~|→/…\\]/u.test(beat.say) ||
          /^\s*(?:[-+>]|\d+[.)])\s/u.test(beat.say))
      )
        error(`${q}.say`, "文末を1つにした1文にし、括弧・改行・Markdown・禁止記号を除いてください");
      if (beat.speech !== undefined) str(beat.speech, `${q}.speech`);
      if (beat.term !== undefined) {
        if (!lesson) error(`${q}.term`, "term は schema 2 の文だけに指定できます");
        const term = obj(beat.term, `${q}.term`);
        oneLine(term.text, `${q}.term.text`, 10);
        if (term.ruby !== undefined) reading(term.ruby, `${q}.term.ruby`);
        else if (lesson && typeof term.text === "string" && /\p{Script=Han}/u.test(term.text))
          error(`${q}.term.ruby`, "漢字を含む用語には読みを書いてください");
        if (term.note !== undefined) oneLine(term.note, `${q}.term.note`, 16);
      }
      if (beat.dialog !== undefined) {
        if (!lesson) error(`${q}.dialog`, "dialog は schema 2 の文だけに指定できます");
        if (beat.term !== undefined) error(`${q}.dialog`, "term と dialog は同じ文に書けません");
        const dialog = obj(beat.dialog, `${q}.dialog`);
        oneLine(dialog.title, `${q}.dialog.title`, 24);
        const path = `${q}.dialog.code`;
        const code = arr(dialog.code, path, 1, 8);
        const codeIssues = validateCodeLines(code, path, /[\r\n\t\u0085\u2028\u2029]/u);
        issues.push(...codeIssues);
        if (
          !codeIssues.length &&
          code.length > 0 &&
          code.length <= 8 &&
          /^(?:\s|\/\/[^\n]*(?:\n|$)|\/\*(?:(?!\*\/)[\s\S])*\*\/)*$/u.test(code.join("\n"))
        )
          error(path, "コメントと空行だけのコードは指定できません");
      }
      if (beat.pause !== undefined) {
        if (!lesson) error(`${q}.pause`, "pause は schema 2 の文だけに指定できます");
        else if (!inSeconds(beat.pause, 0.5, 8))
          error(`${q}.pause`, "pause は0.5〜8秒にしてください");
      }
      if (s.kind === "code" || s.kind === "view") {
        for (const key of ["tag", "untag"])
          if (beat[key] !== undefined)
            error(`${q}.${key}`, `${key} は board の文だけに指定できます`);
      }
      if (s.kind !== "code")
        for (const key of ["plot", "range", "snap", "tick"])
          if (beat[key] !== undefined)
            error(`${q}.${key}`, `${key}はnumberLineパネルだけに指定できます`);
      if (beat.figure !== undefined) {
        if (s.kind === "code" && record(s.panel) && s.panel.kind === "figure") {
          const figure = obj(beat.figure, `${q}.figure`);
          if (!Object.keys(figure).length)
            error(`${q}.figure`, "図の動きを1つ以上指定してください");
          for (const key of Object.keys(figure))
            if (
              ![
                "show",
                "hide",
                "focus",
                "pulse",
                "mark",
                "unmark",
                "tag",
                "untag",
                "travel",
              ].includes(key)
            )
              error(`${q}.figure.${key}`, "figure では指定できない項目です");
          validateBoardMotionShape(figure, `${q}.figure`);
        } else if (s.kind !== "code") {
          error(`${q}.figure`, "figure は figure パネルだけに指定できます");
        }
      }
      if (s.kind === "code") return;
      if (s.kind === "view") {
        if (beat.image !== undefined) str(beat.image, `${q}.image`);
        if (beat.clip !== undefined) {
          str(beat.clip, `${q}.clip`);
          if (typeof beat.clip === "string" && !clipReference(beat.clip))
            error(`${q}.clip`, "クリップは 組/名前#mark にしてください");
          if (beat.image !== undefined) error(q, "image と clip は同じ文に書けません");
        }
        if (
          beat.speed !== undefined &&
          (typeof beat.speed !== "number" ||
            !Number.isFinite(beat.speed) ||
            beat.speed < 0.5 ||
            beat.speed > 3)
        )
          error(`${q}.speed`, "speed は0.5〜3にしてください");
        if (beat.speed !== undefined && beat.clip === undefined)
          error(`${q}.speed`, "speed は clip と一緒に指定してください");
        if (beat.zoom !== undefined) str(beat.zoom, `${q}.zoom`);
        if (beat.click !== undefined) str(beat.click, `${q}.click`);
        if (beat.spot !== undefined)
          arr(beat.spot, `${q}.spot`, 1, 32).forEach((id, k) => {
            str(id, `${q}.spot[${k}]`);
          });
        if (beat.label !== undefined)
          arr(beat.label, `${q}.label`, 1, 32).forEach((value, k) => {
            const l = obj(value, `${q}.label[${k}]`);
            str(l.at, `${q}.label[${k}].at`);
            str(l.text, `${q}.label[${k}].text`, 12);
          });
        return;
      }
      validateBoardMotionShape(beat, q);
    });
  });
  if (!usable) return { issues };
  const sb = json as VideoStoryboard;
  const typedBoards = sb.boards ?? {};
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
  for (const [name, b] of Object.entries(sb.boards ?? {})) {
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
  const lessonRoles = new Set<SceneRole>();
  let lastRoleIndex = -1;
  sb.scenes.forEach((s, i) => {
    const p = `scenes[${i}]`;
    if (lesson) {
      if (s.role === "note") {
        if (lessonRoles.has("next")) error(`${p}.role`, "next のあとには next だけを置けます");
        else if (i === 0 || i === sb.scenes.length - 1 || sb.scenes[i - 1]?.role === "quiz")
          error(`${p}.role`, "note は最初・最後・quiz の直後を避けて置いてください");
      } else {
        const index = (LESSON_SEQUENCE as readonly SceneRole[]).indexOf(s.role);
        if (index >= 0) {
          if (s.role === "next" && !lessonRoles.has("usage"))
            error(`${p}.role`, "next は usage のあとに置いてください");
          else if (index < lastRoleIndex)
            error(`${p}.role`, `場面は ${LESSON_SEQUENCE.join(" → ")} の順に並べてください`);
          lastRoleIndex = Math.max(lastRoleIndex, index);
        }
        if (
          (s.role === "goal" || s.role === "quiz" || s.role === "answer") &&
          lessonRoles.has(s.role)
        )
          error(`${p}.role`, `${s.role} は1場面にしてください`);
        lessonRoles.add(s.role);
      }
    } else {
      const expected = i === 0 ? "hook" : i === sb.scenes.length - 1 ? "recap" : "point";
      if (s.role !== expected) error(`${p}.role`, `${expected}の場面にしてください`);
      if (s.point !== undefined) pointNumbers.push(s.point);
    }
    if (s.kind === "view") {
      validateView(s, i, sb, context, issues);
      return;
    }
    const name = sceneBoardName(s);
    if (name === undefined) return;
    const boardPath = s.kind === "code" ? `${p}.panel.board` : `${p}.board`;
    if (!Object.hasOwn(typedBoards, name)) {
      error(boardPath, "存在しない図解です");
      return;
    }
    const b = typedBoards[name];
    if (s.kind === "code") {
      const nodes = figureNodes(b);
      if (nodes.length < 2 || nodes.length > 4 || b.zones?.length)
        error(boardPath, "figure の図解はノード2〜4個とし、囲みは指定できません");
      const pairs = new Set<string>();
      for (const link of b.links ?? []) {
        const i = nodes.findIndex((node) => node.id === link.from);
        if (i < 0 || nodes[i + 1]?.id !== link.to || pairs.has(link.from))
          error(
            boardPath,
            "figure の矢印は、行・列の順で隣り合うノードを前から後ろへ1本だけ結べます",
          );
        pairs.add(link.from);
      }
    }
    const ids = new Set([...(b.zones ?? []), ...b.nodes, ...(b.links ?? [])].map((e) => e.id));
    s.beats.forEach((_, j) => {
      const beat: BoardMotion | undefined = s.kind === "code" ? s.beats[j].figure : s.beats[j];
      if (!beat) return;
      const q = `${p}.beats[${j}]${s.kind === "code" ? ".figure" : ""}`;
      for (const key of ["show", "hide", "focus", "pulse", "unmark", "zoom"] as const) {
        const refs = beat[key];
        if (!refs || refs === "all") continue;
        refs.forEach((id, k) => {
          if (!ids.has(id)) error(`${q}.${key}[${k}]`, `存在しないid「${id}」です`);
        });
      }
      for (const id of Object.keys(beat.tag ?? {})) {
        if (!b.nodes.some((node) => node.id === id))
          error(`${q}.tag.${id}`, `図解にあるノードの id を指定してください（${id}）`);
        if (beat.untag?.includes(id))
          error(`${q}.tag.${id}`, "同じノードを tag と untag の両方に指定できません");
      }
      beat.untag?.forEach((id, k) => {
        if (!b.nodes.some((node) => node.id === id))
          error(`${q}.untag[${k}]`, `図解にあるノードの id を指定してください（${id}）`);
      });
      beat.mark?.forEach((m, k) => {
        if (
          !b.nodes.some((n) => n.id === m.on) &&
          (s.kind === "code" || !b.zones?.some((z) => z.id === m.on))
        )
          error(
            `${q}.mark[${k}].on`,
            s.kind === "code" ? "ノードを指定してください" : "ノードか囲みを指定してください",
          );
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
  if (lesson) {
    for (const role of LESSON_SEQUENCE)
      if (role !== "next" && !lessonRoles.has(role))
        error("scenes", `${role} の場面を入れてください`);
  } else {
    sb.brief.points.forEach((_, i) => {
      if (!pointNumbers.includes(i + 1)) error("scenes", `要点${i + 1}の場面がありません`);
    });
    if (pointNumbers.some((n, i) => i > 0 && n < pointNumbers[i - 1]))
      error("scenes", "要点の番号は昇順にしてください");
  }
  // 参照の誤りがあっても、ほかの場面の空振り・時間の指摘まで集める。
  const analysisBoards: Record<string, Board> = Object.fromEntries([
    ...Object.entries(sb.boards ?? {}),
    ...sb.scenes
      .map(sceneBoardName)
      .filter((name): name is string => name !== undefined && !Object.hasOwn(typedBoards, name))
      .map((name) => [name, { cols: 1, rows: 1, nodes: [] } satisfies Board]),
  ]);
  const states = storyboardStates({ ...sb, boards: analysisBoards });
  sb.scenes.forEach((s, i) => {
    const name = sceneBoardName(s);
    if (s.kind === "view" || name === undefined) return;
    const state = states[i];
    const sceneState = state.kind === "code" ? state.figure : (state as SceneState);
    if (!sceneState) return;
    const changes = s.beats.map((_, j) => {
      const b: BoardMotion = s.kind === "code" ? (s.beats[j].figure ?? {}) : s.beats[j];
      const q = `scenes[${i}].beats[${j}]${s.kind === "code" ? ".figure" : ""}`,
        state = sceneState.beats[j];
      const visible = new Set(state.after.visible);
      const change =
        (b.show ?? []).some((id) => !state.before.visible.includes(id) && visible.has(id)) ||
        (b.hide ?? []).some((id) => state.before.visible.includes(id) && !visible.has(id)) ||
        (b.focus ?? []).some((id) => visible.has(id)) ||
        (b.pulse ?? []).some((id) => visible.has(id)) ||
        (b.mark ?? []).some((m) => visible.has(m.on) && state.before.marks[m.on] !== m.kind) ||
        (b.unmark ?? []).some((id) => state.before.marks[id] !== undefined && visible.has(id)) ||
        [...visible].some(
          (id) =>
            (state.before.tags && Object.hasOwn(state.before.tags, id)
              ? state.before.tags[id]
              : undefined) !==
            (state.after.tags && Object.hasOwn(state.after.tags, id)
              ? state.after.tags[id]
              : undefined),
        ) ||
        b.travel !== undefined ||
        (b.zoom !== undefined && JSON.stringify(state.before.zoom) !== JSON.stringify(b.zoom));
      if (s.kind !== "code" && !change && !s.beats[j].term && !s.beats[j].dialog)
        error(q, "絵が変わる動きを指定してください（空振りです）");
      const links = b.travel?.along.map((id) =>
        analysisBoards[name].links?.find((l) => l.id === id),
      );
      links?.forEach((l, k) => {
        if (!l) return;
        if (!visible.has(l.id)) error(`${q}.travel.along[${k}]`, "出ている矢印だけをたどれます");
        if (k > 0 && links[k - 1]?.to !== l.from)
          error(`${q}.travel.along[${k}]`, "矢印がつながっていません");
      });
      return change;
    });
    if (s.kind === "code") issues.push(...validateCodeMotion(s, `scenes[${i}]`, changes));
  });
  const last = sb.scenes.length - 1;
  const finalScene = sb.scenes[last];
  if (
    !lesson &&
    last >= 0 &&
    finalScene.kind !== "view" &&
    finalScene.kind !== "code" &&
    analysisBoards[finalScene.board].nodes.some(
      (n) => !(states[last] as SceneState).end.visible.includes(n.id),
    )
  )
    issues.push({
      level: "warning",
      path: `scenes[${last}]`,
      message: "まとめの終わりで全ノードが出ていません",
    });
  const seconds = sceneTimelines(
    sb.scenes,
    sb.scenes.map((s) => s.beats.map((b) => estimateSpeechSeconds(b.speech ?? b.say))),
    context?.clips,
    sb.schema,
  ).reduce((n, s) => n + s.duration, 0);
  const [min, max, limit] = lesson ? [180, 480, 600] : [80, 200, 300];
  if (seconds < min || seconds > max)
    issues.push({
      level: seconds > limit ? "error" : "warning",
      path: "scenes",
      message: `推定時間${seconds.toFixed(1)}秒は${min}〜${max}秒の範囲外です`,
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

function validateView(
  scene: ViewScene,
  index: number,
  sb: VideoStoryboard,
  context: StoryboardContext | undefined,
  issues: Issue[],
) {
  const error = (path: string, message: string) => issues.push({ level: "error", path, message });
  const imageInfo = (image: string, path: string): Record<string, ShotRegion> | undefined => {
    if (image.startsWith("clip:")) {
      const ref = clipReference(image.slice(5));
      if (!ref) {
        error(path, "クリップは clip:組/名前#mark にしてください");
        return undefined;
      }
      if (!context) return undefined;
      const clip = context.clips?.[ref.id];
      if (!clip) {
        error(path, `クリップがありません: ${ref.id}`);
        return undefined;
      }
      const mark = clip.marks[ref.mark];
      if (!mark) error(path, `mark がありません: ${image}`);
      else if (
        !Array.isArray(mark) ||
        mark.length !== 2 ||
        !mark.every(Number.isFinite) ||
        mark[0] < 0 ||
        mark[0] >= mark[1] ||
        mark[1] > clip.duration
      )
        error(path, `mark の区間が不正です: ${image}`);
      return clip.regions;
    }
    if (image.startsWith("shot:") && SHOT_ID.test(image.slice(5))) {
      if (!context) return undefined;
      const shot = context.shots[image.slice(5)];
      if (!shot) error(path, `ショットがありません: ${image}`);
      return shot?.regions;
    }
    if (image.startsWith("art:") && /^[a-z0-9-]+$/.test(image.slice(4))) {
      const name = image.slice(4);
      if (!Object.hasOwn(sb.art ?? {}, name)) error(path, `存在しないイラストです: ${name}`);
      else if (context && !context.artFiles.has(name))
        issues.push({
          level: "warning",
          path,
          message: "イラストがまだありません。video:art を実行してください",
        });
      return sb.art?.[name]?.regions ?? {};
    }
    error(path, "画像は clip:組/名前#mark・shot:組/名前・art:名前 にしてください");
    return undefined;
  };
  let image = scene.image,
    zoom = "all";
  let regions = imageInfo(image, `scenes[${index}].image`);
  const previous = sb.scenes[index - 1];
  const previousImage =
    previous?.kind === "view"
      ? previous.beats.reduce(
          (img, beat) => (beat.clip ? `clip:${beat.clip}` : (beat.image ?? img)),
          previous.image,
        )
      : undefined;
  scene.beats.forEach((beat, j) => {
    const p = `scenes[${index}].beats[${j}]`;
    const nextImage = beat.clip ? `clip:${beat.clip}` : beat.image;
    const changed = nextImage !== undefined && nextImage !== image;
    if (nextImage !== undefined) {
      image = nextImage;
      regions = imageInfo(image, `${p}.image`);
      if (changed) zoom = "all";
    }
    for (const [key, names] of [
      ["spot", beat.spot ?? []],
      ["zoom", beat.zoom && beat.zoom !== "all" ? [beat.zoom] : []],
      ["label", beat.label?.map((l) => l.at) ?? []],
      ["click", beat.click ? [beat.click] : []],
    ] as const) {
      for (const name of names)
        if (regions && !Object.hasOwn(regions, name))
          error(`${p}.${key}`, `存在しない領域「${name}」です`);
    }
    const change =
      beat.term !== undefined ||
      beat.dialog !== undefined ||
      changed ||
      beat.clip !== undefined ||
      (beat.spot?.length ?? 0) > 0 ||
      (beat.label?.length ?? 0) > 0 ||
      beat.click !== undefined ||
      (beat.zoom !== undefined && beat.zoom !== zoom) ||
      (j === 0 && scene.image !== previousImage);
    if (!change) error(p, "絵が変わる動きを指定してください（空振りです）");
    zoom = beat.zoom ?? zoom;
  });
}

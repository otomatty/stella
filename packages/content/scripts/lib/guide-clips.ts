export const GUIDE_ACTIONS = [
  "scroll",
  "focus",
  "open",
  "lines",
  "type",
  "reveal",
  "rows",
  "wait",
] as const;
export type GuideAction = (typeof GUIDE_ACTIONS)[number];
export type GuideStep =
  | { mark: string; do: "wait"; seconds: number }
  | { mark: string; do: Exclude<GuideAction, "wait">; to: string };
export interface GuideClip {
  id: string;
  page: string;
  /** 検査後は、省略時の 1.5 を補って返す。 */
  zoom: number;
  steps: GuideStep[];
  regions: Record<string, string>;
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const name = (v: unknown): v is string =>
  typeof v === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
const selector = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** ファイル I/O をせず、存在するページ名も呼び出し側から受け取る。 */
export function parseGuideClips(input: unknown, pages: ReadonlySet<string>): GuideClip[] {
  const fail = (where: string, message: string): never => {
    throw new Error(`${where}: ${message}`);
  };
  if (!Array.isArray(input)) return fail("guide.json", "配列にしてください");
  const ids = new Set<string>();
  for (const [i, clip] of input.entries()) {
    const where = `guide.json[${i}]`;
    if (!record(clip)) return fail(where, "定義はオブジェクトにしてください");
    if (typeof clip.id !== "string" || !/^guide\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clip.id))
      return fail(where, "id は guide/<名前> にしてください");
    if (ids.has(clip.id)) return fail(clip.id, "id が重複しています");
    ids.add(clip.id);
    if (
      typeof clip.page !== "string" ||
      !/^guide-0[1-9]\.html$/.test(clip.page) ||
      !pages.has(clip.page)
    )
      return fail(clip.id, "page が存在しません（guide-01.html〜guide-09.html）");
    if (
      clip.zoom !== undefined &&
      (typeof clip.zoom !== "number" || !Number.isFinite(clip.zoom) || clip.zoom <= 0)
    )
      return fail(clip.id, "zoom は正の有限数にしてください");
    if (!Array.isArray(clip.steps) || !clip.steps.length) return fail(clip.id, "steps が必要です");
    const marks = new Set<string>();
    for (const [j, step] of clip.steps.entries()) {
      const at = `${clip.id} step[${j}]`;
      if (!record(step) || !name(step.mark)) return fail(at, "mark の形が不正です");
      if (marks.has(step.mark)) return fail(at, `mark が重複しています: ${step.mark}`);
      marks.add(step.mark);
      if (!GUIDE_ACTIONS.includes(step.do as GuideAction)) return fail(at, "do が不正です");
      if (step.do === "wait") {
        if (typeof step.seconds !== "number" || !Number.isFinite(step.seconds) || step.seconds <= 0)
          return fail(at, "seconds は正の有限数にしてください");
      } else {
        if (!selector(step.to)) return fail(at, "to にセレクタが必要です");
        // 行の帯と文字の打ち込みは pre 専用。対象のタグを明記し、
        // 段落を選ぶ誤りをブラウザーの起動前に検出する。
        if (
          (step.do === "lines" || step.do === "type") &&
          !/(?:^|[\s>+~])pre(?:(?:[.#:]|\[)[^\s>+~,]*)?\s*$/u.test(step.to)
        )
          return fail(at, `${step.do} は末尾に pre を指定してください: ${step.to}`);
      }
    }
    if (
      !record(clip.regions) ||
      !Object.entries(clip.regions).every(([k, v]) => name(k) && selector(v))
    )
      return fail(clip.id, "regions は領域名とセレクタの組にしてください");
  }
  return input.map((clip) => ({ ...clip, zoom: clip.zoom ?? 1.5 })) as GuideClip[];
}

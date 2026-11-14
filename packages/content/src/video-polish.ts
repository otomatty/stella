import { SHOT_GROUPS } from "./scene-view.js";
/** 台本校正の要求・応答・採否。ファイルや通信には依存しない。 */
import { createHash } from "node:crypto";
import {
  parseStoryboard,
  storyboardStates,
  type ViewBeat,
  type ViewSceneState,
  type Beat,
  type Board,
  type Issue,
  type VideoStoryboard,
} from "./video-storyboard.js";

export const POLISH_KINDS = [
  "unnatural",
  "wordy",
  "written",
  "hard-word",
  "repeats-picture",
  "off-point",
] as const;
export interface PolishLine {
  id: string;
  verdict: "keep" | "rewrite" | "cut";
  rewrite?: string;
  kinds: (typeof POLISH_KINDS)[number][];
  reason: string;
}
export interface PolishResponse {
  summary: string;
  lines: PolishLine[];
  missing: string[];
  offPoint: string[];
}
export interface RewriteJudgment {
  id: string;
  original: string;
  verdict: PolishLine["verdict"];
  rewrite?: string;
  kinds: PolishLine["kinds"];
  reason: string;
  accepted: boolean;
  rejection?: string;
}
export const polishResponseSchema = {
  type: "OBJECT",
  required: ["summary", "lines", "missing", "offPoint"],
  properties: {
    summary: { type: "STRING", description: "全体の講評を日本語で2〜3文" },
    lines: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["id", "verdict", "kinds", "reason"],
        properties: {
          id: { type: "STRING" },
          verdict: { type: "STRING", enum: ["keep", "rewrite", "cut"] },
          rewrite: { type: "STRING" },
          kinds: { type: "ARRAY", items: { type: "STRING", enum: [...POLISH_KINDS] } },
          reason: { type: "STRING" },
        },
      },
    },
    missing: { type: "ARRAY", items: { type: "STRING" } },
    offPoint: { type: "ARRAY", items: { type: "STRING" } },
  },
};

function linesOf(storyboard: VideoStoryboard) {
  return storyboard.scenes.flatMap((scene, sceneIndex) =>
    scene.beats.map((beat, beatIndex) => ({
      id: `${scene.id}#${beatIndex + 1}`,
      beat,
      sceneIndex,
      beatIndex,
    })),
  );
}
function labelsOf(board: Board): string[] {
  return [...(board.zones ?? []), ...board.nodes, ...(board.links ?? [])].flatMap((el) =>
    el.label ? [el.label] : [],
  );
}
function allLabels(sb: VideoStoryboard): string[] {
  return [
    ...new Set([
      ...Object.values(sb.boards ?? {}).flatMap(labelsOf),
      ...sb.scenes.flatMap((s) =>
        s.kind === "view" ? s.beats.flatMap((b) => b.label?.map((l) => l.text) ?? []) : [],
      ),
      ...sb.scenes.flatMap((s) =>
        s.kind === "view"
          ? [s.image, ...s.beats.flatMap((b) => (b.image ? [b.image] : []))].flatMap((img) => {
              const group = img.startsWith("shot:")
                ? SHOT_GROUPS[img.slice(5).split("/")[0]]
                : undefined;
              return group ? [group.label] : [];
            })
          : [],
      ),
    ]),
  ];
}
function viewPicture(image: string, beat: ViewBeat): string[] {
  const group = image.startsWith("shot:") ? SHOT_GROUPS[image.slice(5).split("/")[0]] : undefined;
  return [
    `画面: ${group ? `${group.label} の画面 (${image.slice(5)})` : image}`,
    ...(beat.spot?.length ? [`囲む: ${beat.spot.join("、")}`] : []),
    ...(beat.zoom ? [`寄る: ${beat.zoom}`] : []),
    ...(beat.label?.length ? [`札: ${beat.label.map((l) => l.text).join("、")}`] : []),
    ...(beat.click ? [`押す: ${beat.click}`] : []),
  ];
}
function pictureOf(board: Board, beat: Beat): string[] {
  const nodeLabel = (id: string) => board.nodes.find((n) => n.id === id)?.label ?? "不明なノード";
  const linkLabel = (id: string) => {
    const link = board.links?.find((l) => l.id === id);
    return link
      ? `${nodeLabel(link.from)} → ${nodeLabel(link.to)}${link.label ? ` の矢印 ${link.label}` : ""}`
      : "不明な矢印";
  };
  const label = (id: string) =>
    board.nodes.find((n) => n.id === id)?.label ??
    board.zones?.find((z) => z.id === id)?.label ??
    linkLabel(id);
  const actions: string[] = [];
  for (const [key, verb] of [
    ["show", "出す"],
    ["hide", "隠す"],
    ["focus", "強調"],
    ["pulse", "脈動"],
    ["unmark", "印を消す"],
  ] as const) {
    if (beat[key]?.length) actions.push(`${verb}: ${beat[key].map(label).join("、")}`);
  }
  for (const m of beat.mark ?? []) actions.push(`印: ${label(m.on)} に ${m.kind}`);
  if (beat.travel) {
    const links = beat.travel.along.map((id) => board.links?.find((l) => l.id === id));
    actions.push(
      `たどる: ${[nodeLabel(links[0]?.from ?? ""), ...links.map((l) => nodeLabel(l?.to ?? ""))].join(" → ")}`,
    );
  }
  if (beat.zoom)
    actions.push(`寄る: ${beat.zoom === "all" ? "全体" : beat.zoom.map(label).join("、")}`);
  return actions;
}
export function buildPolishRequest(storyboard: VideoStoryboard, guideText: string) {
  const system = `あなたは未経験者向け研修動画の台本の校正者です。次のガイド全文に従ってください。\n\n${guideText}\n\n見る観点:
unnatural: 不自然な日本語
wordy: 冗長
written: 書き言葉や硬い言い回し
hard-word: 初学者に難しい語
repeats-picture: 絵を見れば分かることの繰り返し
off-point: 学習設計 brief.points に無い話

意味を変えず、事実や数字を足さないでください。画面のラベルと同じ言葉は言い換えないでください。
1文40字まで、です・ます調の話し言葉にし、ボタンの名前の「」以外の括弧や記号を使わず、文末に句点か疑問符を1つ置いてください。
直す必要のない文はそのまま keep にしてください。全部を書き換えないでください。
全IDについて1件ずつ lines を返してください。rewrite のときは rewrite に言い換えの全文を必ず入れ、cut は削除の提案にしてください。
kinds は上記6種類から選び、reason は日本語にしてください。summary は全体の講評を2〜3文で、missing は points のうち伝わっていないもの、offPoint は points に無いのに話していることを挙げてください。`;
  const states = storyboardStates(storyboard);
  const boards = storyboard.boards ?? {};
  const user = JSON.stringify(
    {
      brief: storyboard.brief,
      labels: allLabels(storyboard),
      scenes: storyboard.scenes.map((scene, si) => ({
        role: scene.role,
        title: scene.title,
        lines: scene.beats.map((beat, i) => ({
          id: `${scene.id}#${i + 1}`,
          say: beat.say,
          picture:
            scene.kind === "view"
              ? viewPicture((states[si] as ViewSceneState).beats[i].after.image, beat as ViewBeat)
              : pictureOf(boards[scene.board], beat as Beat),
        })),
      })),
    },
    null,
    2,
  );
  return { system, user };
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function parsePolishResponse(
  json: unknown,
  storyboard: VideoStoryboard,
): { response?: PolishResponse; issues: Issue[] } {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ level: "error", path, message });
  if (!record(json))
    return { issues: [{ level: "error", path: "$", message: "応答はオブジェクトにしてください" }] };
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((s) => typeof s === "string");
  if (typeof json.summary !== "string" || !json.summary.trim())
    error("summary", "講評がありません");
  for (const key of ["missing", "offPoint"] as const)
    if (!strings(json[key])) error(key, "文字列の配列にしてください");
  const expected = new Set(linesOf(storyboard).map((l) => l.id));
  const seen = new Set<string>();
  const lines: PolishLine[] = [];
  if (!Array.isArray(json.lines)) error("lines", "文ごとの配列がありません");
  else
    json.lines.forEach((line: unknown, i: number) => {
      const p = `lines[${i}]`;
      if (!record(line)) {
        error(p, "オブジェクトにしてください");
        return;
      }
      if (typeof line.id !== "string" || !expected.has(line.id))
        error(`${p}.id`, `知らないid: ${String(line.id)}`);
      else if (seen.has(line.id)) error(`${p}.id`, `重複したid: ${line.id}`);
      else seen.add(line.id);
      if (!["keep", "rewrite", "cut"].includes(String(line.verdict)))
        error(`${p}.verdict`, "keep・rewrite・cutから選んでください");
      if (line.rewrite !== undefined && typeof line.rewrite !== "string")
        error(`${p}.rewrite`, "文字列にしてください");
      if (line.verdict === "rewrite" && (typeof line.rewrite !== "string" || !line.rewrite.trim()))
        error(`${p}.rewrite`, "言い換えの全文がありません");
      if (
        !strings(line.kinds) ||
        line.kinds.some((k) => !POLISH_KINDS.includes(k as (typeof POLISH_KINDS)[number]))
      )
        error(`${p}.kinds`, "許可された観点の配列にしてください");
      if (typeof line.reason !== "string" || !line.reason.trim())
        error(`${p}.reason`, "理由がありません");
      lines.push(line as unknown as PolishLine);
    });
  for (const id of expected)
    if (!seen.has(id)) {
      issues.push({ level: "warning", path: id, message: "応答にidがないためkeep扱いにします" });
      lines.push({ id, verdict: "keep", kinds: [], reason: "応答にないため元の文を保持" });
    }
  if (issues.some((i) => i.level === "error")) return { issues };
  return {
    response: {
      summary: json.summary as string,
      lines,
      missing: json.missing as string[],
      offPoint: json.offPoint as string[],
    },
    issues,
  };
}

export function judgeRewrites(
  storyboard: VideoStoryboard,
  response: PolishResponse,
): RewriteJudgment[] {
  const byId = new Map(response.lines.map((l) => [l.id, l]));
  const context = [
    storyboard.brief.goal,
    storyboard.brief.stuck,
    ...storyboard.brief.points,
    ...storyboard.brief.leaveOut,
    ...allLabels(storyboard),
  ];
  const tokens = (s: string, regex: RegExp) => s.match(regex) ?? [];
  return linesOf(storyboard).map(({ id, beat, sceneIndex, beatIndex }) => {
    const line = byId.get(id) ?? {
      id,
      verdict: "keep" as const,
      kinds: [],
      reason: "応答にないため元の文を保持",
    };
    const reasons: string[] = [];
    if (line.verdict === "cut") reasons.push("cutは絵の動きごと人が見直すため自動反映しません");
    if (line.verdict === "rewrite") {
      const rewrite = line.rewrite ?? "";
      if (rewrite === beat.say) reasons.push("元の文と同じです");
      if (beat.speech !== undefined) reasons.push("speechで読みを指定した文です");
      const candidate = structuredClone(storyboard);
      candidate.scenes[sceneIndex].beats[beatIndex].say = rewrite;
      const path = `scenes[${sceneIndex}].beats[${beatIndex}].say`;
      reasons.push(
        ...parseStoryboard(candidate)
          .issues.filter((i) => i.level === "error" && i.path === path)
          .map((i) => i.message),
      );
      const sources = [beat.say, ...context];
      for (const [regex, name] of [
        [/[0-9０-９]+(?:[.．][0-9０-９]+)?|[一二三四五六七八九十百千]+/g, "数字"],
        [/[A-Za-z][A-Za-z0-9.+#-]*/g, "英字の語"],
      ] as const) {
        const allowed = new Set(sources.flatMap((s) => tokens(s, regex)));
        const added = [...new Set(tokens(rewrite, regex))].filter((t) => !allowed.has(t));
        if (added.length) reasons.push(`元の文・brief・ラベルにない${name}: ${added.join("、")}`);
      }
    }
    return {
      ...line,
      original: beat.say,
      accepted: line.verdict === "rewrite" && reasons.length === 0,
      ...(reasons.length ? { rejection: reasons.join(" / ") } : {}),
    };
  });
}
export function applyPolish(
  storyboard: VideoStoryboard,
  accepted: readonly RewriteJudgment[],
): VideoStoryboard {
  const rewrites = new Map(
    accepted
      .filter((j) => j.accepted && j.verdict === "rewrite" && j.rewrite !== undefined)
      .map((j) => [j.id, j.rewrite as string]),
  );
  const result = structuredClone(storyboard);
  for (const { id, beat } of linesOf(result))
    if (rewrites.has(id)) beat.say = rewrites.get(id) as string;
  return result;
}
export function sayHash(storyboard: VideoStoryboard): string {
  return createHash("sha256")
    .update(
      JSON.stringify(storyboard.scenes.map((s) => s.beats.map((b) => [b.say, b.speech ?? null]))),
    )
    .digest("hex");
}

export interface PolishSelection {
  only?: string[];
  skip?: string[];
}
/** 選択から外した案にも理由を残す。受け入れ不可の案は選んでも反映しない。 */
export function selectPolishRewrites(
  judgments: readonly RewriteJudgment[],
  selection: PolishSelection,
): RewriteJudgment[] {
  if (selection.only !== undefined && selection.skip !== undefined)
    throw new Error("--only と --skip は同時に指定できません");
  const known = new Set(judgments.map((j) => j.id));
  for (const id of selection.only ?? selection.skip ?? [])
    if (!known.has(id)) throw new Error(`知らないid: ${id}`);
  return judgments.map((judgment) => {
    const excluded =
      selection.only !== undefined
        ? !selection.only.includes(judgment.id)
        : selection.skip?.includes(judgment.id);
    return excluded && judgment.accepted
      ? {
          ...judgment,
          accepted: false,
          rejection: selection.only !== undefined ? "--only の対象外です" : "--skip で除外しました",
        }
      : { ...judgment };
  });
}
/** 保存した案だけを読み直す。ハッシュのない旧報告も取り直しを案内する。 */
export function readSavedPolish(storyboard: VideoStoryboard, report: unknown) {
  const again = "先に video:polish を実行してください";
  if (!record(report) || report.sayHash !== sayHash(storyboard))
    throw new Error(`報告がないか、報告後に読み上げ文が変わっています。${again}`);
  if (typeof report.model !== "string" || !report.model.trim())
    throw new Error(`報告のモデルがありません。${again}`);
  const parsed = parsePolishResponse(report.response, storyboard);
  if (!parsed.response) throw new Error(`保存済みの校正応答が不正です。${again}`);
  return {
    model: report.model,
    response: parsed.response,
    judgments: judgeRewrites(storyboard, parsed.response),
    warnings: parsed.issues
      .filter((i) => i.level === "warning")
      .map((i) => `${i.path}: ${i.message}`),
  };
}

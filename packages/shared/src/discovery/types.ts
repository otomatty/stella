/**
 * 発見教材 (Discovery) の型と純関数 — I/O を持たない (Phase 4)。
 *
 * 発見教材は「つまずきの文脈から AI が作った補強演習」で、**全ユーザー共有のライブラリ**
 * に貯まり、講師レビューを通ったものだけが条件付きで受講者へ公開される。
 *
 * ## 選択式だけを扱う
 *
 * 自動採点できる形 (選択式) に限る。記述式や読み物を混ぜると「AI が書いたものを
 * 誰も読まずに配る」経路ができるうえ、採点の正誤が人手に戻ってしまう。だから
 * 設問はすべて `options` を持ち、正答は **選択肢の `correct` フラグ**で表す。
 *
 * ## 採点は小テスト / 腕試しと同じ規則
 *
 * 「正解集合と選択集合の完全一致」で 1 問ぶんの得点が入る。部分点は付けない
 * (`routes/quiz.ts` の `isExactSelection` と同じ)。ここに純関数として置くのは、
 * 生成直後の下書き検証 (承認できるか) と採点で同じ規則を使うため。
 */

import type { SkillMapState } from "../skill-map/evaluate.js";

/**
 * 発見教材を **見せてよい源流ステージの状態**。
 *
 * `active` (いま進めている) と `cleared` (終えた) だけ。学びの文脈がある人にしか
 * 出さない、という公開条件そのもの。`unlocked` を含めないのは、開いただけで手も
 * 付けていない星の補強演習が並ぶと「次の一手」がぼやけるため。`locked` / 霧の星は
 * 論外で、**存在ごと** 応答から落とす (教材名から未公開ステージの中身が読める)。
 *
 * 判定を純関数としてここに置くのは、一覧 (`/api/skill-map/mine`) と受験
 * (`/api/discovery/:id`) が同じ規則を通ることを型と実体の両方で担保するため —
 * 片方だけ緩むと「一覧には出ないが URL 直打ちで受けられる」穴になる。
 */
export function isDiscoveryVisible(state: SkillMapState | undefined): boolean {
  return state === "active" || state === "cleared";
}

/** 1 問あたりの配点。発見教材は全問同じ重みで、教材ごとの配点調整は持たない。 */
export const DISCOVERY_QUESTION_POINTS = 1;

/** 生成で狙う設問数 (heuristic フォールバックのサンプリング数でもある)。 */
export const DISCOVERY_QUESTION_COUNT = 5;

/**
 * 1 教材あたりの設問数の上限 (CMS の保存で弾く)。
 *
 * 発見教材は「つまずいた所をもう一度やる」補強演習で、腕試しのような網羅試験では
 * ない。上限が無いと 1 リクエストで巨大な JSON 列を作れてしまい、受験票の生成や
 * 一覧 (全教材を読む) が重くなる。狙いの 5 問に対して十分な余裕を残しつつ、
 * 「1 教材の分量」として無理のない数に留める。
 */
export const DISCOVERY_QUESTION_MAX = 20;

/**
 * 合格ライン (%)。
 *
 * 小テストの既定 (70%) に合わせる。腕試し (80%) より緩いのは、発見教材が
 * 「前提を飛ばす判定」ではなく「つまずいた所をもう一度やる」補強だから。
 */
export const DISCOVERY_PASS_SCORE = 70;

/** 出典。いまは AI 生成のみだが、将来 (講師の手書き) を足せるよう列挙で持つ。 */
export type DiscoverySource = "ai";

/** 下書きを作った実体。`heuristic` は AI を呼べなかったときのフォールバック。 */
export type DiscoveryGenerator = "anthropic" | "heuristic";

/** レビュー状態。公開されるのは `approved` だけ。 */
export type DiscoveryReviewStatus = "draft" | "approved" | "rejected";

/**
 * 公開条件。いまは 1 種類だけだが、列挙ではなく文字列で持つ (将来の拡張用)。
 *
 * `stage_active_or_cleared` = 源流ステージが「いま進めている」か「クリア済み」の
 * 受講者にだけ見せる。
 */
export type DiscoveryUnlockCondition = string;

export const DISCOVERY_UNLOCK_STAGE_ACTIVE_OR_CLEARED = "stage_active_or_cleared";

/** つまずきの出どころ。 */
export type DiscoveryRequestOrigin = "quiz_fail" | "submission_resubmit";

export interface DiscoveryOption {
  id: string;
  label: string;
  /** 正答か。**受講者向けの応答からは必ず落とす。** */
  correct: boolean;
}

export interface DiscoveryQuestion {
  id: string;
  prompt: string;
  options: DiscoveryOption[];
  /** 解説 (任意)。採点結果には出さない (何度でも受けられるため)。 */
  explanation?: string;
}

/** 受講者に見せる 1 問 (正答と解説を落とした形)。 */
export interface DiscoveryPaperQuestion {
  id: string;
  /** 正答が複数あるかで決まる (画面が単一選択 / 複数選択を描き分ける)。 */
  kind: "single" | "multiple";
  prompt: string;
  points: number;
  options: { id: string; label: string }[];
}

function trimmedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** id がすべて相異なるか。 */
function allUnique(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

/**
 * 任意の値 (AI 応答 / CMS の編集 / D1 の JSON 列) を設問配列へ正規化する。
 *
 * **壊れた設問は捨てる**。空の問題文や選択肢 2 つ未満の設問を残すと、承認の条件
 * (各問に正答が 1 つ以上) を満たしていても受験できない教材ができてしまう。
 * id は与えられていればそのまま、無ければ位置から振る (採点は id で突き合わせる
 * ので、同じ教材を読み直すたびに変わってはいけない)。
 *
 * ## id の重複は **その場で振り直す**
 *
 * 採点は id の集合一致で決まる (`gradeDiscovery`)。同じ設問の中で誤答が正答と
 * **同じ選択肢 id** を持つと、誤答を選んでも「正答 id を選んだ」ことになり満点が
 * 出る — AI 応答も CMS の編集も外から来る値なので、ここで塞がないと採点が壊れる。
 * 設問 id の重複も同じで、回答が別の設問へ流れ込む。
 *
 * 重複を見つけたら **その並び全体を位置ベース id へ振り直す** (一部だけ直すと、
 * 振り直した id が残った id と再び衝突しうる)。正常な教材の id は動かないので、
 * 受験中の突き合わせが変わることもない。
 */
export function normalizeDiscoveryQuestions(raw: unknown): DiscoveryQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: DiscoveryQuestion[] = [];
  raw.forEach((item, qi) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const prompt = trimmedString(row.prompt, 500);
    if (!prompt) return;
    const optionsRaw = Array.isArray(row.options) ? row.options : [];
    const options: DiscoveryOption[] = [];
    optionsRaw.forEach((opt, oi) => {
      if (!opt || typeof opt !== "object") return;
      const o = opt as Record<string, unknown>;
      const label = trimmedString(o.label, 300);
      if (!label) return;
      options.push({
        id: trimmedString(o.id, 64) || `q${qi + 1}o${oi + 1}`,
        label,
        correct: o.correct === true,
      });
    });
    if (options.length < 2) return;
    const explanation = trimmedString(row.explanation, 800);
    out.push({
      id: trimmedString(row.id, 64) || `q${qi + 1}`,
      prompt,
      options,
      ...(explanation ? { explanation } : {}),
    });
  });

  // 設問 id の重複 → 位置ベースへ振り直す。
  const deduped = allUnique(out.map((q) => q.id))
    ? out
    : out.map((q, i) => ({ ...q, id: `q${i + 1}` }));

  // 選択肢 id の重複 → その設問の選択肢だけを位置ベースへ振り直す。
  return deduped.map((q, qi) =>
    allUnique(q.options.map((o) => o.id))
      ? q
      : {
          ...q,
          options: q.options.map((o, oi) => ({ ...o, id: `q${qi + 1}o${oi + 1}` })),
        },
  );
}

/** 各問に正答が 1 つ以上あるか (**承認の条件**)。設問が 0 問なら false。 */
export function hasUsableCorrectOptions(questions: DiscoveryQuestion[]): boolean {
  if (questions.length === 0) return false;
  return questions.every((q) => q.options.some((o) => o.correct));
}

/** 受講者向けの受験票 (正答と解説を落とす)。 */
export function toDiscoveryPaper(questions: DiscoveryQuestion[]): DiscoveryPaperQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    kind:
      q.options.filter((o) => o.correct).length > 1 ? ("multiple" as const) : ("single" as const),
    prompt: q.prompt,
    points: DISCOVERY_QUESTION_POINTS,
    options: q.options.map((o) => ({ id: o.id, label: o.label })),
  }));
}

export interface DiscoveryAnswer {
  question_id: string;
  selected_option_ids: string[];
}

export interface DiscoveryGrade {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
}

/**
 * 採点。**受験票はサーバが持つ設問そのもの**で、送られてきた設問 id は突き合わせに
 * しか使わない (易しい 1 問だけ送って満点、を作らない)。
 *
 * 正答を 1 つも持たない設問は満点にも得点にも数えない — どう答えても不正解になる
 * 設問の配点だけが満点に乗ると、合格ラインへ届かなくなる (腕試しと同じ判断)。
 */
export function gradeDiscovery(
  questions: DiscoveryQuestion[],
  answers: DiscoveryAnswer[],
): DiscoveryGrade {
  const selectedByQuestion = new Map<string, Set<string>>();
  for (const answer of answers) {
    if (!answer || typeof answer.question_id !== "string") continue;
    const ids = Array.isArray(answer.selected_option_ids) ? answer.selected_option_ids : [];
    selectedByQuestion.set(
      answer.question_id,
      new Set(ids.filter((v): v is string => typeof v === "string")),
    );
  }

  let score = 0;
  let maxScore = 0;
  for (const question of questions) {
    const correct = new Set(question.options.filter((o) => o.correct).map((o) => o.id));
    if (correct.size === 0) continue;
    maxScore += DISCOVERY_QUESTION_POINTS;
    const selected = selectedByQuestion.get(question.id) ?? new Set<string>();
    if (selected.size === correct.size && [...correct].every((id) => selected.has(id))) {
      score += DISCOVERY_QUESTION_POINTS;
    }
  }
  const percent = maxScore <= 0 ? 0 : Math.round((score * 100) / maxScore);
  return { score, maxScore, percent, passed: maxScore > 0 && percent >= DISCOVERY_PASS_SCORE };
}

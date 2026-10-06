/**
 * コードの復習: 同じ実装パターンの類題を、時間を空けて出す (#39・07 §7.2・03 §7)。
 *
 * 知識は SRS (`review_cards`) で復習するが、コードは同じ問題を解き直させない。教材の課題の
 * 非公開の予備 (`variants/<類題>/`) に置いた類題を、受講者ごとに出題した時点で IDE に配る。
 * 出題済みは受講者ごとに記録し、一度出した類題を「未見」として出し直さない。
 * (このファイルは Web も読むので、非公開の素材のパスを書かない。Web のビルドが止める。)
 *
 * ここには、次にいつ・何の目的で出すか (`nextVariantSlot`) と、在庫から何を選ぶか
 * (`pickVariant`) を純粋関数で置く。API はこれを当てて D1 の `variant_reviews` に記録する。
 *
 * 出す時期:
 * - パターンの練習 (同じパターンの課題のうち確認B以外) にすべて合格した時点を起点にする。
 *   起点の合格 (練習のうち種別がいちばん難しい課題の合格。`assistDecidingPass`) が自力なら、約 3 日後・約 1 週間後 (= 確認B)・
 *   約 3 週間後に確認用の類題を出す。教材に通常の確認B (類題でない `assessment-b`) がある
 *   パターンは、1 週間後の枠をその確認Bに任せて類題を出さない (学習ペースの確認Bと二重にしない)。
 * - 起点の合格が支援付きなら、間隔を短くし、補習の小問題を 3 問 (1 日 1 問、前の合格の翌日から)、
 *   その翌日以降に未見の問題を出す。未見の問題に自力で合格したら、そこを起点に自力の間隔へ戻る。
 * - 時間を空けた類題・未見の問題が支援付きの合格だったら、補習からやり直す。
 * - 1 つ前の出題に合格するまで、そのパターンの次は出さない (出題は 1 つずつ進む)。
 */

import { addStudyDays, toStudyDate } from "../study/activity.js";
import type { TaskStatus } from "./catalog.js";
import type { TaskKind } from "./manifest.js";

/** 出題の目的。 */
export const VARIANT_PURPOSES = ["day3", "week1", "week3", "remedial", "unseen"] as const;
export type VariantPurpose = (typeof VARIANT_PURPOSES)[number];

export const VARIANT_PURPOSE_LABELS: Readonly<Record<VariantPurpose, string>> = {
  day3: "約 3 日後の類題",
  week1: "約 1 週間後の類題 (確認B)",
  week3: "約 3 週間後の類題",
  remedial: "補習の小問題",
  unseen: "未見の問題",
};

/** 時間を空けた類題 (合格すると習得の水準が「時間を空けて確認」になりうる)。 */
export const SPACED_VARIANT_PURPOSES: readonly VariantPurpose[] = ["day3", "week1", "week3"];

/**
 * 出題の記録の状態。
 * - `scheduled`: 出す日を決めた (類題はまだ選んでいない)
 * - `issued`: 類題を選んで受講者に出した (受講者はこの類題の配布・提出・ヘルプを使える)
 * - `passed`: 出した類題に合格した (AI か人の合格)
 * - `out-of-stock`: 出す日になったが、未見の類題が在庫に無かった (講師が在庫の不足を見る)
 * - `withdrawn`: 出した類題が教材から外れた。同じ目的の次の出題で別の類題を出す
 */
export const VARIANT_REVIEW_STATUSES = [
  "scheduled",
  "issued",
  "passed",
  "out-of-stock",
  "withdrawn",
] as const;
export type VariantReviewStatus = (typeof VARIANT_REVIEW_STATUSES)[number];

/** 自力で起点に合格したパターンの、起点からの日数。 */
export const VARIANT_SPACING_DAYS: Readonly<Record<"day3" | "week1" | "week3", number>> = {
  day3: 3,
  week1: 7,
  week3: 21,
};
/** 支援付きの合格のあとに出す補習の小問題の数 (03 §7 の「3 問程度」)。 */
export const REMEDIAL_VARIANT_COUNT = 3;

/** 補習の小問題に使える種別 (ヒントを開ける練習)。 */
export const REMEDIAL_VARIANT_KINDS: readonly TaskKind[] = ["basic", "connection"];
/** 確認・時間を空けた類題・未見の問題に使える種別 (自分で手順を選ぶ別の問題)。 */
export const CHECK_VARIANT_KINDS: readonly TaskKind[] = [
  "independent",
  "debug",
  "assessment-a",
  "assessment-b",
];

/**
 * 目的ごとに使える類題の種別。先に書いた種別から選ぶ。1 週間後は確認Bの代わりなので
 * `assessment-b` を、未見の問題は確認Aにあたるので `assessment-a` を先に選ぶ。
 * 統合 (`integration`) は既存の画面・機能に組み込む節目の課題なので類題にしない。
 */
export const VARIANT_KINDS_BY_PURPOSE: Readonly<Record<VariantPurpose, readonly TaskKind[]>> = {
  day3: ["independent", "debug", "assessment-a", "assessment-b"],
  week1: ["assessment-b", "independent", "debug", "assessment-a"],
  week3: ["assessment-b", "independent", "debug", "assessment-a"],
  remedial: ["basic", "connection"],
  unseen: ["assessment-a", "independent", "debug", "assessment-b"],
};

/** 類題にできない種別なら理由を返す (教材の検査で使う)。 */
export function variantKindProblem(kind: TaskKind): string | undefined {
  if (REMEDIAL_VARIANT_KINDS.includes(kind) || CHECK_VARIANT_KINDS.includes(kind)) return undefined;
  return `類題の kind は、補習の小問題なら ${REMEDIAL_VARIANT_KINDS.join(" / ")}、確認・時間を空けた類題なら ${CHECK_VARIANT_KINDS.join(" / ")} にしてください`;
}

/** 受講者・パターンの出題の記録 1 行 (step の順)。時刻は UNIX ミリ秒。 */
export interface VariantSlotRecord {
  step: number;
  purpose: VariantPurpose;
  status: VariantReviewStatus;
  /** 間隔を数える起点 (自力の間隔の始まり)。 */
  anchorAt: number;
  /** 出す日 (日本時間の学習日 `YYYY-MM-DD`)。 */
  dueOn: string;
  passedAt: number | null;
  /** 合格が支援付きだったか。合格前は null。 */
  passedAssisted: boolean | null;
}

/**
 * 自力か支援付きかを決める課題の種別の順 (難しい順)。パターンの練習のうち、この順でいちばん上の
 * 種別の課題の解け方で決める。最後に合格した課題で決めると、難しい課題をヒント付きで解いたあと
 * 易しい課題を自力で解けば「自力」になり、解く順番で結果が変わるため。
 * 確認Bは起点のあとに解くので練習に入らない。
 */
export const ASSIST_DECIDING_KIND_ORDER: readonly TaskKind[] = [
  "assessment-a",
  "integration",
  "independent",
  "debug",
  "connection",
  "basic",
];

/**
 * パターンの練習の合格のうち、自力か支援付きかを決める 1 つ (`ASSIST_DECIDING_KIND_ORDER` で
 * いちばん上の種別。同じ種別なら最後に合格したもの)。合格が無ければ null。
 */
export function assistDecidingPass<T extends { kind: string; passedAt: number }>(
  passes: readonly T[],
): T | null {
  const rank = (kind: string) => {
    const i = (ASSIST_DECIDING_KIND_ORDER as readonly string[]).indexOf(kind);
    return i === -1 ? ASSIST_DECIDING_KIND_ORDER.length : i;
  };
  let best: T | null = null;
  for (const pass of passes) {
    if (
      !best ||
      rank(pass.kind) < rank(best.kind) ||
      (rank(pass.kind) === rank(best.kind) && pass.passedAt > best.passedAt)
    )
      best = pass;
  }
  return best;
}

/** パターンの練習をすべて合格した時点 (起点) と、その合格が支援付きだったか。 */
export interface PatternCompletion {
  at: number;
  assisted: boolean;
}

/** 次に積む出題。 */
export interface VariantSlot {
  step: number;
  purpose: VariantPurpose;
  anchorAt: number;
  dueOn: string;
}

function laterDate(a: string, b: string): string {
  return a >= b ? a : b;
}

/**
 * 次に積む出題を決める。積めるものが無ければ null (まだ前の出題に合格していない・
 * 起点に達していない・自力の間隔を終えた)。
 *
 * `hasRegularAssessmentB` は、教材にそのパターンの通常の確認B (類題でない `assessment-b`) が
 * あるか。あれば 1 週間後の枠を飛ばす (学習ペースが起点の確認Aの 7 日後に確認Bを予定する)。
 */
export function nextVariantSlot(
  records: readonly VariantSlotRecord[],
  completion: PatternCompletion | null,
  options: { hasRegularAssessmentB: boolean },
): VariantSlot | null {
  const rows = [...records].sort((a, b) => a.step - b.step);
  const last = rows.at(-1);
  if (!last) {
    if (!completion) return null;
    const day = toStudyDate(completion.at);
    return completion.assisted
      ? { step: 1, purpose: "remedial", anchorAt: completion.at, dueOn: addStudyDays(day, 1) }
      : {
          step: 1,
          purpose: "day3",
          anchorAt: completion.at,
          dueOn: addStudyDays(day, VARIANT_SPACING_DAYS.day3),
        };
  }
  const step = last.step + 1;
  // 出した類題が教材から外れたら、同じ目的・同じ日で別の類題を出し直す。
  if (last.status === "withdrawn")
    return { step, purpose: last.purpose, anchorAt: last.anchorAt, dueOn: last.dueOn };
  if (last.status !== "passed" || last.passedAt === null) return null;
  const passedDay = toStudyDate(last.passedAt);
  const remedial = (): VariantSlot => ({
    step,
    purpose: "remedial",
    anchorAt: last.anchorAt,
    dueOn: addStudyDays(passedDay, 1),
  });
  if (last.purpose === "remedial") {
    // 末尾から続く補習の合格を数える (教材から外れた出題は数えない)。
    let passedRemedials = 0;
    for (const row of [...rows].reverse()) {
      if (row.status === "withdrawn") continue;
      if (row.purpose !== "remedial") break;
      passedRemedials += 1;
    }
    if (passedRemedials < REMEDIAL_VARIANT_COUNT) return remedial();
    return { step, purpose: "unseen", anchorAt: last.anchorAt, dueOn: addStudyDays(passedDay, 1) };
  }
  // 確認の類題に支援付きでしか合格できなければ、補習からやり直す。
  if (last.passedAssisted !== false) return remedial();
  if (last.purpose === "unseen")
    return {
      step,
      purpose: "day3",
      anchorAt: last.passedAt,
      dueOn: addStudyDays(passedDay, VARIANT_SPACING_DAYS.day3),
    };
  const nextPurpose =
    last.purpose === "day3"
      ? options.hasRegularAssessmentB
        ? "week3"
        : "week1"
      : last.purpose === "week1"
        ? "week3"
        : null;
  if (!nextPurpose) return null;
  // 起点からの日数を基本にし、前の類題を遅れて解いた場合も、前の類題との間を設計どおり空ける。
  const anchorDay = toStudyDate(last.anchorAt);
  const gap = VARIANT_SPACING_DAYS[nextPurpose] - VARIANT_SPACING_DAYS[last.purpose];
  return {
    step,
    purpose: nextPurpose,
    anchorAt: last.anchorAt,
    dueOn: laterDate(
      addStudyDays(anchorDay, VARIANT_SPACING_DAYS[nextPurpose]),
      addStudyDays(passedDay, gap),
    ),
  };
}

/** 在庫の類題 1 件。`order` は教材の並び (同じ条件なら先に書いた類題から出す)。 */
export interface VariantStockItem {
  id: string;
  kind: TaskKind;
  order: number;
}

/**
 * 在庫から、その受講者にまだ出していない類題を 1 つ選ぶ。目的に合う種別 (先に書いた種別ほど
 * 優先) → 教材の並び → ID の順。無ければ null (在庫切れ)。
 */
export function pickVariant(
  purpose: VariantPurpose,
  stock: readonly VariantStockItem[],
  seen: ReadonlySet<string>,
): VariantStockItem | null {
  const kinds = VARIANT_KINDS_BY_PURPOSE[purpose];
  const candidates = stock
    .filter((item) => !seen.has(item.id) && kinds.includes(item.kind))
    .sort(
      (a, b) =>
        kinds.indexOf(a.kind) - kinds.indexOf(b.kind) ||
        a.order - b.order ||
        a.id.localeCompare(b.id),
    );
  return candidates[0] ?? null;
}

/** `GET /api/variant-reviews/today` の今日の類題。 */
export interface TodayVariantReview {
  taskId: string;
  title: string;
  kind: TaskKind;
  pattern: string;
  purpose: VariantPurpose;
  dueOn: string;
  issuedAt: string;
  /** 類題の課題の状態。 */
  status: TaskStatus;
}

/** `GET /api/variant-reviews/stock` のパターンごとの在庫と、在庫切れで待っている受講者。 */
export interface VariantStockSummary {
  pattern: string;
  /** 教材にある有効な類題の数 (補習の小問題・確認用)。 */
  stock: { remedial: number; check: number };
  waiting: { userId: string; name: string; purpose: VariantPurpose; dueOn: string }[];
}

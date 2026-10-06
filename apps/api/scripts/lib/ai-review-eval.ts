/**
 * AI 一次レビューの評価用データと、人の判定との一致率 (07 §6.3・§6.6)。
 *
 * 人がレビューした提出 (submission_reviews の source = human) に、その提出の AI の結果
 * (ai_reviews) を突き合わせる。AI が合格にした提出を人が事後確認で「確認済み」「コメント」に
 * した提出 (#34、submission_checks) も、人が合格を認めた例として含める (覆したものは人の
 * レビューの行が残るのでそちらで数える)。モデル・指示・しきい値の版ごとにまとめ、どの組み合わせが
 * 人の判定に近いかを比べる。しきい値の見直しの目安 (07 §6.3) も同じ表で見る。
 */

import { isEvidenceKind } from "@stella/shared/review/ai-review";

/** D1 から読む 1 行 (AI の結果 1 件と、その提出への人の最後の判定)。 */
export interface EvalSourceRow {
  ai_review_id: string;
  submission_id: string;
  task_id: string;
  task_kind: string;
  task_content_hash: string;
  outcome: "confirmed" | "escalated";
  route_reasons: string;
  confidence: string | null;
  proposed_verdict: "pass" | "resubmit" | null;
  failure: string | null;
  model: string | null;
  prompt_version: string;
  threshold_version: string;
  human_verdict: "pass" | "resubmit" | "fail";
}

/** 評価用データの 1 件 (JSONL に書き出す)。提出のファイルは含めず、ID で引き直す。 */
export interface EvalExample {
  aiReviewId: string;
  submissionId: string;
  taskId: string;
  taskKind: string;
  taskContentHash: string;
  model: string | null;
  promptVersion: string;
  thresholdVersion: string;
  outcome: "confirmed" | "escalated";
  routeReasons: string[];
  confidence: string | null;
  proposedVerdict: "pass" | "resubmit" | null;
  failure: string | null;
  humanVerdict: "pass" | "resubmit" | "fail";
}

/**
 * 評価用データを取り出す SQL。人の判定は提出ごとに最後の 1 件を使う。同じ時刻の人の判定が
 * 2 件あっても AI の結果 1 件につき 1 行になるよう、`row_number()` で提出ごとに 1 件に絞る
 * (時刻の最大で結合すると、同時刻の判定の数だけ同じ例が重なって数えられる)。
 * 人のレビューが無く、事後確認で確認済み・コメントにした AI の合格は、人の判定を合格とみなす。
 */
export const EVAL_SOURCE_SQL = `
with human as (
  select submission_id, verdict,
    row_number() over (partition by submission_id order by created_at desc, id desc) as rn
  from submission_reviews
  where source = 'human'
),
checked as (
  select distinct submission_id from submission_checks where result in ('confirmed', 'commented')
)
select r.id as ai_review_id, r.submission_id, r.task_id, r.task_kind, r.task_content_hash,
  r.outcome, r.route_reasons, r.confidence, r.proposed_verdict, r.failure, r.model,
  r.prompt_version, r.threshold_version, coalesce(h.verdict, 'pass') as human_verdict
from ai_reviews r
left join human h on h.submission_id = r.submission_id and h.rn = 1
left join checked c on c.submission_id = r.submission_id
  and r.outcome = 'confirmed' and r.disposition = 'applied'
where h.verdict is not null or c.submission_id is not null
order by r.created_at`.trim();

export function toExample(row: EvalSourceRow): EvalExample {
  let reasons: string[] = [];
  try {
    const parsed = JSON.parse(row.route_reasons) as unknown;
    if (Array.isArray(parsed)) reasons = parsed.filter((r): r is string => typeof r === "string");
  } catch {
    reasons = [];
  }
  return {
    aiReviewId: row.ai_review_id,
    submissionId: row.submission_id,
    taskId: row.task_id,
    taskKind: row.task_kind,
    taskContentHash: row.task_content_hash,
    model: row.model,
    promptVersion: row.prompt_version,
    thresholdVersion: row.threshold_version,
    outcome: row.outcome,
    routeReasons: reasons,
    confidence: row.confidence,
    proposedVerdict: row.proposed_verdict,
    failure: row.failure,
    humanVerdict: row.human_verdict,
  };
}

export interface AgreementSummary {
  model: string;
  promptVersion: string;
  thresholdVersion: string;
  examples: number;
  /** AI が判定案を出せた件数 (判定できなかった・必須項目を判断できなかったものを除く)。 */
  judged: number;
  /** 判定案 (合格か否か) が人の判定と一致した割合。 */
  agreement: number | null;
  /** AI で確定した提出のうち、人が合格以外に覆した割合。 */
  confirmedOverturned: number | null;
  /** 練習で確信度「中」のまま AI で確定し、人が覆した割合 (1 割を超えたら中から人に回す)。 */
  practiceMediumOverturned: number | null;
  /** 人に回した提出のうち、人がそのまま合格にした割合 (8 割を超えたら条件が厳しすぎる)。 */
  escalatedHumanPassed: number | null;
  /** AI が判定できなかった件数。 */
  failures: number;
}

const rate = (hit: number, total: number) => (total === 0 ? null : hit / total);

/** モデル・指示・しきい値の版ごとに、人の判定との一致率をまとめる。 */
export function summarizeAgreement(examples: EvalExample[]): AgreementSummary[] {
  const groups = new Map<string, EvalExample[]>();
  for (const e of examples) {
    const key = JSON.stringify([e.model ?? "(なし)", e.promptVersion, e.thresholdVersion]);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([key, rows]) => {
      const [model, promptVersion, thresholdVersion] = JSON.parse(key) as [string, string, string];
      const judged = rows.filter((r) => r.proposedVerdict !== null);
      const agreed = judged.filter(
        (r) => (r.proposedVerdict === "pass") === (r.humanVerdict === "pass"),
      );
      const confirmed = rows.filter((r) => r.outcome === "confirmed");
      const practiceMedium = confirmed.filter(
        (r) => !isEvidenceKind(r.taskKind) && r.confidence === "medium",
      );
      const escalated = rows.filter((r) => r.outcome === "escalated");
      return {
        model,
        promptVersion,
        thresholdVersion,
        examples: rows.length,
        judged: judged.length,
        agreement: rate(agreed.length, judged.length),
        confirmedOverturned: rate(
          confirmed.filter((r) => r.humanVerdict !== "pass").length,
          confirmed.length,
        ),
        practiceMediumOverturned: rate(
          practiceMedium.filter((r) => r.humanVerdict !== "pass").length,
          practiceMedium.length,
        ),
        escalatedHumanPassed: rate(
          escalated.filter((r) => r.humanVerdict === "pass").length,
          escalated.length,
        ),
        failures: rows.filter((r) => r.failure !== null).length,
      };
    })
    .sort((a, b) => (b.agreement ?? -1) - (a.agreement ?? -1));
}

const percent = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);

/** 端末に出す表 (Markdown)。 */
export function formatAgreementTable(rows: AgreementSummary[]): string {
  const header = [
    "| モデル | 指示 | しきい値 | 件数 | 判定案 | 一致率 | AI確定を覆した | 練習・中を覆した | 人に回して合格 | 判定不能 |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  return [
    ...header,
    ...rows.map(
      (r) =>
        `| ${r.model} | ${r.promptVersion} | ${r.thresholdVersion} | ${r.examples} | ${r.judged} | ${percent(r.agreement)} | ${percent(r.confirmedOverturned)} | ${percent(r.practiceMediumOverturned)} | ${percent(r.escalatedHumanPassed)} | ${r.failures} |`,
    ),
  ].join("\n");
}

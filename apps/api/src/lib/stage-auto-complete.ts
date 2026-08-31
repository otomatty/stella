/**
 * 修了条件を満たしたステージの修了証を**自動発行**する (受講者の手動発行の置き換え)。
 *
 * クリアの正本は「修了した受講登録 ∪ 失効していない修了証」(`skill-map-data.ts`) のまま、
 * そこへ入る動線を変える: 以前は受講者が修了証ページの「発行する」を押して初めて
 * enrollment が completed になった (= 条件を満たしても押すまでスキルツリーが開かない)。
 * いまは条件が揃いうるイベント (レッスン完了の同期 / 小テスト合格 / 課題の合格確定) と
 * 読み出しの入口 (スキルマップ / 修了証一覧) で判定し、満たしていれば即クリアにする。
 *
 * **best-effort である。** ここは学習 API の付随処理なので、失敗しても呼び出し側の
 * 本編 (進捗の保存・採点結果) を 500 にしない。`recordStagePathEvents` と同じ方針で、
 * ログだけ残して空配列を返す — 次のイベントか読み出しの入口で再判定される。
 *
 * 自動発行するのは `auto_issue_certificate` のステージだけ。講師承認ステージは従来どおり
 * staff が Gradebook (`POST /api/certificates/issue`) から発行する。
 */

import { and, eq, inArray } from "drizzle-orm";

import type { StageClearedNotice, StageCompletion } from "@falcon/shared/cms/types";

import type { Db } from "../db/client.js";
import {
  certificates,
  enrollments,
  lessonProgress,
  lessons,
  notifications,
  profiles,
  quizAttempts,
  quizzes,
  sections,
  stages,
  submissions,
  tenants,
} from "../db/schema.js";
import type { AuditActor } from "./audit.js";
import { recordAudit } from "./audit.js";
import { D1_MAX_BOUND_PARAMS, chunk } from "./enrollment-bulk.js";
import { stageClearLockId, withResourceLock } from "./resource-lock.js";
import { recordStagePathEvents } from "./stage-path-events.js";

/**
 * `inArray` に渡す id の 1 クエリあたりの件数。固定バインド (user_id やフラグ) の
 * ぶんだけ上限から引いておく。進捗同期は最大 600 行を受けるので、レッスン id の
 * リストはバインド上限 (100) を平気で超える — 超えると `too many SQL variables` で
 * クエリごと落ちるため、id リストを使う SELECT はすべてこれで刻む。
 */
const IDS_PER_QUERY = D1_MAX_BOUND_PARAMS - 10;

/**
 * 1 回の自動判定で**発行まで進める**ステージ数の上限 (`runAutoComplete` のコメント参照)。
 * 達成判定そのものは候補全部に掛かる — 切るのは書き込み (ロック + 再判定 + batch + 監査)
 * の数だけ。`MAX_PROGRESS_SYNC_ROWS` (lesson-progress-write.ts) のクエリ収支はこの値を
 * 前提に計算しているので、増やすときはそちらも見直すこと。
 */
const MAX_ISSUES_PER_CALL = 15;

/** id リストをバインド上限内に刻んで同じ SELECT を流し、結果を連結する。 */
async function selectChunked<R>(
  ids: readonly string[],
  run: (slice: string[]) => Promise<R[]>,
): Promise<R[]> {
  const out: R[] = [];
  for (const slice of chunk([...ids], IDS_PER_QUERY)) {
    out.push(...(await run(slice)));
  }
  return out;
}

/** 自動クリアになったステージ (レスポンスに載せて画面がダイアログを出す)。 */
export type { StageClearedNotice };

/** ランダムな cert_code を生成する (FLC-YYYY-XXXX-XXXX)。 */
export function genCertCode(): string {
  const year = new Date().getFullYear();
  const seg = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(2)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  return `FLC-${year}-${seg()}-${seg()}`;
}

export interface CompletionCriteriaFlags {
  requireAllLessons: boolean;
  requireQuizPass: boolean;
  requireAssignmentPass: boolean;
}

export interface CompletionCounts {
  totalLessons: number;
  completedLessons: number;
  totalQuizzes: number;
  passedQuizzes: number;
  totalAssignments: number;
  passedAssignments: number;
}

/**
 * 修了条件の判定式。`computeStageCompletion` / `batchComputeCompletions`
 * (routes/certificates.ts) と自動発行の 3 か所で同じ式を使うため 1 か所に置く。
 *
 * レッスン 0 件のステージは常に未達 — 空のステージが作った瞬間に修了になるのを防ぐ。
 */
export function completionMet(
  criteria: CompletionCriteriaFlags,
  counts: CompletionCounts,
): boolean {
  return (
    counts.totalLessons > 0 &&
    (!criteria.requireAllLessons || counts.completedLessons >= counts.totalLessons) &&
    (!criteria.requireQuizPass || counts.passedQuizzes >= counts.totalQuizzes) &&
    (!criteria.requireAssignmentPass || counts.passedAssignments >= counts.totalAssignments)
  );
}

export interface AutoCompleteInput {
  /** 監査ログの実行者 (受講者本人、または合格を確定した講師)。テナントもここから取る。 */
  actor: AuditActor;
  /** 判定対象の受講者。 */
  userId: string;
  /** 判定するステージ (重複可・他テナントや未登録は黙って落とす)。 */
  stageIds: readonly string[];
  ip?: string | null;
}

/**
 * 指定ステージのうち修了条件を満たしたものへ修了証を発行し、enrollment を completed にする。
 *
 * 返り値は**この呼び出しで新しくクリアになった**ステージだけ (既発行・未達・対象外は含まない)。
 * 同時リクエストで競合しても、修了証の一意索引 (user, stage) で片方だけが「新しくクリア」になる。
 */
export async function autoCompleteStagesIfMet(
  db: Db,
  input: AutoCompleteInput,
): Promise<StageClearedNotice[]> {
  try {
    return await runAutoComplete(db, input);
  } catch (e) {
    console.error("[stage-auto-complete] 自動修了の判定に失敗 (学習フローは継続)", e);
    return [];
  }
}

/**
 * 受講者のアクティブな受講登録すべてを候補に判定する (読み出しの入口用)。
 *
 * イベントを取りこぼした受講者 (この機能の導入前に条件を満たしていた等) を、
 * スキルマップ / 修了証一覧を開いたときに救済する。定常状態では読み取りだけで終わる。
 */
export async function autoCompleteEligibleStages(
  db: Db,
  actor: AuditActor,
  userId: string,
  ip?: string | null,
): Promise<StageClearedNotice[]> {
  try {
    const enrolled = await db
      .select({ stageId: enrollments.stageId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.tenantId, actor.tenantId),
          eq(enrollments.status, "active"),
        ),
      );
    if (enrolled.length === 0) return [];
    return await runAutoComplete(db, {
      actor,
      userId,
      stageIds: enrolled.map((row) => row.stageId),
      ip: ip ?? null,
    });
  } catch (e) {
    console.error("[stage-auto-complete] 自動修了の判定に失敗 (学習フローは継続)", e);
    return [];
  }
}

/**
 * レッスン id → 属するステージ id (重複除去)。進捗同期・添削確定のフックが「完了行の
 * 付いたステージ」を割り出すのに使う。同期は数百行を受けるためチャンクして引く。
 *
 * 自動修了の入口専用なので、これも best-effort (失敗したら空 = 判定しないだけ)。
 */
export async function stageIdsOfLessons(db: Db, lessonIds: readonly string[]): Promise<string[]> {
  if (lessonIds.length === 0) return [];
  try {
    const rows = await selectChunked([...new Set(lessonIds)], (slice) =>
      db
        .select({ stageId: sections.stageId })
        .from(lessons)
        .innerJoin(sections, eq(sections.id, lessons.sectionId))
        .where(inArray(lessons.id, slice)),
    );
    return [...new Set(rows.map((row) => row.stageId))];
  } catch (e) {
    console.error("[stage-auto-complete] レッスン→ステージ解決に失敗 (学習フローは継続)", e);
    return [];
  }
}

/**
 * 合格の取り消しで修了条件が崩れたステージの自動発行を巻き戻す。
 *
 * 添削の verdict を pass から下げても、発行済みの修了証と completed の受講登録が残ると
 * その受講者は「クリア済み」のまま (クリア = 修了した登録 ∪ 有効な修了証)。誤って付けた
 * 合格を講師が直せるよう、**自動発行の修了証に限って** 条件を再判定し、もう満たして
 * いなければ修了証の削除と登録の active 戻しを 1 batch (= D1 のトランザクション) で行う。
 *
 * - staff が手動発行した修了証 (`issued_by` 非 null) と revoke 済みの修了証は触らない —
 *   staff の明示的な判断はここで上書きしない
 * - revoke ではなく **削除** にする: (user, stage) の一意索引があるため revoked 行が残ると
 *   再合格しても二度と自動発行できない。発行と取り消しの経緯は監査ログ側に残る
 * - 別の合格提出が同じレッスンに残っていれば条件は崩れていないので何もしない
 * - レッスン進捗・クイズ合格は単調 (取り消しが無い) ため、逆向きの入口は添削の
 *   verdict 訂正だけ
 *
 * best-effort — 失敗しても添削の保存 (呼び出し側の本編) は成功させる。
 */
export async function reclaimAutoCertificatesIfUnmet(
  db: Db,
  { actor, userId, stageIds, ip }: AutoCompleteInput,
): Promise<void> {
  try {
    for (const stageId of new Set(stageIds)) {
      const stageRows = await db
        .select()
        .from(stages)
        .where(and(eq(stages.id, stageId), eq(stages.tenantId, actor.tenantId)))
        .limit(1);
      const stage = stageRows[0];
      if (!stage) continue;

      // 発行側と同じ (受講者, ステージ) ロックの中で読み直してから消す。ロック無しだと
      // 「修了証がまだ無い」で素通りした直後に、並走する発行が古い判定で発行し得る。
      //
      // 待ちは 5 秒 — 巻き戻しには次の入口のような再試行の機会が無いため、発行側
      // (待たない) より粘る。相手のロック保持は数クエリぶん (ミリ秒オーダ) なので、
      // 5 秒で取れないのは保持したまま Worker が落ちた場合 (TTL 30 秒で開く) だけ。
      // その残余はログに残し、講師が同じ提出の verdict を保存し直せば再実行される。
      const reclaimed = await withResourceLock(
        db,
        stageClearLockId(actor.tenantId, userId, stageId),
        async () => {
          const certRows = await db
            .select({
              id: certificates.id,
              certCode: certificates.certCode,
              issuedBy: certificates.issuedBy,
              revoked: certificates.revoked,
            })
            .from(certificates)
            .where(and(eq(certificates.userId, userId), eq(certificates.stageId, stageId)))
            .limit(1);
          const cert = certRows[0];
          if (!cert || cert.issuedBy !== null || cert.revoked) return null;

          const counts =
            (await batchComputeCounts(db, [stageId], userId)).get(stageId) ?? EMPTY_COUNTS;
          if (completionMet(stage, counts)) return null;

          await db.batch([
            db.delete(certificates).where(eq(certificates.id, cert.id)),
            db
              .update(enrollments)
              .set({ status: "active", completedAt: null })
              .where(
                and(
                  eq(enrollments.userId, userId),
                  eq(enrollments.stageId, stageId),
                  eq(enrollments.status, "completed"),
                ),
              ),
          ]);
          return cert;
        },
        { waitMs: 5_000 },
      );
      if (!reclaimed.ran) {
        console.error(
          `[stage-auto-complete] 巻き戻しのロックを取得できず後回し (verdict の保存し直しで再実行される) (user=${userId} stage=${stageId})`,
        );
        continue;
      }
      if (reclaimed.value === null) continue;

      await recordAudit(db, actor, {
        action: "certificate_reclaim",
        targetType: "certificate",
        targetId: reclaimed.value.id,
        ip: ip ?? null,
        metadata: {
          cert_code: reclaimed.value.certCode,
          stage_id: stageId,
          user_id: userId,
          reason: "completion_criteria_unmet",
        },
      });
    }
  } catch (e) {
    console.error("[stage-auto-complete] 修了証の巻き戻しに失敗 (添削の保存は継続)", e);
  }
}

async function runAutoComplete(
  db: Db,
  { actor, userId, stageIds, ip }: AutoCompleteInput,
): Promise<StageClearedNotice[]> {
  const candidateIds = [...new Set(stageIds)].filter(Boolean);
  if (candidateIds.length === 0) return [];

  // 対象は同テナント・公開済み・自動発行のステージだけ。講師承認ステージは staff の
  // 発行 (POST /api/certificates/issue) がクリアのトリガのまま。
  const stageRows = await selectChunked(candidateIds, (slice) =>
    db
      .select()
      .from(stages)
      .where(
        and(
          inArray(stages.id, slice),
          eq(stages.tenantId, actor.tenantId),
          eq(stages.status, "published"),
          eq(stages.autoIssueCertificate, true),
        ),
      ),
  );
  if (stageRows.length === 0) return [];

  // アクティブな受講登録があるステージだけ (期限切れの登録を勝手に修了へ進めない)。
  const enrolledRows = await selectChunked(
    stageRows.map((s) => s.id),
    (slice) =>
      db
        .select({ stageId: enrollments.stageId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.tenantId, actor.tenantId),
            inArray(enrollments.stageId, slice),
            eq(enrollments.status, "active"),
          ),
        ),
  );
  const enrolledIds = new Set(enrolledRows.map((row) => row.stageId));

  // 既に修了証があるステージはクリア済み (revoked も一意索引 (user, stage) で再発行不可)。
  const certRows = await selectChunked(candidateIds, (slice) =>
    db
      .select({ stageId: certificates.stageId })
      .from(certificates)
      .where(and(eq(certificates.userId, userId), inArray(certificates.stageId, slice))),
  );
  const certifiedIds = new Set(certRows.map((row) => row.stageId));

  const targets = stageRows.filter((s) => enrolledIds.has(s.id) && !certifiedIds.has(s.id));
  if (targets.length === 0) return [];

  // 達成判定は **候補全部** に掛け、頭打ちは下の発行数にだけ掛ける。候補側で切ると、
  // 未達のステージが先頭を埋めた受講者 (seed-learner のように全ステージへ登録がある)
  // では、後ろにいる達成済みステージが毎回評価されず永久に発行されない。
  // 発行数で切るぶんには飢餓は起きない — 発行済みは candidates から抜けるので、
  // あふれた達成済みステージは次の入口 (次の同期・スキルマップ / 修了証一覧の
  // バックフィル) が順に拾い、呼び出しのたびに残りが減っていく。
  const countsByStage = await batchComputeCounts(
    db,
    targets.map((s) => s.id),
    userId,
  );
  const metStages = targets
    .filter((stage) => completionMet(stage, countsByStage.get(stage.id) ?? EMPTY_COUNTS))
    .slice(0, MAX_ISSUES_PER_CALL);
  if (metStages.length === 0) return [];

  const recipientRows = await db
    .select({ name: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  const recipientName = recipientRows[0]?.name;
  if (!recipientName) return [];
  const tenantRows = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, actor.tenantId))
    .limit(1);
  const tenantName = tenantRows[0]?.name ?? actor.tenantId;

  const cleared: StageClearedNotice[] = [];
  for (const stage of metStages) {
    // 発行は (受講者, ステージ) の排他ロックの中で **判定材料を読み直してから** 書く。
    // 上で計算した counts は、合格の PATCH とその訂正が重なると batch の実行前に
    // 古びる — 訂正側の巻き戻し (reclaim) が「まだ修了証が無い」で素通りした後に、
    // こちらが古い判定で発行すると、最終 verdict は不合格なのにクリアが残る。
    // ロックを取れなかったときは何もしない (次の入口の再判定が拾う)。待たないのは、
    // 進捗同期の裏で走る処理なので取り合いで本編を遅らせないため。
    const issued = await withResourceLock(
      db,
      stageClearLockId(actor.tenantId, userId, stage.id),
      async () => {
        // 受講登録がまだ active かもロックの中で読み直す。外側の絞り込みの後に staff が
        // 登録を期限切れ / 削除にしていると、修了証だけでクリア扱いになる行を作ってしまう。
        const enrolled = await db
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, userId),
              eq(enrollments.stageId, stage.id),
              eq(enrollments.tenantId, actor.tenantId),
              eq(enrollments.status, "active"),
            ),
          )
          .limit(1);
        if (!enrolled[0]) return null;

        const counts =
          (await batchComputeCounts(db, [stage.id], userId)).get(stage.id) ?? EMPTY_COUNTS;
        if (!completionMet(stage, counts)) return null;
        // 修了証の発行と受講登録の completed 化は 1 batch (= D1 のトランザクション)。
        // 別々に流すと、発行だけ成功して落ちた場合に「修了証はあるのに登録が active の
        // まま」の行が残り、再判定は certifiedIds でそのステージを飛ばすため二度と直らない。
        // 発行が衝突 (同時リクエストが先に発行) しても UPDATE は同じ値を書くだけで無害。
        const [inserted, completedEnrollments] = await db.batch([
          db
            .insert(certificates)
            .values({
              tenantId: actor.tenantId,
              userId,
              stageId: stage.id,
              certCode: genCertCode(),
              // 自動発行なので発行者は置かない (手動発行の staff とは監査 metadata で区別する)。
              issuedBy: null,
              criteriaSnapshot: toCompletionSnapshot(stage, counts, userId),
              recipientName,
              stageTitle: stage.title,
              tenantName,
            })
            .onConflictDoNothing({ target: [certificates.userId, certificates.stageId] })
            .returning({ id: certificates.id, certCode: certificates.certCode }),
          db
            .update(enrollments)
            .set({ status: "completed", completedAt: new Date() })
            // active 以外 (期限切れ等) を completed で上書きしないよう UPDATE 自体にも
            // ガードを掛ける — 上の再確認との間に staff が状態を変えても巻き込まれない。
            .where(
              and(
                eq(enrollments.userId, userId),
                eq(enrollments.stageId, stage.id),
                eq(enrollments.status, "active"),
              ),
            )
            .returning({ id: enrollments.id }),
        ]);
        if (!inserted[0]) return null;
        // 発行できたのに UPDATE が 0 行 = 上の再確認と batch の間に staff が登録を
        // 期限切れ / 削除にした。修了証だけでクリア扱いになる行を残さないよう、
        // ロックを持ったまま発行を取り消して「発行しなかった」ことにする。
        if (!completedEnrollments[0]) {
          await db.delete(certificates).where(eq(certificates.id, inserted[0].id));
          return null;
        }
        return inserted[0];
      },
      { waitMs: 0 },
    );
    // ロックを取れなかった / 再判定で未達 / 同時リクエストが先に発行していた —
    // どれも「この呼び出しでは新しくクリアにならなかった」なので何もしない。
    if (!issued.ran || issued.value === null) continue;
    const insertedCert = issued.value;

    await recordAudit(db, actor, {
      action: "certificate_issue",
      targetType: "certificate",
      targetId: insertedCert.id,
      ip: ip ?? null,
      metadata: {
        cert_code: insertedCert.certCode,
        stage_id: stage.id,
        user_id: userId,
        auto_issued: true,
      },
    });

    // 受講者本人への永続通知。講師の合格確定が引き金のクリアは、開いたままの
    // 受講者セッションにレスポンス経由のイベントが届かない (以後の読み出しは既発行を
    // 見て cleared_stages を返さない) ため、通知センターで後から追えるようにする。
    // best-effort — 失敗しても発行は成立させる。
    try {
      await db.insert(notifications).values({
        userId,
        tenantId: actor.tenantId,
        type: "stage_cleared",
        title: `${stage.title} をクリアしました`,
        body: "修了証が発行されました。スキルツリーで次のステージが解放されています。",
        payload: { stage_id: stage.id },
      });
    } catch (e) {
      console.error("[stage-auto-complete] クリア通知の記録に失敗 (発行は成立)", e);
    }

    cleared.push({ stage_id: stage.id, stage_title: stage.title });
  }

  if (cleared.length > 0) {
    await recordStagePathEvents(
      db,
      actor.tenantId,
      "cleared",
      cleared.map((row) => ({ userId, stageId: row.stage_id })),
    );
  }
  return cleared;
}

const EMPTY_COUNTS: CompletionCounts = {
  totalLessons: 0,
  completedLessons: 0,
  totalQuizzes: 0,
  passedQuizzes: 0,
  totalAssignments: 0,
  passedAssignments: 0,
};

/**
 * 1 受講者 × 複数ステージの達成数を一定回数のクエリで集計する
 * (`batchComputeCompletions` の転置。あちらは 1 ステージ × 複数受講者)。
 */
async function batchComputeCounts(
  db: Db,
  stageIds: string[],
  userId: string,
): Promise<Map<string, CompletionCounts>> {
  const lessonRows = await selectChunked(stageIds, (slice) =>
    db
      .select({ stageId: sections.stageId, lessonId: lessons.id, type: lessons.type })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .where(inArray(sections.stageId, slice)),
  );
  const quizRows = await selectChunked(stageIds, (slice) =>
    db
      .select({ stageId: sections.stageId, quizId: quizzes.id })
      .from(quizzes)
      .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .where(inArray(sections.stageId, slice)),
  );

  const lessonIds = lessonRows.map((row) => row.lessonId);
  const quizIds = quizRows.map((row) => row.quizId);
  const assignmentLessonIds = lessonRows
    .filter((row) => row.type === "assignment")
    .map((row) => row.lessonId);

  const doneLessonIds = new Set(
    (
      await selectChunked(lessonIds, (slice) =>
        db
          .select({ lessonId: lessonProgress.lessonId })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, userId),
              eq(lessonProgress.completed, true),
              inArray(lessonProgress.lessonId, slice),
            ),
          ),
      )
    ).map((row) => row.lessonId),
  );
  const passedQuizIds = new Set(
    (
      await selectChunked(quizIds, (slice) =>
        db
          .select({ quizId: quizAttempts.quizId })
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.userId, userId),
              eq(quizAttempts.passed, true),
              inArray(quizAttempts.quizId, slice),
            ),
          ),
      )
    ).map((row) => row.quizId),
  );
  const passedAssignmentLessonIds = new Set(
    (
      await selectChunked(assignmentLessonIds, (slice) =>
        db
          .select({ lessonId: submissions.lessonId })
          .from(submissions)
          .where(
            and(
              eq(submissions.studentId, userId),
              eq(submissions.verdict, "pass"),
              inArray(submissions.lessonId, slice),
            ),
          ),
      )
    ).map((row) => row.lessonId),
  );

  const counts = new Map<string, CompletionCounts>();
  const of = (stageId: string): CompletionCounts => {
    const existing = counts.get(stageId);
    if (existing) return existing;
    const fresh = { ...EMPTY_COUNTS };
    counts.set(stageId, fresh);
    return fresh;
  };
  for (const row of lessonRows) {
    const c = of(row.stageId);
    c.totalLessons += 1;
    if (doneLessonIds.has(row.lessonId)) c.completedLessons += 1;
    if (row.type === "assignment") {
      c.totalAssignments += 1;
      if (passedAssignmentLessonIds.has(row.lessonId)) c.passedAssignments += 1;
    }
  }
  for (const row of quizRows) {
    const c = of(row.stageId);
    c.totalQuizzes += 1;
    if (passedQuizIds.has(row.quizId)) c.passedQuizzes += 1;
  }
  return counts;
}

/** 発行時点の判定材料を `criteria_snapshot` に残す (手動発行と同じ StageCompletion 形)。 */
function toCompletionSnapshot(
  stage: typeof stages.$inferSelect,
  counts: CompletionCounts,
  userId: string,
): Record<string, unknown> {
  const snapshot: StageCompletion = {
    user_id: userId,
    stage_id: stage.id,
    stage_title: stage.title,
    total_lessons: counts.totalLessons,
    completed_lessons: counts.completedLessons,
    total_quizzes: counts.totalQuizzes,
    passed_quizzes: counts.passedQuizzes,
    total_assignments: counts.totalAssignments,
    passed_assignments: counts.passedAssignments,
    criteria: {
      require_all_lessons: stage.requireAllLessons,
      require_quiz_pass: stage.requireQuizPass,
      require_assignment_pass: stage.requireAssignmentPass,
      auto_issue_certificate: stage.autoIssueCertificate,
    },
    met: true,
    has_certificate: false,
    cert_code: null,
  };
  return snapshot as unknown as Record<string, unknown>;
}

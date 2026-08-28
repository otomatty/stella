/**
 * 発見教材 (Discovery) の講師レビュー API — staff 限定 (Phase 4)。
 *
 *   GET   /api/cms/discovery                        … つまずきの待ち行列 + 教材一覧
 *   POST  /api/cms/discovery/requests/:id/generate  … 下書きを **この時点で** 生成
 *   PATCH /api/cms/discovery/materials/:id          … 編集 + レビュー結果の確定
 *
 * ## 生成は遅延させる
 *
 * つまずきを検知した瞬間に AI を呼ばない。誰も見ない教材のために課金するうえ、採点
 * (受講者を待たせている処理) に外部 API を挟むことになる。**講師が「下書きを生成」を
 * 押したときに初めて呼ぶ** — AI 添削下書き (`routes/review-draft.ts`) が Editor を
 * 開いた時に遅延生成するのと同じ考え方。
 *
 * ## 鍵が無ければ heuristic に落ちる
 *
 * `ANTHROPIC_API_KEY` が無い / 呼び出しが失敗した / 応答が JSON でない場合は、
 * **そのステージの既存クイズ設問を腕試しと同じサンプリングで 5 問複製** して下書きに
 * する。生成の失敗でレビュー画面が行き止まりになるより、既存設問の詰め合わせを
 * 講師が直す方が前に進む。ただし `generator` に `heuristic` と刻み、画面にも出す —
 * **AI が書いたものと既存教材の複製を混同させない**。
 *
 * ## 承認が唯一の公開スイッチ
 *
 * 生成は必ず `draft`。受講者の応答に出るのは `approved` だけで、その遷移はこの
 * ルートの PATCH でしか起きない (自動承認は無い)。承認できるのは **各設問に正答が
 * 1 つ以上あるとき** だけ — 正答の無い設問は何を選んでも不正解になり、合格ラインに
 * 手が届かない教材を配ることになる。
 *
 * ## 承認済みを直したら承認は外れる
 *
 * 承認は「この中身なら受講者に出してよい」という判断で、**中身が変われば判断ごと
 * 無効になる**。だから承認済み教材の本文 (題名 / 説明 / 設問) を変える PATCH は、
 * 同じ要求で `review_status: "approved"` を送り直さないかぎり `draft` へ落とす。
 *
 * 結果として「承認済みのまま中身だけ差し替わる」経路が無くなり、正答チェック
 * (`hasUsableCorrectOptions`) を通らずに `approved` の行が書き換わることもない —
 * 承認のまま残るのは **明示的に承認を送り、チェックを通った**要求だけ。
 */

import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";

import {
  DISCOVERY_QUESTION_COUNT,
  DISCOVERY_QUESTION_MAX,
  hasUsableCorrectOptions,
  normalizeDiscoveryQuestions,
  type DiscoveryGenerator,
  type DiscoveryQuestion,
  type DiscoveryReviewStatus,
} from "@falcon/shared/discovery/types";
import {
  buildDiscoverySystemPrompt,
  buildDiscoveryUserMessage,
  parseDiscoveryDraftJson,
} from "@falcon/shared/discovery/prompt";
import { selectSkillCheckPaper } from "@falcon/shared/skill-map/skill-check";

import { stages } from "../db/schema.js";
import { completeMessage } from "../lib/anthropic-complete.js";
import { MissingApiKeyError } from "../lib/anthropic.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { ApiError, errorResponse, getCaller, isStaffRole } from "../lib/authz.js";
import {
  insertDiscoveryMaterial,
  listDiscoveryMaterials,
  listDiscoveryRequests,
  loadDiscoveryMaterial,
  loadDiscoveryRequest,
  loadStageQuizQuestionsForCopy,
  updateDiscoveryMaterial,
} from "../lib/discovery-data.js";
import type { DiscoveryMaterialRow } from "../lib/discovery-data.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const cmsDiscoveryRoute = new Hono<{ Bindings: Env }>();

/** staff だけが通る (受講者に下書きを読ませない)。 */
function requireStaff(role: Parameters<typeof isStaffRole>[0]): void {
  if (!isStaffRole(role)) throw new ApiError("権限がありません", 403);
}

/** 画面表示用に、ステージ id → 表示名を引く。 */
async function stageTitles(db: Db, tenantId: string, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: stages.id, title: stages.title })
    .from(stages)
    .where(and(eq(stages.tenantId, tenantId), inArray(stages.id, [...new Set(ids)])));
  return new Map(rows.map((row) => [row.id, row.title]));
}

function materialPayload(row: DiscoveryMaterialRow, stageTitle: string | undefined) {
  return {
    id: row.id,
    stage_id: row.stageId,
    stage_title: stageTitle ?? null,
    title: row.title,
    description: row.description,
    // staff には正答つきで返す (レビューの本体なので伏せる意味が無い)。
    questions: row.questions,
    source: row.source,
    generator: row.generator,
    review_status: row.reviewStatus,
    unlock_condition: row.unlockCondition,
    request_id: row.requestId,
    created_at: row.createdAt.toISOString(),
    reviewed_by: row.reviewedBy,
    reviewed_at: row.reviewedAt?.toISOString() ?? null,
  };
}

cmsDiscoveryRoute.get("/api/cms/discovery", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller.role);

    const requests = await listDiscoveryRequests(db, caller.tenantId);
    const materials = await listDiscoveryMaterials(db, caller.tenantId);
    const titles = await stageTitles(db, caller.tenantId, [
      ...requests.map((r) => r.stageId),
      ...materials.map((m) => m.stageId),
    ]);

    return c.json({
      // 待ち行列は **まだ教材を作っていないもの** を先に見せたいので、生成済みかを
      // 添えてそのまま返す (画面が絞る)。行を落とすと「作ったのに消えた」に見える。
      requests: requests.map((row) => ({
        id: row.id,
        stage_id: row.stageId,
        stage_title: titles.get(row.stageId) ?? null,
        topic: row.topic,
        origin: row.origin,
        created_at: row.createdAt.toISOString(),
        material_count: row.materialCount,
      })),
      materials: materials.map((row) => materialPayload(row, titles.get(row.stageId))),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * そのステージの既存クイズ設問から 5 問を複製した下書き (heuristic フォールバック)。
 *
 * サンプリングは腕試しと同じ決定的な選び方 (`selectSkillCheckPaper`)。種に
 * リクエスト id を使うので、同じリクエストからは何度押しても同じ顔ぶれになる。
 */
async function buildHeuristicQuestions(
  db: Db,
  stageId: string,
  requestId: string,
): Promise<DiscoveryQuestion[]> {
  const pool = await loadStageQuizQuestionsForCopy(db, stageId);
  if (pool.length === 0) return [];
  const picked = new Set(
    selectSkillCheckPaper({
      questionIds: pool.map((q) => q.id),
      userId: requestId,
      stageId,
      attempt: 0,
      limit: DISCOVERY_QUESTION_COUNT,
    }),
  );
  return pool.filter((q) => picked.has(q.id));
}

cmsDiscoveryRoute.post("/api/cms/discovery/requests/:id/generate", async (c) => {
  // AI を叩く口なので、他の生成系と同じレート制限を通す。
  const limited = await enforceAiRateLimit(c);
  if (limited) return limited;

  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller.role);

    const request = await loadDiscoveryRequest(db, caller.tenantId, c.req.param("id"));
    if (!request) throw new ApiError("対象のつまずきが見つかりません", 404);

    const [stage] = await db
      .select({ title: stages.title, canDo: stages.canDo })
      .from(stages)
      .where(and(eq(stages.id, request.stageId), eq(stages.tenantId, caller.tenantId)))
      .limit(1);
    if (!stage) throw new ApiError("対象のステージが見つかりません", 404);

    let generator: DiscoveryGenerator = "heuristic";
    let questions: DiscoveryQuestion[] = [];
    let title = "";
    let description = "";

    if (c.env.ANTHROPIC_API_KEY) {
      try {
        const text = await completeMessage({
          env: c.env,
          system: buildDiscoverySystemPrompt(),
          messages: [
            {
              role: "user" as const,
              content: buildDiscoveryUserMessage({
                stageTitle: stage.title,
                canDo: stage.canDo ?? undefined,
                topic: request.topic,
                origin: request.origin,
              }),
            },
          ],
          signal: c.req.raw.signal,
        });
        const parsed = parseDiscoveryDraftJson(text);
        if (parsed) {
          generator = "anthropic";
          questions = parsed.questions;
          title = parsed.title;
          description = parsed.description;
        }
      } catch (e) {
        // 鍵はあるが呼べなかった (タイムアウト / 障害)。**失敗させずに落とす** —
        // レビュー画面が行き止まりになるより、複製の下書きを直せた方が前に進む。
        if (!(e instanceof MissingApiKeyError)) {
          console.error("[cms-discovery] AI 生成に失敗。heuristic に落とします", e);
        }
      }
    }

    if (questions.length === 0) {
      generator = "heuristic";
      questions = await buildHeuristicQuestions(db, request.stageId, request.id);
      if (questions.length === 0) {
        // 複製元も無い。教材を「作った」ことにはせず、材料が足りないと伝える
        // (空の下書きを置くと、承認できない行がレビュー画面に溜まる)。
        throw new ApiError(
          "このステージには複製できる確認テストの設問がありません。先に小テストを用意してください",
          400,
        );
      }
    }

    const material = await insertDiscoveryMaterial(db, {
      tenantId: caller.tenantId,
      stageId: request.stageId,
      title: title || `${request.topic} の復習`,
      description:
        description ||
        (generator === "heuristic"
          ? "このステージの確認テストから作った復習問題です。内容を確認してください。"
          : "つまずいた文脈から生成した復習問題です。"),
      questions,
      generator,
      requestId: request.id,
    });

    await recordAudit(db, caller, {
      action: "discovery_generate",
      targetType: "discovery_material",
      targetId: material.id,
      ip: clientIp(c),
      metadata: {
        request_id: request.id,
        stage_id: request.stageId,
        generator,
        question_count: questions.length,
      },
    });

    return c.json({ material: materialPayload(material, stage.title) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

const REVIEW_STATUSES: DiscoveryReviewStatus[] = ["draft", "approved", "rejected"];

/** 設問配列が実質同じか (id / 文言 / 正答フラグまで見る)。 */
function sameQuestions(a: DiscoveryQuestion[], b: DiscoveryQuestion[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

cmsDiscoveryRoute.patch("/api/cms/discovery/materials/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireStaff(caller.role);

    const id = c.req.param("id");
    const before = await loadDiscoveryMaterial(db, caller.tenantId, id);
    if (!before) throw new ApiError("対象の教材が見つかりません", 404);

    type Body = {
      title?: unknown;
      description?: unknown;
      questions?: unknown;
      review_status?: unknown;
    };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);

    const patch: Parameters<typeof updateDiscoveryMaterial>[3] = {};
    // 送られた値が **今の値と違うときだけ** patch に載せる。同じ値の再保存で承認が
    // 外れる (下の「本文を変えたら draft へ」) のは操作として理不尽なので、
    // 「変更したか」は文字列の差で決める。
    if (typeof body.title === "string") {
      const title = body.title.trim().slice(0, 120);
      if (!title) throw new ApiError("タイトルを入力してください", 400);
      if (title !== before.title) patch.title = title;
    }
    if (typeof body.description === "string") {
      const description = body.description.trim().slice(0, 300);
      if (description !== before.description) patch.description = description;
    }
    if (body.questions !== undefined) {
      const questions = normalizeDiscoveryQuestions(body.questions);
      // 上限は正規化した後で見る (壊れた設問を大量に混ぜて弾かれるのは分かりにくい)。
      if (questions.length > DISCOVERY_QUESTION_MAX) {
        throw new ApiError(`設問は ${DISCOVERY_QUESTION_MAX} 問までです`, 400);
      }
      if (!sameQuestions(questions, before.questions)) patch.questions = questions;
    }

    /** 本文 (題名 / 説明 / 設問) が変わるか。承認済みならこれで承認が外れる。 */
    const contentChanged =
      patch.title !== undefined || patch.description !== undefined || patch.questions !== undefined;

    let status: DiscoveryReviewStatus | undefined;
    if (body.review_status !== undefined) {
      if (
        typeof body.review_status !== "string" ||
        !REVIEW_STATUSES.includes(body.review_status as DiscoveryReviewStatus)
      ) {
        throw new ApiError("review_status が不正です", 400);
      }
      status = body.review_status as DiscoveryReviewStatus;
    }

    /**
     * 承認済みの本文を、承認を送り直さずに変えた → **承認を外す**。
     *
     * 承認は中身に対する判断なので、中身が変われば判断も無効になる。ここで落として
     * おかないと「誰も読んでいない設問が公開のまま差し替わる」経路ができる。
     */
    const approvalRevoked = contentChanged && before.reviewStatus === "approved" && !status;
    if (approvalRevoked) status = "draft";

    if (status) {
      patch.reviewStatus = status;
      // 判断した人を残す。差し戻し (rejected) も「誰が読んだか」が要るので記録する。
      // 下書きへ戻したときは印を落とす — レビュー前の状態に戻す操作なので。
      if (status === "draft") {
        patch.reviewedBy = null;
        patch.reviewedAt = null;
      } else {
        patch.reviewedBy = caller.id;
        patch.reviewedAt = new Date();
      }
    }

    // **承認の条件は「この保存を反映した後の設問」で見る。** 保存前の設問で判定すると、
    // 壊れた設問を送りながら同じ PATCH で承認まで通せてしまう。
    const finalQuestions = patch.questions ?? before.questions;
    if (status === "approved") {
      if (!hasUsableCorrectOptions(finalQuestions)) {
        throw new ApiError("承認できません。すべての設問に正答を 1 つ以上設定してください", 400);
      }
      // **承認は、いま検証した設問そのものを書く。** 設問を送らない承認だと、読んだ
      // あとに他の staff が差し替えた設問がそのまま承認されうる (検証したのは手元の
      // 古い設問なので、誰も読んでいない設問が公開される)。書く内容と検証した内容を
      // 一致させておけば、その経路が消える。
      patch.questions = finalQuestions;
    }

    if (Object.keys(patch).length === 0) {
      return c.json({ material: materialPayload(before, undefined), approval_revoked: false });
    }

    // 読んだときの状態を更新条件に入れる。承認の途中で他の staff が中身を差し替えて
    // いたら (= 承認が draft へ落ちていたら) 0 件更新になり、ここで止まる。
    const after = await updateDiscoveryMaterial(
      db,
      caller.tenantId,
      id,
      patch,
      before.reviewStatus,
    );
    if (!after) {
      throw new ApiError("この教材は他の操作で更新されています。読み直してください", 409);
    }

    // 内容の編集も残す。承認 (公開) の記録だけでは 「いつ中身が変わったか」 が読めず、
    // 「承認したものと違うものが出ていないか」 を後から追えない。
    if (contentChanged) {
      await recordAudit(db, caller, {
        action: "discovery_material_edit",
        targetType: "discovery_material",
        targetId: after.id,
        ip: clientIp(c),
        metadata: {
          stage_id: after.stageId,
          fields: [
            ...(patch.title !== undefined ? ["title"] : []),
            ...(patch.description !== undefined ? ["description"] : []),
            ...(patch.questions !== undefined ? ["questions"] : []),
          ],
          question_count: finalQuestions.length,
          approval_revoked: approvalRevoked,
        },
      });
    }

    if (status && status !== before.reviewStatus) {
      await recordAudit(db, caller, {
        action: "discovery_review",
        targetType: "discovery_material",
        targetId: after.id,
        ip: clientIp(c),
        metadata: {
          stage_id: after.stageId,
          from: before.reviewStatus,
          to: status,
          generator: after.generator,
          // 講師が押した「却下 / 承認」ではなく、本文の編集で外れた承認かを区別する。
          ...(approvalRevoked ? { reason: "content_edited" } : {}),
        },
      });
    }

    const titles = await stageTitles(db, caller.tenantId, [after.stageId]);
    return c.json({
      material: materialPayload(after, titles.get(after.stageId)),
      /** 本文の編集で承認が外れたか (画面が「再承認が要る」と伝える)。 */
      approval_revoked: approvalRevoked,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

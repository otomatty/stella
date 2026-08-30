/**
 * 発見教材 (Discovery) の受験 API — 受講者向け (Phase 4)。
 *
 *   GET  /api/discovery/:id … 受験票 (設問と選択肢のみ。正答は返さない)
 *   POST /api/discovery/:id … 採点 (得点と合否だけを返す)
 *
 * 発見教材は「つまずいた文脈から AI が作り、講師が承認した補強演習」で、教材そのものは
 * **全ユーザー共有**。誰に見せるかは行を複製して割り当てるのではなく、**読むたびに
 * 源流ステージの状態で判定する**。
 *
 * ## 秘匿として守ること
 *
 * - **公開条件を一覧と受験で同じにする。** 見せる条件は `isDiscoveryVisible`
 *   (源流ステージが `active` / `cleared`) の 1 か所だけで、`/api/skill-map/mine` の
 *   一覧もここも同じ関数を通る。片方だけ緩むと「一覧に出ないのに URL 直打ちで
 *   受けられる」穴になる
 * - **未承認 (draft / rejected) の教材は存在ごと出さない。** 講師が読む前の AI 出力を
 *   受講者に見せないための線なので、404 ではなく他と同じ 400 に丸める
 * - **断り文言はフォーカス切り替え / 腕試しと同じ汎用文言** (`UNSELECTABLE_STAGE_MESSAGE`)。
 *   「そんな教材は無い」と「あなたには見せられない」を書き分けると、応答の違いから
 *   まだ見えていないステージに教材があること自体が読める
 * - **正答・解説を応答に載せない** (受験票にも採点結果にも)。何度でも受けられるので、
 *   返すと解答集が作れてしまう。個別の正誤も返さない (腕試しと同じ判断)
 *
 * ## 受験回数の上限は持たない
 *
 * 腕試しと違い、発見教材の合格は星を開かない (飛び級にならない)。総当たりで得られる
 * のは 30 XP だけなので、回数を絞るより解き直せる方が学習に資する。XP も教材ごとに
 * 1 回ぶんしか入らない (`countDistinct(material_id)`)。
 */

import { Hono } from "hono";

import {
  DISCOVERY_PASS_SCORE,
  gradeDiscovery,
  isDiscoveryVisible,
  toDiscoveryPaper,
  type DiscoveryAnswer,
} from "@falcon/shared/discovery/types";

import { ApiError, errorResponse, getCaller, requireCanTakeSkillCheck } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import {
  insertDiscoveryAttempt,
  loadDiscoveryHistory,
  loadDiscoveryMaterial,
} from "../lib/discovery-data.js";
import type { DiscoveryMaterialRow } from "../lib/discovery-data.js";
import {
  loadSkillMapSource,
  wantsDevReveal,
  type SkillMapLoadOptions,
} from "../lib/skill-map-data.js";
import { UNSELECTABLE_STAGE_MESSAGE, evaluateSkillMapFor } from "./skill-map.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const discoveryRoute = new Hono<{ Bindings: Env }>();

/**
 * 受けられる教材かを確かめて 1 件返す。
 *
 * GET と POST の両方がここを通る — 片方だけ緩むと、出題は断るのに採点は通る
 * (= 直接 POST すれば受験できる) 穴になる (`routes/skill-check.ts` と同じ流儀)。
 */
async function resolveMaterial(
  db: Db,
  caller: Caller,
  id: string,
  opts: SkillMapLoadOptions,
): Promise<DiscoveryMaterialRow> {
  // ロールのゲートも 1 か所に寄せる。顔ぶれは腕試しと同じ (受講者 + 管理者)。
  requireCanTakeSkillCheck(caller);
  const material = await loadDiscoveryMaterial(db, caller.tenantId, id);
  // 存在しない / 他テナント / 未承認 を **同じ 400** に丸める。
  if (material?.reviewStatus !== "approved") {
    throw new ApiError(UNSELECTABLE_STAGE_MESSAGE, 400);
  }
  const source = await loadSkillMapSource(db, caller, opts);
  const result = evaluateSkillMapFor(source);
  if (!isDiscoveryVisible(result.states.get(material.stageId))) {
    throw new ApiError(UNSELECTABLE_STAGE_MESSAGE, 400);
  }
  return material;
}

discoveryRoute.get("/api/discovery/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const material = await resolveMaterial(db, caller, c.req.param("id"), {
      showAllIslands: wantsDevReveal(c),
    });
    const history = await loadDiscoveryHistory(db, caller, material.id);

    return c.json({
      discovery: {
        id: material.id,
        stage_id: material.stageId,
        title: material.title,
        description: material.description,
        // 出自は隠さない。「AI が作った教材である」ことは受講者にも伝える
        // (heuristic 生成なら既存設問の複製である、という違いも含めて)。
        source: material.source,
        generator: material.generator,
        pass_score: DISCOVERY_PASS_SCORE,
        questions: toDiscoveryPaper(material.questions),
        history: {
          attempt_count: history.attemptCount,
          passed: history.passed,
          last_score: history.lastScore,
          last_max_score: history.lastMaxScore,
          last_attempt_at: history.lastAttemptAt?.toISOString() ?? null,
        },
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

discoveryRoute.post("/api/discovery/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const material = await resolveMaterial(db, caller, c.req.param("id"), {
      showAllIslands: wantsDevReveal(c),
    });

    type Body = { answers?: unknown };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);
    const raw = Array.isArray(body.answers) ? body.answers : [];
    const answers: DiscoveryAnswer[] = raw.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const row = entry as { question_id?: unknown; selected_option_ids?: unknown };
      if (typeof row.question_id !== "string") return [];
      const ids = Array.isArray(row.selected_option_ids) ? row.selected_option_ids : [];
      return [
        {
          question_id: row.question_id,
          selected_option_ids: ids.filter((v): v is string => typeof v === "string"),
        },
      ];
    });

    // **採点の土俵はサーバが持つ設問。** 送られてきた設問 id は突き合わせにしか
    // 使わない (易しい 1 問だけ送って満点、を作らない)。
    const grade = gradeDiscovery(material.questions, answers);

    // 記録は best-effort ではない (XP の材料なので) が、失敗しても採点結果は返す —
    // 学習者から見れば「解いて答え合わせができた」ことが本体で、記録の失敗で
    // 画面をエラーにしても解き直す以外にできることが無い。
    let recorded = true;
    try {
      await insertDiscoveryAttempt(db, caller, {
        materialId: material.id,
        score: grade.score,
        maxScore: grade.maxScore,
        percent: grade.percent,
        passed: grade.passed,
      });
    } catch (e) {
      console.error("[discovery] 受験の記録に失敗", e);
      recorded = false;
    }

    return c.json({
      result: {
        id: material.id,
        title: material.title,
        score: grade.score,
        max_score: grade.maxScore,
        percent: grade.percent,
        pass_score: DISCOVERY_PASS_SCORE,
        passed: grade.passed,
        ...(recorded
          ? {}
          : { record_error: "採点はできましたが記録に失敗しました。もう一度挑戦してください" }),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

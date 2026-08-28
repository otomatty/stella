/**
 * ステージの自己開始 (Phase 3b)。
 *
 *   POST /api/stages/:id/start … 解放済みの星を「自分で始める」
 *
 * ## 何が変わったか
 *
 * Phase 3a まで、受講登録を作れるのは staff の割当 (`POST /api/enrollments` / `/bulk` /
 * プリセット適用) と、腕試しの飛び級だけだった。Phase 3b でその割当を退役させ、
 * **開始位置は視界とロックが決め、開始の意思は受講者が示す** 自律モデルへ移す。
 * このルートがその入口で、退役した割当 API の置き換えにあたる。
 *
 * ## 開始してよい星の範囲は「評価器が決める」
 *
 * 受け取った id で登録を作る前に、必ず評価器 (`@falcon/shared/skill-map`) を 1 度回す。
 * 通すのは **`unlocked` (未着手だが前提を満たした星) と `active` (既に登録のある星の
 * 再開 — 期限切れならここで受講中へ戻す)** だけ:
 *
 *   - `cleared` … 400。もう点いている星を「始める」意味が無く、通しても
 *     `PUT /api/skill-map/active-stage` がクリア済みを弾くので行き止まりになる
 *   - `locked`  … 400。**前提の名前は返してよい** — その星は既に見えていて (`name-only`
 *     以上)、同じ解放条件をスキルマップの `lock_reasons` が返している。ただし霧の中に
 *     ある前提だけは伏せる (`maskedLockReasons`)
 *   - `fog` / 存在しない / 他テナント … `UNSELECTABLE_STAGE_MESSAGE` の 400。
 *     フォーカス切り替え・腕試しと **同じ汎用文言**。書き分けると、3 つの API の応答を
 *     突き合わせて霧の向こうの星の有無が読めてしまう
 *
 * ロールは腕試しと同じ (`SKILL_CHECK_ROLES`)。講師・営業は 403。
 *
 * ## 冪等
 *
 * 2 度目の「始める」は既存の登録をそのまま返す (`created: false`)。連打や 2 タブで
 * 期限 / 必須が既定値へ戻らないよう、書き込みは `startSelfEnrollment()` に任せる。
 * `stage_path_events(started)` も同じ関数の中で 1 度だけ積まれる。
 * 期限切れの登録だけは受講中へ戻し (`reactivated: true`)、学び直しの入口を塞がない。
 */

import { Hono } from "hono";

import { ApiError, errorResponse, getCaller, requireCanStartStage } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { startSelfEnrollment } from "../lib/enrollment-write.js";
import { loadSkillMapSource } from "../lib/skill-map-data.js";
import { UNSELECTABLE_STAGE_MESSAGE, evaluateSkillMapFor, maskedLockReasons } from "./skill-map.js";
import type { Env } from "../env.js";

export const stageStartRoute = new Hono<{ Bindings: Env }>();

/** クリア済みの星を断る文言 (本人が終わらせた星なので、そのまま理由を返してよい)。 */
const ALREADY_CLEARED_MESSAGE = "クリア済みのステージです";

stageStartRoute.post("/api/stages/:id/start", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanStartStage(caller);
    const stageId = c.req.param("id");

    const source = await loadSkillMapSource(db, caller);
    const stage = source.stages.find((row) => row.id === stageId);
    // 存在しない星・他テナントの星・未公開の星をまとめて汎用文言へ丸める。
    if (!stage) throw new ApiError(UNSELECTABLE_STAGE_MESSAGE, 400);

    const result = evaluateSkillMapFor(source);
    // 霧の星も同じ文言。ここだけ「霧だから駄目」と書くと霧の存在が漏れる。
    if ((result.visibility.get(stageId) ?? "fog") === "fog") {
      throw new ApiError(UNSELECTABLE_STAGE_MESSAGE, 400);
    }

    const state = result.states.get(stageId) ?? "locked";
    if (state === "cleared") throw new ApiError(ALREADY_CLEARED_MESSAGE, 400);
    if (state === "locked") {
      const reasons = maskedLockReasons(source, result, stageId);
      throw new ApiError(
        reasons.length > 0
          ? `${reasons.join(" / ")} をクリアすると始められます`
          : "前提のステージをクリアすると始められます",
        400,
      );
    }

    const { row, created, reactivated } = await startSelfEnrollment(db, caller, stageId);
    if (!row) {
      // 既存行に弾かれた直後に登録が消えた、のような競合。登録を返せない以上
      // 「始まった」と言えないので、握り潰さず 500 にする。
      throw new ApiError("受講登録を作成できませんでした", 500);
    }

    // 誰がいつどの星を始めたかは運用の記録として残す (割当が無くなったぶん、
    // 「この星に人が入った」を追える場所がここだけになる)。**登録が動いたときだけ**
    // 記録する — 連打や再訪のたびに積むと、監査ログが「開いた画面の回数」で埋まり、
    // 「いつ始めたか」を読むための行が探せなくなる。
    if (created || reactivated) {
      await recordAudit(db, caller, {
        action: "stage_self_start",
        targetType: "enrollment",
        targetId: row.id,
        ip: clientIp(c),
        metadata: { stage_id: stageId, state, created, reactivated },
      });
    }

    return c.json({ enrollment: row, created, reactivated, state });
  } catch (err) {
    return errorResponse(c, err);
  }
});

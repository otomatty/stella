/**
 * 腕試し (SkillCheck) — ステージ 1 つぶんのテスト (Phase 3a)。
 *
 *   GET  /api/skill-check/:stageId … 受験できるか + 出題 (正答は返さない)
 *   POST /api/skill-check/:stageId … 採点。ロック星で合格したら飛び級で解放
 *
 * 用途は 2 つ:
 *   1. レベル測定 … 開放済み / クリア済みの星で「まだできるか」を測る
 *   2. 飛び級     … ロック星で合格すると、その星だけが即 `unlocked` になる
 *
 * ## 受けられる星の範囲
 *
 * **視界が `full` の星だけ** (`isSelectableVisibility`)。それより先は 400 で、しかも
 * フォーカス切り替えと **同じ汎用文言** (`UNSELECTABLE_STAGE_MESSAGE`) を返す —
 * 「霧の中だから駄目」と書き分けると、応答の違いから霧の向こうに星があること自体が
 * 読めてしまう。ロック星でも解放条件まで見えていれば受けられる (そこが飛び級の入口) —
 * 逆に言うと、飛び級で飛べるのは **1 歩先まで**。名前がぼやけている星 (2 歩先) の設問を
 * 出すのは、視界の段が「まだ中身を語らない」と決めたことと矛盾する。
 *
 * 受けられるロールは `SKILL_CHECK_ROLES` (受講者 / 管理者)。講師・営業は 403。
 *
 * ## 受講登録ゲートの「意図した例外」
 *
 * このルートは **受講登録を要求しない**。他の学習系 API (フォーカス切り替え・レッスン
 * 進捗) が一様に登録を求めるなかで、ここだけが例外になっている。意図的な設計であって
 * 抜け落ちではない:
 *
 *   - 飛び級は「まだ割り当てられていない星を開ける」ための仕組みで、ここで登録を
 *     求めると入口が閉じる (登録済みの星しか飛び級できない = 飛び級が要らない)
 *   - 割当を前提にしない世界 (Phase 3b の自己開始) の入口を、先にここへ置いている。
 *     合格すると自己登録まで作るので、「開いたのに始められない」も起きない
 *
 * 引き換えに、**受講登録が守っていた「見せてよい設問の範囲」もここでは緩む** —
 * 登録の無いステージの設問文が最大 10 問ぶん読める。これは次の 2 つで受け止める:
 *
 *   - 視界 (`full` の星しか受験できない) が範囲を「もう解放条件まで見えている星」に限る
 *   - **受験回数の上限 (1 日 3 回)** が列挙の速度を潰す。プールが小さいステージでは
 *     出題が回転しない (`@falcon/shared/skill-map/skill-check` の JSDoc) ので、
 *     無制限に受けられると全設問の列挙も正答の総当たりも成立してしまう。
 *     上限判定は記録の INSERT に畳んであり、並列に投げても 1 本しか通らない
 *
 * ## 秘匿として守ること
 *
 * - **正答・解説を応答に載せない** (出題も採点結果も)。ロック星の腕試しは日を跨げば
 *   繰り返し受けられるので、正答を返すと解答集を作れてしまう
 * - 設問そのものがステージの内容をどこまで明かすかは教材次第で、ここでは制御しない。
 *   「知っているなら飛ばしてよい」がテストアウトの本質なので、問題文を伏せる意味がない
 * - 霧より先の星の存在を漏らさない (上記の汎用文言)
 *
 * ## 出題
 *
 * ステージ内の **既存クイズ設問** から最大 10 問。選び方は乱数ではなく
 * (利用者 × ステージ × 受験回数) から決まる (`@falcon/shared/skill-map/skill-check`)
 * ので、出題 (GET) と採点 (POST) で保存なしに同じ受験票を再現できる。
 * 設問が 5 問に満たないステージは腕試し非対応として `supported: false` を返す。
 */

import { Hono } from "hono";

import { isSelectableVisibility } from "@falcon/shared/skill-map/evaluate";
import type { SkillMapState, SkillMapVisibility } from "@falcon/shared/skill-map/evaluate";
import {
  SKILL_CHECK_DAILY_LIMIT,
  SKILL_CHECK_MAX_QUESTIONS,
  SKILL_CHECK_MIN_QUESTIONS,
  SKILL_CHECK_PASS_SCORE,
  selectSkillCheckPaper,
  skillCheckPassed,
  skillCheckPercent,
} from "@falcon/shared/skill-map/skill-check";

import { ApiError, errorResponse, getCaller, requireCanTakeSkillCheck } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { startSelfEnrollment } from "../lib/enrollment-write.js";
import { isExactSelection } from "../lib/quiz-grading.js";
import {
  insertSkillCheckAttempt,
  loadCorrectOptionIds,
  loadSkillCheckAttemptCount,
  loadSkillCheckHistory,
  loadSkillCheckQuestions,
  loadStageQuestionIds,
  upsertStageUnlock,
} from "../lib/skill-check-data.js";
import type { SkillCheckQuestion } from "../lib/skill-check-data.js";
import {
  loadSkillMapSource,
  wantsDevReveal,
  type SkillMapLoadOptions,
} from "../lib/skill-map-data.js";
import { UNSELECTABLE_STAGE_MESSAGE, evaluateSkillMapFor } from "./skill-map.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const skillCheckRoute = new Hono<{ Bindings: Env }>();

/** 設問が足りず腕試しを組めないステージの理由コード (画面はこれで文言を選ぶ)。 */
const NOT_ENOUGH_QUESTIONS = "not_enough_questions";

interface StageContext {
  stageId: string;
  title: string;
  canDo: string | undefined;
  state: SkillMapState;
  visibility: SkillMapVisibility;
  /** 出題候補 (そのステージの全クイズ設問 id)。 */
  pool: string[];
}

/**
 * 受験できる星かを確かめ、出題プールまで揃える。
 *
 * GET と POST で同じ判定を通すためにここへ寄せる — 片方だけ緩むと、出題は断るのに
 * 採点は通る (= 直接 POST すれば飛び級できる) といった穴になる。
 */
async function resolveStage(
  db: Db,
  caller: Caller,
  stageId: string,
  opts: SkillMapLoadOptions,
): Promise<StageContext> {
  // ロールのゲートも 1 か所に寄せる (出題だけ通って採点が 403、の食い違いを作らない)。
  requireCanTakeSkillCheck(caller);
  const source = await loadSkillMapSource(db, caller, opts);
  const stage = source.stages.find((row) => row.id === stageId);
  // 存在しない星と、霧より先の星と、他テナントの星を **同じ 400** に丸める。
  if (!stage) throw new ApiError(UNSELECTABLE_STAGE_MESSAGE, 400);

  const result = evaluateSkillMapFor(source);
  const visibility = result.visibility.get(stageId) ?? "hidden";
  if (!isSelectableVisibility(visibility)) throw new ApiError(UNSELECTABLE_STAGE_MESSAGE, 400);

  return {
    stageId,
    title: stage.title,
    canDo: stage.canDo,
    state: result.states.get(stageId) ?? "locked",
    visibility,
    pool: await loadStageQuestionIds(db, stageId),
  };
}

/** 「非対応」の応答 (出題も採点もできないステージ)。GET / POST で同じ形を返す。 */
function unsupportedPayload(ctx: StageContext) {
  return {
    stage_id: ctx.stageId,
    title: ctx.title,
    state: ctx.state,
    visibility: ctx.visibility,
    supported: false,
    unsupported_reason: NOT_ENOUGH_QUESTIONS,
    // 「あと何問で組めるか」ではなく最低ラインだけ返す (教材の設問数は運用情報)。
    min_questions: SKILL_CHECK_MIN_QUESTIONS,
  };
}

/** 今回ぶんの受験票 (出題する設問 id)。`attempt` は「これまでの受験回数」。 */
function paperFor(ctx: StageContext, caller: Caller, attempt: number): string[] {
  return selectSkillCheckPaper({
    questionIds: ctx.pool,
    userId: caller.id,
    stageId: ctx.stageId,
    attempt,
    limit: SKILL_CHECK_MAX_QUESTIONS,
  });
}

skillCheckRoute.get("/api/skill-check/:stageId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const ctx = await resolveStage(db, caller, c.req.param("stageId"), {
      showAllIslands: wantsDevReveal(c),
    });

    if (ctx.pool.length < SKILL_CHECK_MIN_QUESTIONS) {
      return c.json({ skill_check: unsupportedPayload(ctx) });
    }

    const history = await loadSkillCheckHistory(db, caller, ctx.stageId);
    const questions = await loadSkillCheckQuestions(
      db,
      paperFor(ctx, caller, history.attemptCount),
    );

    return c.json({
      skill_check: {
        stage_id: ctx.stageId,
        title: ctx.title,
        state: ctx.state,
        visibility: ctx.visibility,
        supported: true,
        pass_score: SKILL_CHECK_PASS_SCORE,
        // ロック星の腕試し = 飛び級。合格したらその星が開くことを画面に伝える。
        test_out: ctx.state === "locked",
        questions: questions satisfies SkillCheckQuestion[],
        // この受験票がどの回のものか。提出時に送り返してもらい、**見た問題で採点する**
        // (別タブで先に 1 回提出されていると、取り直した受験票は別の問題になる)。
        attempt: history.attemptCount,
        // 1 日の上限は「押したら 429 だった」で知らせるのではなく、受ける前に見せる。
        daily_limit: SKILL_CHECK_DAILY_LIMIT,
        attempts_today: history.attemptsToday,
        remaining_today: Math.max(SKILL_CHECK_DAILY_LIMIT - history.attemptsToday, 0),
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

skillCheckRoute.post("/api/skill-check/:stageId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const ctx = await resolveStage(db, caller, c.req.param("stageId"), {
      showAllIslands: wantsDevReveal(c),
    });

    if (ctx.pool.length < SKILL_CHECK_MIN_QUESTIONS) {
      // GET で `supported: false` と伝えてある状態への POST。飛び級の抜け道に
      // ならないよう、採点せず断る (満点 0 = 不合格なので通しても開かないが、
      // 「受けた」履歴を残す意味も無い)。
      throw new ApiError("このステージの腕試しはまだ用意できていません", 400);
    }

    type Body = { answers?: unknown; attempt?: unknown };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);
    const raw = Array.isArray(body.answers) ? body.answers : [];
    const selectedByQuestion = new Map<string, Set<string>>();
    for (const entry of raw) {
      if (typeof entry !== "object" || entry === null) continue;
      const row = entry as { question_id?: unknown; selected_option_ids?: unknown };
      if (typeof row.question_id !== "string") continue;
      const ids = Array.isArray(row.selected_option_ids) ? row.selected_option_ids : [];
      selectedByQuestion.set(
        row.question_id,
        new Set(ids.filter((v): v is string => typeof v === "string")),
      );
    }

    // **受験票はサーバが決め直す。** 送られてきた設問 id を信じると、易しい 1 問だけを
    // 送って満点合格できてしまう。決め直す材料は「何回目の受験票か」だけ。
    //
    // その回数は **画面が受け取った版** (`attempt`) を使う。ここで数え直すと、別タブで
    // 先に 1 回提出されていたときに *次の回の受験票* で採点してしまい、受講者が見た
    // ことのない設問に対する不正解が記録され、受験回数だけが減る。版を送ってもらえば、
    // 古い受験票は下の比較交換で `stale_paper` になり、採点も記録もされない。
    // 版が無いときだけ数え直す (この API を直接叩く古い画面のための保険)。
    const claimed = typeof body.attempt === "number" ? body.attempt : null;
    const attempt =
      claimed !== null && Number.isInteger(claimed) && claimed >= 0
        ? claimed
        : await loadSkillCheckAttemptCount(db, caller, ctx.stageId);
    const paper = paperFor(ctx, caller, attempt);
    const questions = await loadSkillCheckQuestions(db, paper);
    const correctByQuestion = await loadCorrectOptionIds(db, paper);

    let score = 0;
    let maxScore = 0;
    for (const q of questions) {
      maxScore += q.points;
      const correct = correctByQuestion.get(q.id) ?? new Set<string>();
      const selected = selectedByQuestion.get(q.id) ?? new Set<string>();
      // 採点規則は小テストと同じ (正解集合と選択集合の完全一致)。
      if (correct.size > 0 && isExactSelection(correct, selected)) score += q.points;
    }
    const passed = skillCheckPassed(score, maxScore);

    // **記録が先、解放が後** (`routes/quiz.ts` と同じ順序)。記録の INSERT が受験回数の
    // 上限そのものなので、これを通す前に星を開けると「上限を超えた受験での飛び級」が
    // 通ってしまう。代わりに、後段 (解放) が失敗したときに `unlocked: true` を返さない
    // ことで安全側に倒す (下)。
    const outcome = await insertSkillCheckAttempt(db, caller, {
      stageId: ctx.stageId,
      expectedAttempt: attempt,
      score,
      maxScore,
      passed,
      questionIds: paper,
      answers: raw,
    });
    if (outcome === "daily_limit") {
      throw new ApiError("本日の受験回数の上限に達しました。明日また挑戦できます", 429);
    }
    if (outcome === "stale_paper") {
      // 同じ受験票からの 2 通目 (別タブ / 並列 POST)。採点は捨てる — 通すと 1 回の
      // 受験回数で 2 通ぶんの答え合わせができてしまう。
      throw new ApiError("受験の記録が入れ替わりました。開き直すと新しい問題で受けられます", 429);
    }

    // 飛び級: ロック星で合格したときだけ星を開く。開放済み / クリア済みの星で
    // 合格しても書かない (既に開いている行を作っても意味が無い)。
    let unlocked = passed && ctx.state === "locked";
    /** 解放の記録に失敗したときだけ入る、再挑戦を促す文言。 */
    let unlockError: string | undefined;
    if (unlocked) {
      try {
        await upsertStageUnlock(db, caller, ctx.stageId);
      } catch (e) {
        // 受験は記録済み (回数を 1 つ使った) が星は開いていない。**開いたと言わない。**
        // 画面が「解放された」と出したあとスキルマップに現れないと、どちらが本当か
        // 分からなくなる。合格の表示は残しつつ、もう一度受けるよう促す。
        console.error("[skill-check] 飛び級の記録に失敗", e);
        unlocked = false;
        unlockError = "合格しましたが解放を記録できませんでした。もう一度挑戦してください";
      }
    }
    if (unlocked) {
      // 開いた星に着手できるよう、自己開始の受講登録も置く (M4)。失敗しても解放は
      // 取り消さない — 星は既に開いていて、登録が無くても腕試しと閲覧はできる。
      // 通るのは自己開始 API (`POST /api/stages/:id/start`) と同じ関数 — 「合格した星を
      // すぐ始める」も「解放済みの星を始める」も、登録の作られ方は 1 通りに保つ。
      try {
        const self = await startSelfEnrollment(db, caller, ctx.stageId);
        // 監査も自己開始 API と揃える。ここを記録しないと、飛び級で入った受講者だけが
        // 「いつこの星に入ったか」を追えない (割当の記録がもう無いため)。
        // どちらの入口から入ったかは `via` で見分ける。
        if (self.row && (self.created || self.reactivated)) {
          await recordAudit(db, caller, {
            action: "stage_self_start",
            targetType: "enrollment",
            targetId: self.row.id,
            ip: clientIp(c),
            metadata: {
              stage_id: ctx.stageId,
              state: ctx.state,
              created: self.created,
              reactivated: self.reactivated,
              via: "skill_check",
            },
          });
        }
      } catch (e) {
        console.error("[skill-check] 飛び級ステージの自己登録に失敗", e);
      }
    }

    return c.json({
      result: {
        stage_id: ctx.stageId,
        title: ctx.title,
        score,
        max_score: maxScore,
        percent: skillCheckPercent(score, maxScore),
        pass_score: SKILL_CHECK_PASS_SCORE,
        passed,
        /** 飛び級で新しく開いた星か。画面の「新しいスキルが解放されました」の条件。 */
        unlocked,
        ...(unlockError ? { unlock_error: unlockError } : {}),
        // 到達説明は合格したときだけ返す。ロック星の到達説明は本来伏せる情報だが、
        // 合格した時点でその星は `unlocked` になり、次の `/api/skill-map/mine` でも
        // 見える (先に見せているのではなく、同じ瞬間に開いている)。
        // **解放を記録できなかったときは出さない** — その星はまだ locked のままで、
        // 「同じ瞬間に開いている」という前提が崩れるため。
        ...(passed && ctx.canDo && (unlocked || ctx.state !== "locked")
          ? { can_do: ctx.canDo }
          : {}),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

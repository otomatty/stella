/**
 * 殿堂 (Hall of Fame) の公開読み出しと、本人の記入・辞退 API (Phase 5)。
 *
 *   GET  /api/hall-of-fame             … 公開中の掲載 (全ロール)
 *   GET  /api/hall-of-fame/mine        … 自分の招待 / 下書き / 掲載
 *   PUT  /api/hall-of-fame/mine        … 下書き保存と掲載の申請 (本人だけ)
 *   POST /api/hall-of-fame/mine/decline  … 辞退 (公開前)
 *   POST /api/hall-of-fame/mine/withdraw … 取り下げ (公開後)
 *   GET  /api/hall-of-fame/:id         … 公開中の掲載の全文 (全ロール)
 *
 * ## 本人の同意なく公開になる経路を作らない
 *
 * このルートには **公開 (`published`) へ進める操作が無い**。公開は管理者側
 * (`routes/cms-hall-of-fame.ts`) にしかなく、その管理者側も `submitted` — つまり
 * 本人が自分で書いて「この内容で掲載を申請」を押した行 — からしか公開できない。
 * 書き込みは常に `PUT /api/hall-of-fame/mine` = 呼び出した本人の行に限られるので、
 * 他人の物語を代筆して申請することもできない。
 *
 * ## 公開されていない掲載は存在ごと 404
 *
 * 推薦されただけの人・辞退した人・取り下げた人の行は、id を直接叩いても 404。
 * 「その id は存在するが見せられない」と 403 で書き分けると、応答の違いから
 * 「誰が推薦されているか」「誰が辞退したか」が読めてしまう。
 *
 * ## 数値を載せない
 *
 * 応答に XP・レベル・クリア数は入らない (公開一覧の件数と、歩んだ道のステージ名だけ)。
 * 殿堂は順位表ではないので、並べ替えられる数値をそもそも配らない。
 *
 * ## 「歩んだ道」に霧は掛けない (受容した設計判断)
 *
 * 掲載された道は **閲覧者の視界と無関係に**、公開ステージのタイトルをそのまま返す。
 * 学びの地図の霧は「自分の道から目移りしないため」の仕掛けであって教材名の秘匿では
 * なく、殿堂に出るのは管理者が 1 件ずつ公開を判断した「先を歩いた人の物語」。その先が
 * 垣間見えることはゴール勾配として設計の意図どおりなので、閲覧者ごとに道を伏せる処理は
 * 入れない (入れると同じ掲載が読む人によって別の物語になり、本人が同意した「掲載される
 * 内容」が確定しなくなる)。**未公開ステージ**が混ざらないことだけは
 * `buildPathSnapshot` が写す瞬間に保証する。
 */

import { Hono } from "hono";

import {
  HOF_PATH_PREVIEW_COUNT,
  canDecline,
  canEditOwnEntry,
  canWithdraw,
  isHallOfFamePublic,
  isHofContentComplete,
  isSameHofContent,
  missingHofFields,
  normalizeHofChapters,
  normalizeJobTitle,
  normalizeQuote,
} from "@falcon/shared/hall-of-fame/types";
import type { HallOfFameStatus } from "@falcon/shared/hall-of-fame/types";

import { clientIp, recordAudit } from "../lib/audit.js";
import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import {
  loadEntryById,
  loadEntryByUser,
  listPublishedEntries,
  updateEntry,
} from "../lib/hall-of-fame-data.js";
import type { HallOfFameRow, HallOfFameRowWithProfile } from "../lib/hall-of-fame-data.js";
import { loadSkillMapSource } from "../lib/skill-map-data.js";
import { evaluateSkillMapFor } from "./skill-map.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const hallOfFameRoute = new Hono<{ Bindings: Env }>();

/** 招待が無い / もう本人のものではないときの文言 (状態は書き分けない)。 */
const NO_INVITATION_MESSAGE = "殿堂への招待が届いていません";

/** 一覧の 1 件 (カード)。**数値は載せない** — 実名・ジョブ・引用・道の頭 3 つだけ。 */
function cardPayload(row: HallOfFameRowWithProfile) {
  return {
    id: row.id,
    name: row.displayName,
    initials: row.initials,
    job_title: row.jobTitle,
    quote: row.quote,
    /**
     * ともした星は先頭 3 つまで (「多いほど偉い」の読み方に寄せない)。
     *
     * タイトルだけでなく id も返す。同じタイトルのステージが 2 つあっても、画面が
     * 一意な key を付けられるようにするため (タイトルを key にすると React が要素を
     * 取り違える)。
     */
    path_preview: row.pathSnapshot.slice(0, HOF_PATH_PREVIEW_COUNT),
    published_at: row.publishedAt?.toISOString() ?? null,
  };
}

/** 本人向けの 1 件 (招待・下書き・掲載中のどれか)。 */
function minePayload(row: HallOfFameRow) {
  return {
    id: row.id,
    status: row.status,
    job_title: row.jobTitle,
    quote: row.quote,
    chapters: row.chapters,
    path_snapshot: row.pathSnapshot,
    nominated_at: row.nominatedAt.toISOString(),
    submitted_at: row.submittedAt?.toISOString() ?? null,
    published_at: row.publishedAt?.toISOString() ?? null,
  };
}

/** 自分の行を取り、無ければ 404 (状態は書き分けない)。 */
async function requireOwnEntry(db: Db, caller: Caller): Promise<HallOfFameRow> {
  const row = await loadEntryByUser(db, caller.tenantId, caller.id);
  if (!row) throw new ApiError(NO_INVITATION_MESSAGE, 404);
  return row;
}

/**
 * 掲載された道のうち、**閲覧者が次にたどれる最初のステージ**。
 *
 * 判定はスキルツリーの評価器そのもの (`unlocked` = 前提を満たして開いている /
 * `active` = 既に始めている) で、自己開始 (`POST /api/stages/:id/start`) が受け付ける
 * 範囲と同じ。ここだけ緩めると「押せるのに始められない」CTA になる。
 *
 * 見つからなければ `null` を返し、画面は CTA ごと出さない — 「あなたには辿れません」
 * と書くより、黙って出さない方がよい (殿堂は他人の物語を読む場所であって、
 * 自分の遅れを突きつけられる場所ではない)。
 *
 * **計算するのは受講者のときだけ。** CTA を出すのは受講者の画面だけ (staff の画面には
 * 出さない) なので、それ以外のロールにスキルマップを毎回組み立てるのは捨てるための
 * 計算になる。管理者は自己開始 API そのものは使えるが、殿堂の詳細から辿る導線は
 * 受講者のものとして扱う (管理者が受講者画面で試すときは、学びの地図から始める)。
 */
async function resolveFollowStage(
  db: Db,
  caller: Caller,
  path: { id: string; title: string }[],
): Promise<{ stage_id: string; stage_title: string } | null> {
  if (caller.role !== "student") return null;
  if (path.length === 0) return null;

  const source = await loadSkillMapSource(db, caller);
  const result = evaluateSkillMapFor(source);
  const byId = new Map(source.stages.map((stage) => [stage.id, stage]));

  for (const stage of path) {
    const state = result.states.get(stage.id);
    if (state !== "unlocked" && state !== "active") continue;
    // 表示名は **閲覧者から見えている今の名前** を使う (掲載時の写しは掲載者の記録)。
    const title = byId.get(stage.id)?.title;
    if (!title) continue;
    return { stage_id: stage.id, stage_title: title };
  }
  return null;
}

hallOfFameRoute.get("/api/hall-of-fame", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await listPublishedEntries(db, caller.tenantId);
    return c.json({ entries: rows.map(cardPayload) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 自分の招待 / 下書き / 掲載。無ければ `entry: null` (404 にしない)。
 *
 * ホームの招待枠がこれを毎回引くので、「招待が無い」は正常な応答として返す。
 */
hallOfFameRoute.get("/api/hall-of-fame/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const row = await loadEntryByUser(db, caller.tenantId, caller.id);
    return c.json({ entry: row ? minePayload(row) : null });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 下書きの保存と掲載の申請。
 *
 * `submit: true` のときだけ `submitted` へ進む。**申請できるのは全項目が埋まっている
 * ときだけ** — 公開の判断材料が欠けたまま管理者の手に渡ると、管理者が本人に代わって
 * 中身を足す (= 代筆する) 誘惑が生まれる。
 *
 * 公開後は編集させない (`canEditOwnEntry`)。管理者が読んで公開した本文が、誰も読み
 * 直さないまま差し替わる経路を作らないため。直したいときは取り下げてからになる。
 */
hallOfFameRoute.put("/api/hall-of-fame/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const before = await requireOwnEntry(db, caller);

    type Body = {
      id?: unknown;
      job_title?: unknown;
      quote?: unknown;
      chapters?: unknown;
      submit?: unknown;
    };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);

    // 画面が読み込んだ行と、いま自分の行が同じかを確かめる。他人の掲載 id を送れば
    // ここで 403 になり、招待が閉じて別の行になっていた場合も取り違えない。
    if (typeof body.id === "string" && body.id !== before.id) {
      throw new ApiError("他の人の掲載は編集できません", 403);
    }
    if (!canEditOwnEntry(before.status)) {
      throw new ApiError(
        before.status === "published"
          ? "掲載中の内容は編集できません。直すときは一度取り下げてください"
          : NO_INVITATION_MESSAGE,
        400,
      );
    }

    const jobTitle = normalizeJobTitle(body.job_title);
    const quote = normalizeQuote(body.quote);
    const chapters = normalizeHofChapters(body.chapters);
    const submit = body.submit === true;

    if (submit && !isHofContentComplete({ jobTitle, quote, chapters })) {
      throw new ApiError(
        `未記入の項目があります: ${missingHofFields({ jobTitle, quote, chapters }).join(" / ")}`,
        400,
      );
    }

    const status: HallOfFameStatus = submit ? "submitted" : before.status;
    // 版 (`submitted_at`) は **本文が変わるたびに進める**。公開はこの版を
    // `expected_submitted_at` で固定する (CAS) ので、申請済みのまま「下書きを保存」で
    // 本文だけ書き換えられると、管理者が先に読んだ版の時刻が通ったままになり、
    // 読んでいない文章を公開できる隙間が残る。中身が同じ保存では進めない
    // (管理者のプレビューを理由なく無効化しない)。
    const contentChanged = !isSameHofContent(
      { jobTitle, quote, chapters },
      { jobTitle: before.jobTitle, quote: before.quote, chapters: before.chapters },
    );
    const bumpVersion = submit || (before.status === "submitted" && contentChanged);
    const after = await updateEntry(db, caller.tenantId, before.id, before.status, {
      jobTitle,
      quote,
      chapters,
      status,
      // 申請した時刻は最後に押した時刻で上書きする (書き直して出し直せる)。
      ...(bumpVersion ? { submittedAt: new Date() } : {}),
    });
    if (!after) throw new ApiError(NO_INVITATION_MESSAGE, 404);

    // 掲載の申請 = **公開への同意**。運営の操作ではないが、後から必ず問われるので残す
    // (辞退・取り下げは残さない — 断りにくさを作らないため)。
    if (submit) {
      await recordAudit(db, caller, {
        action: "hof_submit",
        targetType: "hall_of_fame_entry",
        targetId: after.id,
        ip: clientIp(c),
        metadata: { from: before.status },
      });
    }

    return c.json({ entry: minePayload(after), submitted: submit });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 辞退 (公開前) と取り下げ (公開後)。
 *
 * **監査ログには残さない。** 断ると記録が残ると分かっている招待は断りにくい招待で、
 * 「辞退しても不利益はありません」という約束が形だけになる。運営から見て必要なのは
 * 「今この人が載っているか」だけで、それは行の状態が持っている。
 */
async function closeOwnEntry(
  db: Db,
  caller: Caller,
  allow: (status: HallOfFameStatus) => boolean,
  next: "declined" | "withdrawn",
  message: string,
) {
  const before = await loadEntryByUser(db, caller.tenantId, caller.id);
  if (!before) throw new ApiError(NO_INVITATION_MESSAGE, 404);
  if (!allow(before.status)) throw new ApiError(message, 400);

  const after = await updateEntry(db, caller.tenantId, before.id, before.status, {
    status: next,
    closedAt: new Date(),
    // 公開の痕跡 (公開者 / 公開時刻) は残す — 「いつまで載っていたか」は運営の記録。
  });
  if (!after) throw new ApiError(NO_INVITATION_MESSAGE, 404);
  return after;
}

hallOfFameRoute.post("/api/hall-of-fame/mine/decline", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const after = await closeOwnEntry(
      db,
      caller,
      canDecline,
      "declined",
      "この招待はもう辞退できません",
    );
    return c.json({ entry: minePayload(after) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

hallOfFameRoute.post("/api/hall-of-fame/mine/withdraw", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const after = await closeOwnEntry(
      db,
      caller,
      canWithdraw,
      "withdrawn",
      "掲載中ではないため取り下げられません",
    );
    return c.json({ entry: minePayload(after) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 公開中の掲載の全文。公開されていない行は **存在ごと** 404。 */
hallOfFameRoute.get("/api/hall-of-fame/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const row = await loadEntryById(db, caller.tenantId, c.req.param("id"));
    if (!row || !isHallOfFamePublic(row.status)) {
      throw new ApiError("この掲載は見つかりません", 404);
    }

    const follow = await resolveFollowStage(db, caller, row.pathSnapshot);
    return c.json({
      entry: {
        ...cardPayload(row),
        chapters: row.chapters,
        /** 詳細では道を全部見せる (星座を描くため)。 */
        path: row.pathSnapshot,
      },
      follow,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

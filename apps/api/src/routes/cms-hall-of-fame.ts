/**
 * 殿堂 (Hall of Fame) の運営 API — **管理者だけ** (Phase 5)。
 *
 *   GET  /api/cms/hall-of-fame              … 全状態の一覧 + 推薦できる受講者
 *   POST /api/cms/hall-of-fame/nominate     … 推薦する (招待を送る)
 *   POST /api/cms/hall-of-fame/:id/publish  … 本人が申請した内容を公開する
 *   POST /api/cms/hall-of-fame/:id/unpublish … 公開を止める
 *
 * ## 講師は関与しない
 *
 * 発見教材のレビュー (`routes/cms-discovery.ts`) と違い、ここは `isStaffRole` ではなく
 * **管理者限定** (`requireTenantAdmin`)。誰を殿堂に載せるかは運営 (会社) の判断で、
 * 受講者を日々評価する立場の講師がその判断に加わると、選出が「講師の評価の延長」に
 * 見える。選ばれなかったことが評価に見えてしまう仕組みは作らない。
 *
 * ## 選出条件は公開しない
 *
 * 誰を推薦するかは運営が学習実績をもとに決める。API はしきい値も候補の並び順も持たず、
 * 「推薦できる受講者の一覧」しか返さない — 条件を仕組みに埋め込むと、それは事実上
 * 公開された条件になり (応答から逆算できる)、条件を満たす作業に学習が寄ってしまう。
 *
 * ## 公開できるのは「本人が申請した行」だけ
 *
 * `canPublish` が `submitted` だけを通す。推薦しただけの行 (`nominated`)、辞退した行
 * (`declined`)、取り下げられた行 (`withdrawn`) は 400 で、管理者が本文を書き足す口も
 * 無い (このルートに本文の PATCH は無い)。**本人の同意なく公開になる経路は存在しない。**
 *
 * ## 申請前の下書きは管理者にも見せない
 *
 * `staffPayload` は本文 (ジョブ・引用・4 章) を **`submitted` / `published` のときだけ**
 * 載せる。記入中 (`nominated`) の下書きは本人以外の誰にも見えない — 記入画面が
 * 「この時点では誰にも見えません」と約束している以上、管理者の一覧に途中の文章が
 * 流れてはならない。辞退 (`declined`) / 取り下げ (`withdrawn`) も同じで、降りた人の
 * 文章を運営が読み続けられる状態にしない。
 *
 * ## 公開は「読んだ内容」を固定してから (CAS)
 *
 * `publish` は `expected_submitted_at` を必須にする。管理者がプレビューで読んだ版と
 * 今の版が違えば 409。本人は公開までのあいだ何度でも書き直せるので、これが無いと
 * 「読んだ内容とは別の文章を公開してしまう」経路が残る。
 */

import { Hono } from "hono";

import {
  EMPTY_HOF_CHAPTERS,
  canPublish,
  isHofContentComplete,
  missingHofFields,
} from "@stella/shared/hall-of-fame/types";

import { clientIp, recordAudit } from "../lib/audit.js";
import { ApiError, errorResponse, getCaller, requireTenantAdmin } from "../lib/authz.js";
import {
  buildPathSnapshot,
  insertNomination,
  listAllEntries,
  listNominationCandidates,
  loadEntryById,
  loadEntryByUser,
  loadNominationTarget,
  updateEntry,
} from "../lib/hall-of-fame-data.js";
import type { HallOfFameRowWithProfile } from "../lib/hall-of-fame-data.js";
import type { Env } from "../env.js";

export const cmsHallOfFameRoute = new Hono<{ Bindings: Env }>();

/** 推薦できるのは受講者だけ (講師・営業・管理者は殿堂の対象ではない)。 */
const NOMINABLE_ROLE = "student";

/**
 * 管理者が本文を読んでよい状態か。
 *
 * **本人が申請したあとだけ。** 公開の判断材料として読むのが目的なので、判断の対象で
 * ない行 (記入中・辞退・取り下げ) の本文は運営にも渡さない。
 */
function isContentVisibleToStaff(status: HallOfFameRowWithProfile["status"]): boolean {
  return status === "submitted" || status === "published";
}

function staffPayload(row: HallOfFameRowWithProfile) {
  // 記入中の下書き・降りた人の文章は **応答に載せない**。管理者の画面で伏せるのでは
  // なく、そもそも API から出さない (画面の分岐を 1 つ間違えれば漏れるため)。
  const visible = isContentVisibleToStaff(row.status);
  return {
    id: row.id,
    user_id: row.userId,
    name: row.displayName,
    initials: row.initials,
    status: row.status,
    job_title: visible ? row.jobTitle : "",
    quote: visible ? row.quote : "",
    chapters: visible ? row.chapters : EMPTY_HOF_CHAPTERS,
    /** 「歩んだ道」は公開時にサーバが作る写し。申請前は空のまま。 */
    path_snapshot: visible ? row.pathSnapshot : [],
    nominated_at: row.nominatedAt.toISOString(),
    submitted_at: row.submittedAt?.toISOString() ?? null,
    published_at: row.publishedAt?.toISOString() ?? null,
    closed_at: row.closedAt?.toISOString() ?? null,
  };
}

cmsHallOfFameRoute.get("/api/cms/hall-of-fame", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireTenantAdmin(caller);
    const entries = await listAllEntries(db, caller.tenantId);
    const candidates = await listNominationCandidates(db, caller.tenantId, NOMINABLE_ROLE);
    return c.json({ entries: entries.map(staffPayload), candidates });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsHallOfFameRoute.post("/api/cms/hall-of-fame/nominate", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireTenantAdmin(caller);

    type Body = { userId?: unknown; user_id?: unknown };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);
    const raw = typeof body.userId === "string" ? body.userId : body.user_id;
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new ApiError("userId が必要です", 400);
    }
    const userId = raw.trim();

    const target = await loadNominationTarget(db, caller.tenantId, userId);
    if (!target) throw new ApiError("対象のユーザーが見つかりません", 404);
    if (target.role !== NOMINABLE_ROLE) {
      throw new ApiError("殿堂に推薦できるのは受講者だけです", 400);
    }
    if (target.disabled) throw new ApiError("無効化されたアカウントは推薦できません", 400);

    // 既にある行 (掲載中も、辞退済みも) は重複。**辞退した人へ招待を送り直す口を
    // 作らない** — 断ったことを知らないまま何度も届く招待は、断れない招待になる。
    const existing = await loadEntryByUser(db, caller.tenantId, userId);
    if (existing) throw new ApiError("この受講者はすでに推薦されています", 409);

    const row = await insertNomination(db, {
      tenantId: caller.tenantId,
      userId,
      nominatedBy: caller.id,
    });

    await recordAudit(db, caller, {
      action: "hof_nominate",
      targetType: "hall_of_fame_entry",
      targetId: row.id,
      ip: clientIp(c),
      metadata: { user_id: userId },
    });

    const created = await loadEntryById(db, caller.tenantId, row.id);
    if (!created) throw new ApiError("推薦した掲載を読み出せませんでした", 500);
    return c.json({ entry: staffPayload(created) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 申請された内容を公開する。
 *
 * **管理者が読んだ版だけを公開する** (`expected_submitted_at`)。本人は公開されるまで
 * 何度でも書き直せる ので、「プレビューで読む → 公開を押す」のあいだに中身が
 * 入れ替わりうる。読んだ版と今の版が違うときは公開せず 409 を返し、管理者にもう一度
 * 読ませる — 公開は運営が内容に責任を持つ操作で、読んでいない文章を公開できてしまうと
 * その責任が形だけになる。
 *
 * この比較が成り立つのは **本文が変わるたびに `submitted_at` が進む** ためで、その保証は
 * 書き込み側 (`PUT /api/hall-of-fame/mine`) が持つ。申請済みのまま下書き保存で本文だけ
 * 書き換えられたときも版が進むので、先に読んだ版の時刻は通らなくなる。
 */
cmsHallOfFameRoute.post("/api/cms/hall-of-fame/:id/publish", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireTenantAdmin(caller);

    type Body = { expected_submitted_at?: unknown };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);
    if (typeof body.expected_submitted_at !== "string" || body.expected_submitted_at === "") {
      throw new ApiError("expected_submitted_at が必要です", 400);
    }

    const before = await loadEntryById(db, caller.tenantId, c.req.param("id"));
    if (!before) throw new ApiError("対象の掲載が見つかりません", 404);
    if (!canPublish(before.status)) {
      // 辞退・取り下げ済みも、推薦しただけの行もここで止まる。
      throw new ApiError("本人が申請した掲載だけを公開できます", 400);
    }
    if (before.submittedAt?.toISOString() !== body.expected_submitted_at) {
      throw new ApiError("内容が更新されています。読み直してください", 409);
    }

    const content = {
      jobTitle: before.jobTitle,
      quote: before.quote,
      chapters: before.chapters,
    };
    if (!isHofContentComplete(content)) {
      // 申請時に埋まっていたはずだが、章の構成が変わった等で欠けることはありうる。
      // 管理者が代わりに書き足すのではなく、本人へ戻す。
      throw new ApiError(
        `未記入の項目があるため公開できません: ${missingHofFields(content).join(" / ")}`,
        400,
      );
    }

    // 「歩んだ道」は **この瞬間の**クリア実績から作る。以後の学習で伸びても、教材が
    // 改名・非公開になっても、公開したときの姿のまま残す。
    const pathSnapshot = await buildPathSnapshot(db, caller.tenantId, before.userId);
    // 上の版チェックだけでは足りない (読んでからここまでに `buildPathSnapshot` の
    // 往復もある)。**読んだ版そのものを更新条件に入れる** — 途中で本人が辞退しても
    // 書き直しても 0 件更新になり、公開しない側に倒れる。
    const after = await updateEntry(
      db,
      caller.tenantId,
      before.id,
      before.status,
      {
        status: "published",
        pathSnapshot,
        publishedAt: new Date(),
        publishedBy: caller.id,
        // 一度非公開にしてから公開し直すこともあるので、降りた印は落とす。
        closedAt: null,
      },
      before.submittedAt ?? undefined,
    );
    if (!after) {
      // 本人の操作 (辞退・取り下げ) か、読んだあとの書き直し。どちらでも
      // **公開しない側に倒す** (本人の操作が勝つ)。
      throw new ApiError("この掲載は本人の操作で状態が変わりました。読み直してください", 409);
    }

    await recordAudit(db, caller, {
      action: "hof_publish",
      targetType: "hall_of_fame_entry",
      targetId: after.id,
      ip: clientIp(c),
      metadata: { user_id: after.userId, path_stages: pathSnapshot.length },
    });

    return c.json({ entry: staffPayload({ ...before, ...after }) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 公開を止める。行き先は `submitted` — 本人が書いて申請した状態へ戻す。
 *
 * 本文も同意もそのままなので、直してからまた公開できる。`nominated` へ戻すと
 * 「本人が申請した」事実まで消えてしまい、次の公開が同意の裏付けを失う。
 */
cmsHallOfFameRoute.post("/api/cms/hall-of-fame/:id/unpublish", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireTenantAdmin(caller);

    const before = await loadEntryById(db, caller.tenantId, c.req.param("id"));
    if (!before) throw new ApiError("対象の掲載が見つかりません", 404);
    if (before.status !== "published") {
      throw new ApiError("公開中の掲載だけを非公開にできます", 400);
    }

    const after = await updateEntry(db, caller.tenantId, before.id, "published", {
      status: "submitted",
      closedAt: new Date(),
    });
    if (!after) throw new ApiError("この掲載は本人の操作で状態が変わりました", 409);

    await recordAudit(db, caller, {
      action: "hof_close",
      targetType: "hall_of_fame_entry",
      targetId: after.id,
      ip: clientIp(c),
      metadata: { user_id: after.userId },
    });

    return c.json({ entry: staffPayload({ ...before, ...after }) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

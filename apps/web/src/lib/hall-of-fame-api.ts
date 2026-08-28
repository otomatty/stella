/**
 * 殿堂 (Hall of Fame) のデータアクセス層 (Phase 5)。
 *
 * 公開読み出し・本人の記入・管理者の運用をここに集める。**誰に何を見せるかはサーバが
 * 決めている** — 公開されていない掲載はそもそも応答に現れない (404) ので、画面側で
 * 「見せてよいか」を判定し直さない。
 *
 * 応答に XP・レベル・件数のような序列の数値は入っていない。画面もそれを描かない。
 */

import type {
  HallOfFameChapters,
  HallOfFamePathStage,
  HallOfFameStatus,
} from "@falcon/shared/hall-of-fame/types";

import { apiFetch } from "./api-client";

/** トップに並ぶカード 1 枚。 */
export interface HallOfFameCard {
  id: string;
  name: string;
  initials: string | null;
  job_title: string;
  quote: string;
  /** ともした星 (教材名) の先頭 3 つ。id 付き — 同名のステージでも key が衝突しない。 */
  path_preview: HallOfFamePathStage[];
  published_at: string | null;
}

/** 詳細 (カードの内容 + 全文 + 歩んだ道)。 */
export interface HallOfFameDetail extends HallOfFameCard {
  chapters: HallOfFameChapters;
  path: HallOfFamePathStage[];
}

/** 「この道をたどる」CTA の行き先 (無ければ CTA を出さない)。 */
export interface HallOfFameFollow {
  stage_id: string;
  stage_title: string;
}

/** 本人から見た自分の招待 / 下書き / 掲載。 */
export interface HallOfFameMine {
  id: string;
  status: HallOfFameStatus;
  job_title: string;
  quote: string;
  chapters: HallOfFameChapters;
  path_snapshot: HallOfFamePathStage[];
  nominated_at: string;
  submitted_at: string | null;
  published_at: string | null;
}

export async function listHallOfFame(): Promise<HallOfFameCard[]> {
  const { entries } = await apiFetch<{ entries: HallOfFameCard[] }>("/api/hall-of-fame");
  return entries ?? [];
}

export async function getHallOfFameEntry(
  id: string,
): Promise<{ entry: HallOfFameDetail; follow: HallOfFameFollow | null }> {
  const data = await apiFetch<{ entry: HallOfFameDetail; follow: HallOfFameFollow | null }>(
    `/api/hall-of-fame/${encodeURIComponent(id)}`,
  );
  return { entry: data.entry, follow: data.follow ?? null };
}

/** 自分の招待 (無ければ null)。ホームの招待枠もこれを引く。 */
export async function getMyHallOfFameEntry(): Promise<HallOfFameMine | null> {
  const { entry } = await apiFetch<{ entry: HallOfFameMine | null }>("/api/hall-of-fame/mine");
  return entry ?? null;
}

export interface HallOfFameDraft {
  /** 画面が読み込んだ掲載の id。取り違え (他人の行 / 作り直された招待) を防ぐ。 */
  id: string;
  job_title: string;
  quote: string;
  chapters: HallOfFameChapters;
  /** true で「この内容で掲載を申請」。false は下書き保存。 */
  submit: boolean;
}

export async function saveMyHallOfFameEntry(draft: HallOfFameDraft): Promise<HallOfFameMine> {
  const { entry } = await apiFetch<{ entry: HallOfFameMine }>("/api/hall-of-fame/mine", {
    method: "PUT",
    body: draft,
  });
  return entry;
}

export async function declineHallOfFame(): Promise<HallOfFameMine> {
  const { entry } = await apiFetch<{ entry: HallOfFameMine }>("/api/hall-of-fame/mine/decline", {
    method: "POST",
    body: {},
  });
  return entry;
}

export async function withdrawHallOfFame(): Promise<HallOfFameMine> {
  const { entry } = await apiFetch<{ entry: HallOfFameMine }>("/api/hall-of-fame/mine/withdraw", {
    method: "POST",
    body: {},
  });
  return entry;
}

// ---------------------------------------------------------------
// 管理者 (運用画面)
// ---------------------------------------------------------------

/**
 * 管理画面の 1 行 (全状態)。
 *
 * 本文 (ジョブ・引用・4 章・歩んだ道) が入っているのは **申請済み / 掲載中の行だけ** —
 * 公開前に読んで確かめるためで、記入中の下書きや降りた人の文章はサーバが空で返す。
 * 画面側で伏せているのではないので、ここに来た値はそのまま出してよい。
 */
export interface HallOfFameAdminRow {
  id: string;
  user_id: string;
  name: string;
  initials: string | null;
  status: HallOfFameStatus;
  job_title: string;
  quote: string;
  chapters: HallOfFameChapters;
  path_snapshot: HallOfFamePathStage[];
  nominated_at: string;
  submitted_at: string | null;
  published_at: string | null;
  closed_at: string | null;
}

/** まだ招待していない受講者 (表示名順。実績では並べない)。 */
export interface HallOfFameCandidate {
  id: string;
  name: string;
  email: string | null;
}

export interface HallOfFameAdminOverview {
  entries: HallOfFameAdminRow[];
  candidates: HallOfFameCandidate[];
}

export async function getHallOfFameOverview(): Promise<HallOfFameAdminOverview> {
  const data = await apiFetch<HallOfFameAdminOverview>("/api/cms/hall-of-fame");
  return { entries: data.entries ?? [], candidates: data.candidates ?? [] };
}

export async function nominateHallOfFame(userId: string): Promise<HallOfFameAdminRow> {
  const { entry } = await apiFetch<{ entry: HallOfFameAdminRow }>(
    "/api/cms/hall-of-fame/nominate",
    { method: "POST", body: { userId } },
  );
  return entry;
}

/**
 * 申請された内容を公開する。
 *
 * `expectedSubmittedAt` は **プレビューで読んだ行の `submitted_at`**。本人は公開まで
 * 何度でも出し直せるので、読んだ版と今の版が違えばサーバが 409 で止める
 * (「読んでいない文章を公開してしまう」経路を残さない)。
 */
export async function publishHallOfFame(
  id: string,
  expectedSubmittedAt: string,
): Promise<HallOfFameAdminRow> {
  const { entry } = await apiFetch<{ entry: HallOfFameAdminRow }>(
    `/api/cms/hall-of-fame/${encodeURIComponent(id)}/publish`,
    { method: "POST", body: { expected_submitted_at: expectedSubmittedAt } },
  );
  return entry;
}

export async function unpublishHallOfFame(id: string): Promise<HallOfFameAdminRow> {
  const { entry } = await apiFetch<{ entry: HallOfFameAdminRow }>(
    `/api/cms/hall-of-fame/${encodeURIComponent(id)}/unpublish`,
    { method: "POST", body: {} },
  );
  return entry;
}

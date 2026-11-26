/**
 * CMS データアクセス層 (Neon / Hono API)。
 *
 * 旧 BaaS 直アクセス (RLS + reorder RPC + Storage アップロード) を Hono API
 * (`/api/cms/*`) 経由に置き換えた。 認可はサーバ側 (staff)。
 * 戻り値は DB 行 (snake_case) のままで、 マッパー (@stella/shared/cms/types) は呼び出し側で適用する。
 */

import type { AssignmentRow, StageRow, StageWithChildren } from "@stella/shared/cms/types";
import { apiFetch } from "./api-client";

// ---------------------------------------------------------------
// Stages
// ---------------------------------------------------------------

export async function listStages(): Promise<StageRow[]> {
  const { rows } = await apiFetch<{ rows: StageRow[] }>("/api/cms/stages");
  return rows ?? [];
}

export async function getStageWithChildren(
  stageId: string,
  signal?: AbortSignal,
): Promise<StageWithChildren | null> {
  const { stage } = await apiFetch<{ stage: StageWithChildren | null }>(
    `/api/cms/stages/${encodeURIComponent(stageId)}`,
    { signal },
  );
  return stage ?? null;
}

// ---------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------

export async function getAssignmentRow(id: string): Promise<AssignmentRow | null> {
  const { row } = await apiFetch<{ row: AssignmentRow | null }>(
    `/api/cms/assignments/${encodeURIComponent(id)}`,
  );
  return row ?? null;
}

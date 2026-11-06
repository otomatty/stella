/**
 * CMS データアクセス層 (Neon / Hono API)。
 *
 * 旧 BaaS 直アクセス (RLS + reorder RPC + Storage アップロード) を Hono API
 * (`/api/cms/*`, `/api/materials/*`) 経由に置き換えた。 認可はサーバ側 (staff)。
 * 戻り値は DB 行 (snake_case) のままで、 マッパー (@stella/shared/cms/types) は呼び出し側で適用する。
 */

import type {
  AssignmentRow,
  StageMaterialRow,
  StageRow,
  StageWithChildren,
  LessonMaterialRow,
  LessonMaterialVersionRow,
} from "@stella/shared/cms/types";
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

// ---------------------------------------------------------------
// レッスン配布資料 (Issue #72)
// ---------------------------------------------------------------

/**
 * レッスンに紐づく配布資料一覧。 受講者は published のステージのみ返る。
 * `includeArchived` は staff の管理画面用で、 教材から作らなくなった自動生成資料も含める
 * (旧版を版履歴から取るため)。
 */
export async function listLessonMaterials(
  lessonId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<LessonMaterialRow[]> {
  const { rows } = await apiFetch<{ rows: LessonMaterialRow[] }>(
    `/api/materials?lessonId=${encodeURIComponent(lessonId)}${includeArchived ? "&includeArchived=1" : ""}`,
  );
  return rows ?? [];
}

/**
 * ステージ全体の配布資料一覧 (Issue #77 — ステージ詳細「教材をダウンロード」)。
 * セクション → レッスン → 登録順に並んだ状態で返る。
 */
export async function listStageMaterials(
  stageId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<StageMaterialRow[]> {
  const { rows } = await apiFetch<{ rows: StageMaterialRow[] }>(
    `/api/materials?stageId=${encodeURIComponent(stageId)}${includeArchived ? "&includeArchived=1" : ""}`,
  );
  return rows ?? [];
}

/**
 * 自動生成資料の版履歴 (staff のみ)。新しい版が先頭。
 */
export async function listLessonMaterialVersions(
  materialId: string,
): Promise<LessonMaterialVersionRow[]> {
  const { rows } = await apiFetch<{ rows: LessonMaterialVersionRow[] }>(
    `/api/materials/${encodeURIComponent(materialId)}/versions`,
  );
  return rows ?? [];
}

/** プロキシ経由 (要 Authorization) のダウンロード。 fetch → Blob → a[download] で保存させる。 */
async function downloadViaProxy(apiPath: string, fileName: string): Promise<void> {
  const { getAccessToken } = await import("./auth-client");
  const serverUrl = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");
  const token = getAccessToken();
  const res = await fetch(`${serverUrl}${apiPath}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `ダウンロードに失敗しました (${res.status})`;
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 配布資料をダウンロードする。 */
export async function downloadLessonMaterial(
  material: Pick<LessonMaterialRow, "id" | "file_name">,
): Promise<void> {
  await downloadViaProxy(
    `/api/materials/${encodeURIComponent(material.id)}/download`,
    material.file_name,
  );
}

/** 自動生成資料の指定版をダウンロードする (staff のみ)。ファイル名に版番号を付ける。 */
export async function downloadLessonMaterialVersion(
  material: Pick<LessonMaterialRow, "id" | "file_name">,
  version: number,
): Promise<void> {
  const versionedName = material.file_name.replace(/(\.[^.]+)?$/, ` (v${version})$1`);
  await downloadViaProxy(
    `/api/materials/${encodeURIComponent(material.id)}/versions/${version}/download`,
    versionedName,
  );
}

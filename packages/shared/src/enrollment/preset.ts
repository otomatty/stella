/**
 * 割当プリセット (受講登録のテンプレート) の共有型と純粋ロジック。
 *
 * ## Phase 3b: 残っているのは **定義** だけ
 *
 * 受講登録の割当そのものを廃止したので、プリセットを受講生へ展開する 「適用」 は
 * API ごと退役した (`POST /api/enrollment-presets/:id/apply` は 410)。 それに伴い、
 * 適用の計画 (`planPresetApply`) と結果型・衝突ポリシー・基準日から期限を求める計算も
 * ここから削除してある — 呼び出し元が 1 つも無く、 「まだ一括で配れる」 と読める
 * 残骸だったため。
 *
 * 定義の CRUD (`routes/enrollment-presets.ts`) とテーブルは残置してある。 適用済みの
 * 登録が `enrollments.preset_id` で出自を指しており、 監査ログや過去の受講状況と
 * 突き合わせるのに要るため。 このファイルが持つのはその CRUD が使う **行の形と
 * 入力バリデーション** だけ。
 *
 * 期限は絶対日付ではなく **基準日からの日数** (`due_offset_days`) で持つ。 絶対日付を
 * 焼き込むと 4 月に作った定義が 7 月には腐るため。 定義の意味づけとして残しており、
 * 展開する側はもう居ない。
 *
 * ランタイム依存を持たない純粋関数なので、 API (`apps/api`) と Web (`apps/web`) の双方が
 * この 1 か所を使う。
 */

// ---------------------------------------------------------------
// 行型 (DB 列は snake_case)
// ---------------------------------------------------------------

/** プリセットに含まれる教材 1 件。 */
export interface EnrollmentPresetItemRow {
  id: string;
  preset_id: string;
  stage_id: string;
  required: boolean;
  /** 基準日からの日数。 null なら期限なし。 */
  due_offset_days: number | null;
  order: number;
}

/** 割当プリセット本体。 */
export interface EnrollmentPresetRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 一覧 / 編集が扱う「項目込みのプリセット」(CRUD の応答形)。 */
export interface EnrollmentPresetWithItems extends EnrollmentPresetRow {
  items: EnrollmentPresetItemRow[];
}

// ---------------------------------------------------------------
// 入力の上限
// ---------------------------------------------------------------

export const PRESET_NAME_MAX = 60;
export const PRESET_DESCRIPTION_MAX = 200;
/**
 * 1 プリセットに入れられる教材数。 定義は 1 リクエストで全置換するので、 1 文に載る
 * 項目数の上限として置いている (退役した一括割当のステージ数上限と同じ 50 件)。
 */
export const PRESET_MAX_ITEMS = 50;
/** 期限オフセットの範囲 (日)。 負値は「基準日より前」を許すが、 極端な値は入力ミスとして弾く。 */
export const PRESET_DUE_OFFSET_MIN = -365;
export const PRESET_DUE_OFFSET_MAX = 3650;

// ---------------------------------------------------------------
// 入力バリデーション (API ハンドラが使う)
// ---------------------------------------------------------------

/** プリセット項目の入力 (作成 / 更新の body)。 */
export interface PresetItemInput {
  stage_id: string;
  required: boolean;
  due_offset_days: number | null;
  order: number;
}

/** プリセットの入力 (作成 / 更新の body)。 */
export interface PresetInput {
  name: string;
  description: string | null;
  items: PresetItemInput[];
}

export type ValidatePresetResult =
  | { ok: true; value: PresetInput }
  | { ok: false; message: string };

/**
 * プリセット作成 / 更新の body を検証して正規化する。
 *
 * `items` は常に全置換として扱う。 差分パッチにすると 「消したはずの教材が残る」 が起きやすく、
 * 項目数も高々 50 件なので、 毎回まるごと入れ替える方が単純で安全。
 */
export function validatePresetInput(raw: unknown): ValidatePresetResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, message: "リクエストボディが不正です" };
  }
  const body = raw as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length === 0) return { ok: false, message: "プリセット名を入力してください" };
  if (name.length > PRESET_NAME_MAX) {
    return { ok: false, message: `プリセット名は ${PRESET_NAME_MAX} 文字以内です` };
  }

  const rawDescription = typeof body.description === "string" ? body.description.trim() : "";
  if (rawDescription.length > PRESET_DESCRIPTION_MAX) {
    return { ok: false, message: `説明は ${PRESET_DESCRIPTION_MAX} 文字以内です` };
  }
  const description = rawDescription.length > 0 ? rawDescription : null;

  if (!Array.isArray(body.items)) {
    return { ok: false, message: "items が必要です" };
  }
  if (body.items.length === 0) {
    return { ok: false, message: "教材を 1 件以上選んでください" };
  }
  if (body.items.length > PRESET_MAX_ITEMS) {
    return { ok: false, message: `教材は ${PRESET_MAX_ITEMS} 件までです` };
  }

  const items: PresetItemInput[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of body.items.entries()) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, message: `items[${index}] が不正です` };
    }
    const item = entry as Record<string, unknown>;
    const stageId = typeof item.stage_id === "string" ? item.stage_id.trim() : "";
    if (stageId.length === 0) {
      return { ok: false, message: `items[${index}].stage_id が必要です` };
    }
    if (seen.has(stageId)) {
      return { ok: false, message: "同じ教材が重複しています" };
    }
    seen.add(stageId);

    const offsetRaw = item.due_offset_days;
    let dueOffsetDays: number | null;
    if (offsetRaw === null || offsetRaw === undefined || offsetRaw === "") {
      dueOffsetDays = null;
    } else if (typeof offsetRaw === "number" && Number.isInteger(offsetRaw)) {
      dueOffsetDays = offsetRaw;
    } else {
      return { ok: false, message: `items[${index}].due_offset_days は整数で指定してください` };
    }
    if (
      dueOffsetDays !== null &&
      (dueOffsetDays < PRESET_DUE_OFFSET_MIN || dueOffsetDays > PRESET_DUE_OFFSET_MAX)
    ) {
      return {
        ok: false,
        message: `期限は ${PRESET_DUE_OFFSET_MIN} 〜 ${PRESET_DUE_OFFSET_MAX} 日の範囲で指定してください`,
      };
    }

    items.push({
      stage_id: stageId,
      required: item.required !== false,
      due_offset_days: dueOffsetDays,
      // 並び順は受け取った配列の順序を正とする (UI の並べ替えがそのまま保存される)。
      order: index,
    });
  }

  return { ok: true, value: { name, description, items } };
}

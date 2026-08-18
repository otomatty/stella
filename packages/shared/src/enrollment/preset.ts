/**
 * 割当プリセット (受講登録のテンプレート) の共有型と純粋ロジック。
 *
 * プリセットは 「新入社員パック = TypeScript 入門 (1 ヶ月後 / 必須) + SQL 入門 (2 ヶ月後 / 必須)」
 * のような組み合わせに名前を付けたもの。 設計上の要点は 2 つ:
 *
 *   1. 期限は絶対日付ではなく **基準日からの日数** (`due_offset_days`) で持つ。
 *      絶対日付を焼き込むと 4 月に作ったプリセットが 7 月には腐り、 適用のたびに手直しになる。
 *   2. 既存の受講登録があるときの扱い (`conflict`) を呼び出し側に明示させる。
 *      既存の期限 / 必須を黙って上書きすると、 個別に調整した期限が消える。
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
  course_id: string;
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

/** 一覧 / 適用ダイアログが扱う「項目込みのプリセット」。 */
export interface EnrollmentPresetWithItems extends EnrollmentPresetRow {
  items: EnrollmentPresetItemRow[];
}

// ---------------------------------------------------------------
// 入力の上限
// ---------------------------------------------------------------

export const PRESET_NAME_MAX = 60;
export const PRESET_DESCRIPTION_MAX = 200;
/**
 * 1 プリセットに入れられる教材数。 適用は `/api/enrollments/bulk` と同じ一括 upsert に乗るため、
 * サーバ側のコース数上限 (50) に合わせる。
 */
export const PRESET_MAX_ITEMS = 50;
/** 期限オフセットの範囲 (日)。 負値は「基準日より前」を許すが、 極端な値は入力ミスとして弾く。 */
export const PRESET_DUE_OFFSET_MIN = -365;
export const PRESET_DUE_OFFSET_MAX = 3650;

/**
 * 既に受講登録がある受講生にプリセットを当てたときの扱い。
 *
 *   - `skip`      … 既存はそのまま。 未割当のコースだけ追加する (既定)
 *   - `overwrite` … 既存の期限 / 必須もプリセットの内容で上書きする
 */
export type PresetConflictPolicy = "skip" | "overwrite";

export const PRESET_CONFLICT_POLICIES: readonly PresetConflictPolicy[] = ["skip", "overwrite"];

export function isPresetConflictPolicy(value: unknown): value is PresetConflictPolicy {
  return (
    typeof value === "string" && (PRESET_CONFLICT_POLICIES as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------
// 期限の計算
// ---------------------------------------------------------------

/**
 * 実在する暦日の `YYYY-MM-DD` か。
 *
 * 形式だけを見ると足りない。 JS の `Date` は `2026-02-30` を NaN にせず 3/2 へ繰り上げるため、
 * 形式チェックだけ通すと 「受け付けられたが期限が静かにずれる」 ことになる。
 * ISO へ往復させて元の文字列と一致するかまで確かめる。
 */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(ms)) return false;
  return new Date(ms).toISOString().slice(0, 10) === value;
}

/**
 * 基準日 + オフセット日数 → `due_at` に入れる ISO 文字列 (UTC 0 時)。
 *
 * `enrollments.due_at` は 「入力日の UTC 0 時」 という既存の約束
 * (`apps/web/.../enrollments-admin/shared.ts` の `fromDateInput`) に合わせる。
 * ここを日付として扱わずタイムスタンプ演算にすると、 期限当日の朝から超過扱いになる。
 *
 * @param baseDate `YYYY-MM-DD` (適用日 / 入社日など)
 * @param offsetDays 基準日からの日数。 null なら期限なし
 * @returns ISO 文字列。 期限なしなら null
 */
export function dueDateFromOffset(baseDate: string, offsetDays: number | null): string | null {
  if (offsetDays === null || offsetDays === undefined) return null;
  if (!isDateKey(baseDate)) {
    throw new Error(`基準日は実在する YYYY-MM-DD が必要です: ${baseDate}`);
  }
  const base = Date.parse(`${baseDate}T00:00:00.000Z`);
  if (!Number.isInteger(offsetDays)) {
    throw new Error(`期限オフセットは整数が必要です: ${offsetDays}`);
  }
  return new Date(base + offsetDays * 86_400_000).toISOString();
}

/** オフセットの人間向け表示 (「30日後」「当日」「期限なし」)。 */
export function dueOffsetLabel(offsetDays: number | null): string {
  if (offsetDays === null) return "期限なし";
  if (offsetDays === 0) return "基準日当日";
  return offsetDays > 0 ? `基準日から ${offsetDays} 日後` : `基準日から ${-offsetDays} 日前`;
}

// ---------------------------------------------------------------
// 入力バリデーション (API ハンドラが使う)
// ---------------------------------------------------------------

/** プリセット項目の入力 (作成 / 更新の body)。 */
export interface PresetItemInput {
  course_id: string;
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
    const courseId = typeof item.course_id === "string" ? item.course_id.trim() : "";
    if (courseId.length === 0) {
      return { ok: false, message: `items[${index}].course_id が必要です` };
    }
    if (seen.has(courseId)) {
      return { ok: false, message: "同じ教材が重複しています" };
    }
    seen.add(courseId);

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
      course_id: courseId,
      required: item.required !== false,
      due_offset_days: dueOffsetDays,
      // 並び順は受け取った配列の順序を正とする (UI の並べ替えがそのまま保存される)。
      order: index,
    });
  }

  return { ok: true, value: { name, description, items } };
}

// ---------------------------------------------------------------
// 適用結果
// ---------------------------------------------------------------

/** 適用 1 組 (受講生 × 教材) の結果。 */
export interface PresetApplyDetail {
  user_id: string;
  course_id: string;
  action: "assigned" | "overwritten" | "skipped";
}

/**
 * `POST /api/enrollment-presets/:id/apply` のレスポンス。
 *
 * `skip` では実際に書き込めた組で `details` と件数を揃える (計画後に他の管理者が同じ組を
 * 登録した場合も食い違わない)。 `overwrite` は 1 文の upsert で新規と上書きを区別できないため、
 * 内訳は計画時点の状態に基づく — 計画後に割り込みで作られた組は `assigned` に数える。
 * 合計 (= 受講生 × 教材) はどちらでも常に正しい。
 */
export interface PresetApplyResult {
  /** 実行せず見積もっただけか (`dryRun`)。 */
  dry_run: boolean;
  /** 新規に追加した (される) 件数。 */
  assigned: number;
  /** 既存を上書きした (される) 件数。 */
  overwritten: number;
  /** 既存があるため触らなかった (触らない) 件数。 */
  skipped: number;
  details: PresetApplyDetail[];
  /** 未公開 (draft / archived) のまま含まれている教材の件数。 適用は止めず警告に使う。 */
  unpublished_course_ids: string[];
}

// ---------------------------------------------------------------
// 適用計画
// ---------------------------------------------------------------

/** 実際に upsert する 1 行ぶんの内容。 */
export interface PresetApplyRow {
  user_id: string;
  course_id: string;
  /** 基準日 + オフセットから決まる期限 (ISO / UTC 0 時)。 期限なしなら null。 */
  due_at: string | null;
  required: boolean;
  /** 既存を上書きする行か。 `skip` では常に false。 */
  overwrite: boolean;
}

export interface PresetApplyPlan {
  rows: PresetApplyRow[];
  details: PresetApplyDetail[];
  assigned: number;
  overwritten: number;
  skipped: number;
}

/**
 * 「誰に・どの教材を・いつまでに」 を決める計画を組む。 DB へは触らない。
 *
 * dry-run (プレビュー) と本適用で同じ関数を使うことで、 「プレビューでは 98 件と出たのに
 * 実際は 120 件入った」 というズレを構造的に防ぐ。
 *
 * @param items プリセットの項目 (order 昇順を想定)
 * @param userIds 適用先の受講生
 * @param baseDate 期限の基準日 (`YYYY-MM-DD`)
 * @param conflict 既存登録の扱い
 * @param hasEnrollment (userId, courseId) に既存の受講登録があるか
 */
export function planPresetApply(
  items: readonly PresetItemInput[],
  userIds: readonly string[],
  baseDate: string,
  conflict: PresetConflictPolicy,
  hasEnrollment: (userId: string, courseId: string) => boolean,
): PresetApplyPlan {
  const rows: PresetApplyRow[] = [];
  const details: PresetApplyDetail[] = [];
  let assigned = 0;
  let overwritten = 0;
  let skipped = 0;

  for (const userId of userIds) {
    for (const item of items) {
      const exists = hasEnrollment(userId, item.course_id);
      if (exists && conflict === "skip") {
        skipped += 1;
        details.push({ user_id: userId, course_id: item.course_id, action: "skipped" });
        continue;
      }
      if (exists) overwritten += 1;
      else assigned += 1;
      details.push({
        user_id: userId,
        course_id: item.course_id,
        action: exists ? "overwritten" : "assigned",
      });
      rows.push({
        user_id: userId,
        course_id: item.course_id,
        due_at: dueDateFromOffset(baseDate, item.due_offset_days),
        required: item.required,
        overwrite: exists,
      });
    }
  }

  return { rows, details, assigned, overwritten, skipped };
}

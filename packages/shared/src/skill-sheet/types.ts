/**
 * SkillSheet v1 — 面談対策用スキルシート共通フォーマット (Issue #203)。
 */

/** 連絡先系 — どの階層でも除去する。 */
const ALWAYS_FORBIDDEN_CONTACT_FIELDS = [
  "email",
  "phone",
  "tel",
  "telephone",
  "mobile",
  "address",
  "contact",
  "メール",
  "メールアドレス",
  "emailアドレス",
  "電話",
  "電話番号",
  "携帯",
  "携帯電話",
  "連絡先",
  "住所",
  "郵便番号",
] as const;

/** 氏名系 — top-level と sections.basic のみ除去 (skills[].name 等は残す)。 */
const PERSON_IDENTITY_FIELDS = [
  "name",
  "fullName",
  "full_name",
  "氏名",
  "名前",
  "姓",
  "名",
  "フリガナ",
  "ふりがな",
] as const;

const ALWAYS_FORBIDDEN_SET = new Set<string>(
  ALWAYS_FORBIDDEN_CONTACT_FIELDS.flatMap((field) => [field, field.toLowerCase()]),
);
const PERSON_IDENTITY_SET = new Set<string>(
  PERSON_IDENTITY_FIELDS.flatMap((field) => [field, field.toLowerCase()]),
);

export interface SkillSheetV1Sections {
  basic: Record<string, unknown>;
  skills: unknown[];
  projects: unknown[];
  certifications: unknown[];
  self_pr: string;
}

export interface SkillSheetV1 {
  sections: SkillSheetV1Sections;
}

export interface SkillSheetDraft {
  status: "DRAFT";
  sections: SkillSheetV1Sections;
  /** parse で R2 に保存した原本オブジェクトキー。save 時に skill_sheets.r2_key へ引き継ぐ。 */
  r2Key?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isForbiddenContactKey(key: string, stripPersonIdentity: boolean): boolean {
  if (ALWAYS_FORBIDDEN_SET.has(key) || ALWAYS_FORBIDDEN_SET.has(key.toLowerCase())) {
    return true;
  }
  if (
    stripPersonIdentity &&
    (PERSON_IDENTITY_SET.has(key) || PERSON_IDENTITY_SET.has(key.toLowerCase()))
  ) {
    return true;
  }
  return false;
}

/** sections.basic 配下か、ルート直下か。 */
function shouldStripPersonIdentity(path: string[]): boolean {
  if (path.length === 0) return true;
  if (path[0] === "sections" && path[1] === "basic") return true;
  return false;
}

/** オブジェクト / 配列を再帰的に走査し、禁止キーを除去する。 */
function stripContactDeep(value: unknown, path: string[] = []): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => stripContactDeep(item, [...path, String(index)]));
  }
  if (!isRecord(value)) return value;

  const stripPersonIdentity = shouldStripPersonIdentity(path);
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isForbiddenContactKey(key, stripPersonIdentity)) continue;
    next[key] = stripContactDeep(child, [...path, key]);
  }
  return next;
}

export function validateSkillSheetV1(
  raw: unknown,
): { ok: true; value: SkillSheetV1 } | { ok: false } {
  if (!isRecord(raw)) return { ok: false };
  const sections = raw.sections;
  if (!isRecord(sections)) return { ok: false };

  const required = ["basic", "skills", "projects", "certifications", "self_pr"] as const;
  for (const key of required) {
    if (!(key in sections)) return { ok: false };
  }

  if (!isRecord(sections.basic)) return { ok: false };
  if (!Array.isArray(sections.skills)) return { ok: false };
  if (!Array.isArray(sections.projects)) return { ok: false };
  if (!Array.isArray(sections.certifications)) return { ok: false };
  if (typeof sections.self_pr !== "string") return { ok: false };

  return {
    ok: true,
    value: {
      sections: {
        basic: sections.basic,
        skills: sections.skills,
        projects: sections.projects,
        certifications: sections.certifications,
        self_pr: sections.self_pr,
      },
    },
  };
}

/** AI 解析結果から氏名・連絡先フィールドを除去する (ネスト含む)。 */
export function stripForbiddenContactFields(raw: Record<string, unknown>): Record<string, unknown> {
  const stripped = stripContactDeep(raw);
  return isRecord(stripped) ? stripped : {};
}

export function emptySkillSheetSections(): SkillSheetV1Sections {
  return {
    basic: {},
    skills: [],
    projects: [],
    certifications: [],
    self_pr: "",
  };
}

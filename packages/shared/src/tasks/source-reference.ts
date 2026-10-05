/** 学習者へ配る出典だけ。講師のレビュー記録や非公開教材のパスは含めない。 */
export interface PublicSourceReference {
  id: string;
  title: string;
  publisher: string;
  url: string;
  section: string;
  documentVersion: string;
  checkedAt: string;
  environmentRef: string;
  usedFor: string;
  authorship: string;
  reuse: string;
  attribution?: string;
}

export function isPublicSourceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !decodeURIComponent(url.pathname)
        .split("/")
        .some((s) => ["private", "solution", "variants"].includes(s.toLowerCase()))
    );
  } catch {
    return false;
  }
}

/** 配布 manifest の公開境界。余分な内部情報をコピーしない。 */
export function parsePublicSourceReferences(raw: unknown): PublicSourceReference[] {
  if (!Array.isArray(raw)) throw new Error("references は配列で書いてください");
  return raw.map((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new Error("references の出典はオブジェクトで書いてください");
    const row = value as Record<string, unknown>;
    const fields = [
      "id",
      "title",
      "publisher",
      "section",
      "documentVersion",
      "checkedAt",
      "environmentRef",
      "usedFor",
      "authorship",
      "reuse",
    ] as const;
    const result = {} as PublicSourceReference;
    for (const key of fields) {
      if (typeof row[key] !== "string" || !row[key].trim())
        throw new Error(`references.${key} は空でない文字列が必要です`);
      result[key] = row[key].trim();
    }
    if (!isPublicSourceUrl(row.url))
      throw new Error("references.url は公開資料の HTTP(S) URL が必要です");
    result.url = new URL(row.url).href;
    if (row.attribution !== undefined) {
      if (typeof row.attribution !== "string" || !row.attribution.trim())
        throw new Error("references.attribution は空でない文字列が必要です");
      result.attribution = row.attribution;
    }
    return result;
  });
}

export const SOURCE_AUTHORSHIP_LABELS: Readonly<Record<string, string>> = {
  original: "教材独自",
  "original-exercise": "教材独自の課題",
  summary: "要約",
  quotation: "引用",
  adapted: "改変",
};
export const SOURCE_REUSE_LABELS: Readonly<Record<string, string>> = {
  original: "独自制作",
  "concept-reference": "概念の参照",
  quote: "引用",
  reprint: "転載",
  "adapt-code": "コードの改変",
  "adapt-diagram": "図の改変",
};

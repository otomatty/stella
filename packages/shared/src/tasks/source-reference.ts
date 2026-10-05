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
  /** 引用・転載・改変で教材に残す帰属表示の文言。 */
  attribution?: string;
  /**
   * 帰属表示の根拠。文言 (`attribution`) に原作者や条件の URL が書かれているとは限らないので、
   * 台帳で必須にしている項目を文言と組で配る。
   */
  attributionTerms?: PublicAttributionTerms;
}
/** 帰属表示に要る原作者・再利用範囲・利用条件の URL・条件の確認日。 */
export interface PublicAttributionTerms {
  creator: string;
  scope: string;
  conditionsUrl: string;
  checkedAt: string;
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
    // 文言だけ・条件だけでは帰属表示として足りないので、組でしか通さない。
    if ((row.attribution === undefined) !== (row.attributionTerms === undefined))
      throw new Error("references.attribution と attributionTerms は組で書いてください");
    if (row.attributionTerms !== undefined) {
      const terms = row.attributionTerms as Record<string, unknown>;
      if (typeof terms !== "object" || terms === null || Array.isArray(terms))
        throw new Error("references.attributionTerms はオブジェクトで書いてください");
      const field = (key: "creator" | "scope" | "checkedAt"): string => {
        const text = terms[key];
        if (typeof text !== "string" || !text.trim())
          throw new Error(`references.attributionTerms.${key} は空でない文字列が必要です`);
        return text.trim();
      };
      if (!isPublicSourceUrl(terms.conditionsUrl))
        throw new Error(
          "references.attributionTerms.conditionsUrl は公開の HTTP(S) URL が必要です",
        );
      result.attributionTerms = {
        creator: field("creator"),
        scope: field("scope"),
        conditionsUrl: new URL(terms.conditionsUrl).href,
        checkedAt: field("checkedAt"),
      };
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

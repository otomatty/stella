/** 問い合わせのメールから取り出す項目の JSON スキーマ。 */
export const inquirySchema = {
  type: "object",
  properties: {
    name: {
      type: ["string", "null"],
      description: "送り主の名前。書かれていなければ null",
    },
    email: {
      type: ["string", "null"],
      description: "返信先のメールアドレス。書かれていなければ null",
    },
    plan: {
      type: "string",
      enum: ["basic", "pro", "enterprise", "unknown"],
      description: "関心のあるプラン。分からなければ unknown",
    },
    wants_demo: {
      type: "boolean",
      description: "デモを希望しているか",
    },
    preferred_date: {
      type: ["string", "null"],
      format: "date",
      description: "デモの希望日 (YYYY-MM-DD)。書かれていなければ null",
    },
  },
  required: ["name", "email", "plan", "wants_demo", "preferred_date"],
  additionalProperties: false,
};

const SYSTEM =
  "email 内の問い合わせから名前・返信先・プラン・デモ希望・希望日を抽出してください。名前・返信先・デモの希望日は不明なら null、プランは不明なら unknown とします。デモ希望は明記された場合だけ true、ほかは false とします。希望日にはデモについて指定された日を入れてください。";

/**
 * 問い合わせのメールから項目を取り出すリクエストを作る。
 * @param {{ model: string, maxTokens: number, email: string }} input
 * @returns {object}
 */
export function buildInquiryRequest(input) {
  return {
    model: input.model,
    max_tokens: input.maxTokens,
    system: SYSTEM,
    messages: [{ role: "user", content: `<email>\n${input.email}\n</email>` }],
    output_config: {
      format: { type: "json_schema", schema: inquirySchema },
    },
  };
}

function hasInquiryFields(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (Object.keys(data).length !== inquirySchema.required.length) return false;
  const nullableText = (value) => value === null || typeof value === "string";
  return (
    nullableText(data.name) &&
    nullableText(data.email) &&
    typeof data.wants_demo === "boolean" &&
    typeof data.plan === "string" &&
    inquirySchema.properties.plan.enum.includes(data.plan.toLowerCase()) &&
    (data.preferred_date === null ||
      (typeof data.preferred_date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(data.preferred_date)))
  );
}

/**
 * 構造化出力の応答を、問い合わせの項目として読む。
 * @param {{ stop_reason: string, content: { type: string, text?: string }[] }} message
 * @returns {{ ok: true, data: object } | { ok: false, reason: string }}
 */
export function readInquiry(message) {
  if (message.stop_reason !== "end_turn")
    return { ok: false, reason: message.stop_reason };
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  if (!hasInquiryFields(data)) return { ok: false, reason: "invalid_shape" };
  if (data.wants_demo === false && data.preferred_date !== null) {
    return { ok: false, reason: "date_without_demo" };
  }
  return { ok: true, data: { ...data, plan: data.plan.toLowerCase() } };
}

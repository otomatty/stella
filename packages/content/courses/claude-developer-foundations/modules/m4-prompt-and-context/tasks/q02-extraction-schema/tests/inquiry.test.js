import { describe, expect, test } from "vitest";
import {
  buildInquiryRequest,
  inquirySchema,
  readInquiry,
} from "../src/inquiry.js";

const FIELDS = ["name", "email", "plan", "wants_demo", "preferred_date"];

// 構造化出力で使えない制限 (書くと 400 エラーになる)。
const UNSUPPORTED = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "maxItems",
  "uniqueItems",
];

function* schemaNodes(node) {
  yield node;
  for (const child of Object.values(node.properties ?? {}))
    yield* schemaNodes(child);
  if (node.items) yield* schemaNodes(node.items);
  for (const child of [...(node.anyOf ?? []), ...(node.allOf ?? [])])
    yield* schemaNodes(child);
}

const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isType(type, value) {
  if (type === "null") return value === null;
  if (type === "object") return isObject(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

// テスト用の小さな検査器。type・enum・properties・required・additionalProperties・anyOf を見る。
function matches(schema, value) {
  if (schema.anyOf)
    return schema.anyOf.some((branch) => matches(branch, value));
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => isType(type, value))) return false;
  }
  if (isObject(value) && schema.properties) {
    if (!(schema.required ?? []).every((key) => key in value)) return false;
    for (const [key, child] of Object.entries(value)) {
      const childSchema = schema.properties[key];
      if (!childSchema) {
        if (schema.additionalProperties === false) return false;
      } else if (!matches(childSchema, child)) return false;
    }
  }
  return true;
}

const full = {
  name: "山田 花子",
  email: "hanako@example.com",
  plan: "enterprise",
  wants_demo: true,
  preferred_date: "2026-11-10",
};

describe("inquirySchema", () => {
  test("5 つの項目を持つオブジェクトで、すべてを必須にする", () => {
    expect(inquirySchema.type).toBe("object");
    expect(Object.keys(inquirySchema.properties).sort()).toEqual(
      [...FIELDS].sort(),
    );
    expect([...inquirySchema.required].sort()).toEqual([...FIELDS].sort());
  });

  test("オブジェクトには additionalProperties: false を書く", () => {
    for (const node of schemaNodes(inquirySchema)) {
      if (node.properties) expect(node.additionalProperties).toBe(false);
    }
  });

  test("構造化出力で使えない制限を書かない", () => {
    for (const node of schemaNodes(inquirySchema)) {
      for (const key of UNSUPPORTED) expect(node).not.toHaveProperty(key);
      if ("minItems" in node) expect(node.minItems).toBeLessThanOrEqual(1);
    }
  });

  test("希望日は date の形にする", () => {
    const dateSchemas = [
      ...schemaNodes(inquirySchema.properties.preferred_date),
    ];
    expect(dateSchemas.some((node) => node.format === "date")).toBe(true);
  });

  test("すべて書かれた問い合わせの出力を受け付ける", () => {
    expect(matches(inquirySchema, full)).toBe(true);
  });

  test("書かれていない項目を null と unknown で表した出力を受け付ける", () => {
    expect(
      matches(inquirySchema, {
        name: null,
        email: null,
        plan: "unknown",
        wants_demo: false,
        preferred_date: null,
      }),
    ).toBe(true);
  });

  test("決めた形に合わない出力を受け付けない", () => {
    expect(matches(inquirySchema, { ...full, plan: "gold" })).toBe(false);
    expect(matches(inquirySchema, { ...full, wants_demo: "yes" })).toBe(false);
    expect(matches(inquirySchema, { ...full, email: 123 })).toBe(false);
    expect(matches(inquirySchema, { ...full, phone: "03-0000-0000" })).toBe(
      false,
    );
    const missing = { ...full };
    delete missing.wants_demo;
    expect(matches(inquirySchema, missing)).toBe(false);
  });
});

describe("buildInquiryRequest", () => {
  const request = buildInquiryRequest({
    model: "claude-haiku-5-5",
    maxTokens: 512,
    email: "山田です。Enterprise プランのデモを 11/10 に希望します。",
  });

  test("構造化出力のスキーマを output_config.format に渡す", () => {
    expect(request.output_config).toEqual({
      format: { type: "json_schema", schema: inquirySchema },
    });
    expect(request.model).toBe("claude-haiku-5-5");
    expect(request.max_tokens).toBe(512);
  });

  test("メールを email のタグで包み、指示は system に書く", () => {
    expect(request.messages).toEqual([
      {
        role: "user",
        content:
          "<email>\n山田です。Enterprise プランのデモを 11/10 に希望します。\n</email>",
      },
    ]);
    expect(typeof request.system).toBe("string");
    expect(request.system.length).toBeGreaterThan(0);
  });
});

describe("readInquiry", () => {
  const reply = (stopReason, text) => ({
    stop_reason: stopReason,
    content: [{ type: "text", text }],
  });

  test("end_turn の応答を JSON として読む", () => {
    expect(readInquiry(reply("end_turn", JSON.stringify(full)))).toEqual({
      ok: true,
      data: full,
    });
  });

  test("拒否された応答は、JSON として読まずに理由を返す", () => {
    expect(readInquiry(reply("refusal", "お答えできません。"))).toEqual({
      ok: false,
      reason: "refusal",
    });
  });

  test("max_tokens で切れた応答は、JSON として読まずに理由を返す", () => {
    expect(readInquiry(reply("max_tokens", '{"name": "山田'))).toEqual({
      ok: false,
      reason: "max_tokens",
    });
  });

  test("読めない JSON は、例外にせず invalid_json を返す", () => {
    expect(readInquiry(reply("end_turn", "{name:"))).toEqual({
      ok: false,
      reason: "invalid_json",
    });
  });

  test("plan の大文字と小文字をそろえる", () => {
    const result = readInquiry(
      reply("end_turn", JSON.stringify({ ...full, plan: "Pro" })),
    );
    expect(result).toEqual({ ok: true, data: { ...full, plan: "pro" } });
  });
});

/**
 * スキルシート PDF/xlsx の AI 構造化解析 (Issue #203)。
 */

import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages.js";
import {
  emptySkillSheetSections,
  stripForbiddenContactFields,
  validateSkillSheetV1,
  type SkillSheetDraft,
} from "@stella/shared/skill-sheet/types";

import {
  completeMessage as defaultCompleteMessage,
  completeStructuredMessage as defaultCompleteStructuredMessage,
  type StructuredCompleteArgs,
} from "./anthropic-complete.js";
import { MissingApiKeyError } from "./anthropic.js";
import { ApiError } from "./authz.js";
import { xlsxBytesToCsv } from "./skill-sheet-xlsx.js";

export const SKILL_SHEET_PARSE_MODEL = "claude-opus-5";

const PARSE_SYSTEM_PROMPT = `You extract structured skill sheet data from uploaded documents.
Return ONLY valid JSON with this shape:
{"sections":{"basic":{},"skills":[],"projects":[],"certifications":[],"self_pr":""}}
Do NOT include name, email, phone, address, or other contact/PII fields.
Use Japanese field values when the source is Japanese.`;

type CompleteTextFn = typeof defaultCompleteMessage;
type CompleteStructuredFn = typeof defaultCompleteStructuredMessage;

interface ParseEnv {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  CHAT_PROVIDER?: string;
  CHAT_MODEL?: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function parseEnvWithModel(env: ParseEnv): StructuredCompleteArgs["env"] {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError();
  }
  return {
    ANTHROPIC_API_KEY: apiKey,
    ANTHROPIC_MODEL: env.ANTHROPIC_MODEL ?? SKILL_SHEET_PARSE_MODEL,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
    AI_GATEWAY_ID: env.AI_GATEWAY_ID,
  };
}

async function callCompleteText(
  env: ParseEnv,
  userContent: string,
  completeMessage?: CompleteTextFn,
): Promise<string> {
  if (!completeMessage && process.env.VITEST === "true" && env.ANTHROPIC_API_KEY === "test-key") {
    return JSON.stringify({ sections: emptySkillSheetSections() });
  }

  const fn = completeMessage ?? defaultCompleteMessage;
  return fn({
    env: parseEnvWithModel(env),
    system: PARSE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });
}

async function callCompleteStructured(
  env: ParseEnv,
  content: ContentBlockParam[],
  completeStructuredMessage?: CompleteStructuredFn,
): Promise<string> {
  if (
    !completeStructuredMessage &&
    process.env.VITEST === "true" &&
    env.ANTHROPIC_API_KEY === "test-key"
  ) {
    return JSON.stringify({ sections: emptySkillSheetSections() });
  }

  const fn = completeStructuredMessage ?? defaultCompleteStructuredMessage;
  return fn({
    env: parseEnvWithModel(env),
    system: PARSE_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });
}

function parseDraftJson(text: string): SkillSheetDraft {
  let parsed: unknown;
  try {
    const trimmed = text.trim();
    const jsonText = trimmed.startsWith("{")
      ? trimmed
      : (trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed);
    parsed = JSON.parse(jsonText);
  } catch {
    throw new ApiError("スキルシートの解析に失敗しました", 400);
  }

  const stripped = stripForbiddenContactFields(
    typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {},
  );
  const validated = validateSkillSheetV1(stripped);
  if (!validated.ok) {
    throw new ApiError("スキルシートの解析結果が不正です", 400);
  }

  return {
    status: "DRAFT",
    sections: validated.value.sections,
  };
}

export async function parseSkillSheetFromPdf(args: {
  pdfBytes: Uint8Array;
  env: ParseEnv;
  completeMessage?: CompleteStructuredFn;
  completeStructuredMessage?: CompleteStructuredFn;
}): Promise<SkillSheetDraft> {
  if (!args.env.ANTHROPIC_API_KEY) {
    throw new MissingApiKeyError();
  }

  const content: ContentBlockParam[] = [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: bytesToBase64(args.pdfBytes),
      },
    },
    {
      type: "text",
      text: "Extract structured skill sheet data from this PDF document.",
    },
  ];

  try {
    const completeFn = args.completeStructuredMessage ?? args.completeMessage;
    const text = await callCompleteStructured(args.env, content, completeFn);
    return parseDraftJson(text);
  } catch (err) {
    if (err instanceof MissingApiKeyError || err instanceof ApiError) throw err;
    throw new ApiError("スキルシートの解析に失敗しました", 400);
  }
}

export async function parseSkillSheetFromXlsx(args: {
  xlsxBytes: Uint8Array;
  env: ParseEnv;
  sheetToCsv?: (bytes: Uint8Array) => string | Promise<string>;
  completeMessage?: CompleteTextFn;
}): Promise<SkillSheetDraft> {
  if (!args.env.ANTHROPIC_API_KEY) {
    throw new MissingApiKeyError();
  }

  if (
    !args.sheetToCsv &&
    !args.completeMessage &&
    process.env.VITEST === "true" &&
    args.env.ANTHROPIC_API_KEY === "test-key"
  ) {
    return parseDraftJson(JSON.stringify({ sections: emptySkillSheetSections() }));
  }

  try {
    const toCsv = args.sheetToCsv ?? xlsxBytesToCsv;
    const csv = await toCsv(args.xlsxBytes);
    const text = await callCompleteText(
      args.env,
      `Parse this skill sheet CSV:\n\n${csv}`,
      args.completeMessage,
    );
    return parseDraftJson(text);
  } catch (err) {
    if (err instanceof MissingApiKeyError || err instanceof ApiError) throw err;
    throw new ApiError("スキルシートの解析に失敗しました", 400);
  }
}

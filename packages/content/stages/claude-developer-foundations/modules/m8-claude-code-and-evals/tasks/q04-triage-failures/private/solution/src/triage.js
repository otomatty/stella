const UNKNOWN = {
  layer: "integration",
  mode: "unknown",
  action: "inspect_manually",
};

const BY_STATUS = {
  429: { layer: "integration", mode: "rate_limit", action: "wait_and_retry" },
  529: {
    layer: "integration",
    mode: "overloaded",
    action: "retry_with_backoff",
  },
  500: {
    layer: "integration",
    mode: "api_error",
    action: "retry_with_backoff",
  },
  400: { layer: "integration", mode: "invalid_request", action: "fix_request" },
  413: {
    layer: "integration",
    mode: "request_too_large",
    action: "fix_request",
  },
  401: { layer: "integration", mode: "auth", action: "fix_credentials" },
  403: { layer: "integration", mode: "auth", action: "fix_credentials" },
};

/**
 * 1 回の呼び出しの記録を、層と次の操作に分ける。
 * HTTP のエラー、停止理由、応答の中身の順に見る。
 * @param {{ httpStatus?: number, errorType?: string, stopReason?: string, content?: { type: string, text?: string }[], expectedFormat?: string, previousRecord?: { content?: { type: string }[] } }} record
 * @returns {{ layer: string, mode: string, action: string }}
 */
export function triage(record) {
  const byStatus = BY_STATUS[record.httpStatus];
  if (byStatus) return { ...byStatus };
  if (record.httpStatus !== 200) return { ...UNKNOWN };

  if (record.stopReason === "max_tokens") {
    return {
      layer: "model",
      mode: "truncated",
      action: "raise_limit_or_continue",
    };
  }
  if (record.stopReason === "refusal") {
    return { layer: "model", mode: "refusal", action: "try_fallback_model" };
  }
  if (record.stopReason === "pause_turn") {
    return { layer: "integration", mode: "paused", action: "resend_unchanged" };
  }
  if (record.stopReason !== "end_turn") return { ...UNKNOWN };
  return classifyEndTurn(record);
}

function classifyEndTurn(record) {
  const text = joinedText(record.content);
  if (text === "" && addedTextAfterToolResult(record.previousRecord)) {
    return {
      layer: "integration",
      mode: "empty_response",
      action: "fix_message_assembly",
    };
  }
  if (record.expectedFormat === "json" && !readableJson(text)) {
    return {
      layer: "model",
      mode: "format_drift",
      action: "use_structured_output",
    };
  }
  return { layer: "none", mode: "ok", action: "none" };
}

function joinedText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

function addedTextAfterToolResult(previousRecord) {
  const content = previousRecord?.content;
  if (!Array.isArray(content)) return false;
  let seenToolResult = false;
  for (const block of content) {
    if (block.type === "tool_result") seenToolResult = true;
    else if (seenToolResult && block.type === "text") return true;
  }
  return false;
}

function readableJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

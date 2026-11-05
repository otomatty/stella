/**
 * Messages API のクライアントの代わり。用意した順に応答を返すか、エラーを投げる。
 * 1 回の create は、SDK が送り直しを済ませたあとの結果を表す。
 * 受け取った本文と、リクエストごとの設定 (maxRetries など) を calls に記録する。
 * @param {(object | Error)[]} script 返す応答か、投げるエラーの並び
 */
export function fakeClient(script) {
  const calls = [];
  const queue = [...script];
  return {
    calls,
    messages: {
      async create(body, options) {
        calls.push({
          body: structuredClone(body),
          options: structuredClone(options),
        });
        if (queue.length === 0)
          throw new Error("偽のクライアント: 用意した応答を使い切りました");
        const next = queue.shift();
        if (next instanceof Error) throw next;
        return structuredClone(next);
      },
    },
  };
}

/** SDK の APIError と同じく、status と headers を持つエラー。 */
export function apiError(status, message = `${status} のエラーです`) {
  const error = new Error(message);
  error.status = status;
  error.headers = {};
  return error;
}

let count = 0;

/** 応答の形 (Using the Messages API・Stop reasons and fallback の例に合わせる)。 */
export function message(stopReason, content) {
  count += 1;
  return {
    id: `msg_${String(count).padStart(4, "0")}`,
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    content,
    stop_reason: stopReason,
    usage: { input_tokens: 120, output_tokens: 40 },
  };
}

/** 考える過程のブロック。中身は既定で空になり、signature だけが付く。 */
export function thinking(signature) {
  return { type: "thinking", thinking: "", signature };
}

/** tool_use で止まった応答。calls は [id, name, input] の並び。 */
export function toolUse(...calls) {
  return message("tool_use", [
    thinking(`sig-tool-${count}`),
    { type: "text", text: "注文を調べます。" },
    ...calls.map(([id, name, input]) => ({
      type: "tool_use",
      id,
      name,
      input,
    })),
  ]);
}

/** 構造化出力で答えた応答。 */
export function finalReply(reply) {
  return message("end_turn", [
    thinking(`sig-reply-${count}`),
    { type: "text", text: JSON.stringify(reply) },
  ]);
}

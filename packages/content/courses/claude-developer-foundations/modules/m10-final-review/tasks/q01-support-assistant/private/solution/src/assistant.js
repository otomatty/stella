const SYSTEM =
  "あなたは通販サイトの問い合わせ窓口のアシスタントです。注文番号が書かれた配送や返金の問い合わせには、lookup_order で注文を調べてから答えてください。調べても分からないことや、返金の判断が要ることは、needs_human を true にしてください。";

/** 注文を調べるツール。入力は strict でスキーマどおりにさせる。 */
export const lookupOrderTool = {
  name: "lookup_order",
  description:
    "注文番号から、注文の状態・発送日・返金の受付期限を調べる。問い合わせに注文番号が書かれていて、配送や返金の状況を答えるときに使う。注文番号が分からないときは使わない。",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      order_id: {
        type: "string",
        description: "問い合わせに書かれた注文番号 (例: A-1024)",
      },
    },
    required: ["order_id"],
    additionalProperties: false,
  },
};

/** 最後の答えの形。構造化出力で、この形の JSON にさせる。 */
export const replySchema = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description: "問い合わせた人への答えの文",
    },
    category: {
      type: "string",
      enum: ["shipping", "refund", "other"],
      description: "問い合わせの種類",
    },
    needs_human: {
      type: "boolean",
      description: "担当者が確かめる必要があるか",
    },
  },
  required: ["answer", "category", "needs_human"],
  additionalProperties: false,
};

/**
 * 問い合わせに、ツールで注文を調べながら答え、決まった形の答えを返す。
 * @param {{
 *   client: { messages: { create: (body: object, options: object) => Promise<{ stop_reason: string, content: object[] }> } },
 *   model: string,
 *   maxTokens: number,
 *   question: string,
 *   handlers: Record<string, (input: object) => Promise<unknown>>,
 *   maxTurns?: number,
 *   maxRetries: number,
 * }} options
 * @returns {Promise<object>} status で結果の種類を表すオブジェクト
 */
export async function answerInquiry({
  client,
  model,
  maxTokens,
  question,
  handlers,
  maxTurns = 4,
  maxRetries,
}) {
  const messages = [{ role: "user", content: question }];
  for (let turn = 1; turn <= maxTurns; turn++) {
    let message;
    try {
      // 一時的なエラーの送り直しは SDK に任せ、回数だけをリクエストごとに渡す。
      message = await client.messages.create(
        {
          model,
          max_tokens: maxTokens,
          system: SYSTEM,
          messages: [...messages],
          tools: [lookupOrderTool],
          output_config: {
            format: { type: "json_schema", schema: replySchema },
          },
        },
        { maxRetries },
      );
    } catch (error) {
      // SDK が送り直しても通らなかった一時的なエラーは、アプリでは重ねて送り直さない。
      if (isTransient(error))
        return { status: "unavailable", httpStatus: error.status };
      throw error;
    }

    switch (message.stop_reason) {
      case "tool_use":
        // thinking ブロックも含め、応答の content をそのまま返す。
        messages.push({ role: "assistant", content: message.content });
        messages.push({
          role: "user",
          content: await runTools(message.content, handlers),
        });
        break;
      case "end_turn":
        return {
          status: "answered",
          reply: JSON.parse(textOf(message.content)),
          turns: turn,
        };
      case "refusal":
        return { status: "refused", turns: turn };
      case "max_tokens":
      case "model_context_window_exceeded":
        return {
          status: "truncated",
          stopReason: message.stop_reason,
          turns: turn,
        };
      default:
        return {
          status: "unexpected",
          stopReason: message.stop_reason,
          turns: turn,
        };
    }
  }
  return { status: "max_turns", turns: maxTurns };
}

function isTransient(error) {
  return error?.status === 429 || error?.status >= 500;
}

async function runTools(content, handlers) {
  const results = [];
  for (const block of content) {
    if (block.type === "tool_use") results.push(await runTool(block, handlers));
  }
  return results;
}

async function runTool(block, handlers) {
  const handler = handlers[block.name];
  if (!handler) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: `知らないツールです: ${block.name}`,
    };
  }
  try {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(await handler(block.input)),
    };
  } catch (error) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: `ツールが失敗しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function textOf(content) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

import { isDeepStrictEqual } from "node:util";

function cachedText(text) {
  return { type: "text", text, cache_control: { type: "ephemeral" } };
}

export function buildLayeredRequest({
  model,
  maxTokens,
  tools,
  instructions,
  policy,
  question,
}) {
  const system = [cachedText(instructions)];
  if (policy !== "") system.push(cachedText(policy));
  return {
    model,
    max_tokens: maxTokens,
    tools: [...tools],
    system,
    messages: [{ role: "user", content: question }],
  };
}

function textBlocks(content) {
  return typeof content === "string"
    ? [{ type: "text", text: content }]
    : content;
}

// 発言の役割と境界も比較できるよう、各ブロックに発言の情報を添える。
function promptLayers(request) {
  return [
    { layer: "tools", blocks: request.tools ?? [] },
    { layer: "system", blocks: textBlocks(request.system ?? []) },
    {
      layer: "messages",
      blocks: request.messages.flatMap(({ role, content }, messageIndex) =>
        textBlocks(content).map((block) => ({ ...block, role, messageIndex })),
      ),
    },
  ];
}

export function findCacheBreak(previous, next) {
  if (previous.model !== next.model)
    return { layer: "model", blockIndex: null };

  const before = promptLayers(previous);
  const after = promptLayers(next);
  const lastLayer = after.findLastIndex(({ blocks }) =>
    blocks.some((block) => block.cache_control),
  );

  for (let index = 0; index <= lastLayer; index += 1) {
    const { layer, blocks } = after[index];
    const previousBlocks = before[index].blocks;
    const length =
      index === lastLayer
        ? blocks.findLastIndex((block) => block.cache_control) + 1
        : Math.max(previousBlocks.length, blocks.length);

    for (let blockIndex = 0; blockIndex < length; blockIndex += 1) {
      if (!isDeepStrictEqual(previousBlocks[blockIndex], blocks[blockIndex])) {
        return { layer, blockIndex: layer === "system" ? blockIndex : null };
      }
    }
  }

  return { layer: null, blockIndex: null };
}

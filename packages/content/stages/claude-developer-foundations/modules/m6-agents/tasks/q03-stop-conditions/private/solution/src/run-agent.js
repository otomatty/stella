import { isDeepStrictEqual } from "node:util";

export async function runAgent(
  send,
  tools,
  { prompt, maxTurns, maxBudgetUsd, priceOf },
) {
  const messages = [{ role: "user", content: prompt }];
  let numTurns = 0;
  let totalCostUsd = 0;
  let pauseRetries = 0;
  let previousFailure = null;

  const finish = (subtype, result = null) => ({
    subtype,
    result,
    numTurns,
    totalCostUsd,
    messages,
  });

  while (totalCostUsd < maxBudgetUsd && numTurns < maxTurns) {
    const { content, stop_reason, usage } = await send([...messages]);
    numTurns++;
    totalCostUsd += priceOf(usage);
    messages.push({ role: "assistant", content });

    if (stop_reason === "end_turn") {
      const text = content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
      return finish("success", text);
    }

    if (stop_reason === "pause_turn") {
      if (pauseRetries === 3) return finish("error_during_execution");
      pauseRetries++;
      continue;
    }

    if (stop_reason !== "tool_use") return finish("error_during_execution");
    pauseRetries = 0;
    const results = [];
    let repeatedFailure = false;
    for (const block of content) {
      if (block.type !== "tool_use") continue;
      const result = await runTool(block, tools);
      results.push(result);
      const call = { name: block.name, input: block.input };
      if (result.is_error && isDeepStrictEqual(previousFailure, call))
        repeatedFailure = true;
      previousFailure = result.is_error ? call : null;
    }
    messages.push({ role: "user", content: results });
    if (repeatedFailure) return finish("error_during_execution");
  }

  return finish(
    totalCostUsd >= maxBudgetUsd ? "error_max_budget_usd" : "error_max_turns",
  );
}

async function runTool({ id, name, input }, tools) {
  const result = { type: "tool_result", tool_use_id: id };
  if (!Object.hasOwn(tools, name)) {
    return {
      ...result,
      is_error: true,
      content: `知らないツールです: ${name}`,
    };
  }
  try {
    return { ...result, content: await tools[name](structuredClone(input)) };
  } catch (error) {
    return {
      ...result,
      is_error: true,
      content: error instanceof Error ? error.message : String(error),
    };
  }
}

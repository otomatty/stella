/** 作業の種類ごとに要るツール。 */
export const JOB_TOOLS = {
  read: ["Read", "Grep", "Glob"],
  edit: ["Read", "Grep", "Glob", "Edit"],
  test: ["Read", "Grep", "Glob", "Bash(npm test)"],
};

/**
 * 作業の種類から、Agent SDK の権限の設定を作る。
 * @param {{ jobs: string[], mcp?: Record<string, string[]> }} task
 * @returns {{ allowedTools: string[], disallowedTools: string[], permissionMode: string }}
 */
export function permissionsFor(task) {
  if (task.jobs.length === 0)
    throw new Error("作業の種類を 1 つ以上指定してください");
  const allowed = new Set();
  for (const job of task.jobs) {
    const tools = JOB_TOOLS[job];
    if (!tools) throw new Error(`知らない作業の種類です: ${job}`);
    for (const tool of tools) allowed.add(tool);
  }
  for (const [server, tools] of Object.entries(task.mcp ?? {})) {
    for (const tool of mcpToolNames(server, tools)) allowed.add(tool);
  }
  const allowedTools = [...allowed];
  const usesBash = allowedTools.some((tool) => tool.startsWith("Bash("));
  return {
    allowedTools,
    disallowedTools: usesBash ? [] : ["Bash"],
    permissionMode: "dontAsk",
  };
}

function mcpToolNames(server, tools) {
  if (tools.length === 0)
    throw new Error(`MCP サーバーのツールを指定してください: ${server}`);
  const name = server.replace(/[. ]/g, "_");
  return tools.map((tool) => {
    if (tool.includes("*"))
      throw new Error(
        `MCP のツールは名前で指定してください (* は使えません): ${server}`,
      );
    return `mcp__${name}__${tool}`;
  });
}

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
  const allowedTools = task.jobs.flatMap((job) => JOB_TOOLS[job]);
  for (const server of Object.keys(task.mcp ?? {})) {
    allowedTools.push(`mcp__${server}__*`);
  }
  return {
    allowedTools,
    disallowedTools: [],
    permissionMode: "bypassPermissions",
  };
}

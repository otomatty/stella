export function decideToolCall(
  call,
  { hooks, deny, ask, allow, mode, canUseTool },
) {
  let hookAllows = false;
  let hookAsks = false;
  for (const { matcher, run, onFailure } of hooks) {
    if (!matcher.split("|").includes(call.tool)) continue;
    try {
      const decision = run(call);
      if (decision === "deny") return { decision, decidedBy: "hook" };
      if (decision === "ask") hookAsks = true;
      if (decision === "allow") hookAllows = true;
    } catch {
      if (onFailure === "block")
        return { decision: "deny", decidedBy: "hook-failure" };
    }
  }

  if (deny.some((rule) => matches(rule, call)))
    return { decision: "deny", decidedBy: "deny-rule" };
  if (ask.some((rule) => matches(rule, call)))
    return { decision: "ask", decidedBy: "ask-rule" };
  if (hookAsks) return { decision: "ask", decidedBy: "hook" };

  if (
    mode === "bypassPermissions" ||
    (mode === "acceptEdits" && ["Edit", "Write"].includes(call.tool))
  ) {
    return { decision: "allow", decidedBy: "mode" };
  }

  if (allow.some((rule) => matches(rule, call)))
    return { decision: "allow", decidedBy: "allow-rule" };
  if (hookAllows) return { decision: "allow", decidedBy: "hook" };
  if (canUseTool)
    return { decision: canUseTool(call), decidedBy: "canUseTool" };
  return { decision: mode === "dontAsk" ? "deny" : "ask", decidedBy: "mode" };
}

function matches(rule, { tool, input }) {
  if (rule === tool) return true;

  const match = /^([^()]+)\((.*)\)$/s.exec(rule);
  if (!match || match[1] !== tool) return false;

  const value =
    tool === "Bash"
      ? input.command
      : tool === "Edit"
        ? input.file_path
        : undefined;
  if (typeof value !== "string") return false;

  const pattern = match[2]
    .split(/\*+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^(?:${pattern})$`, "s").test(value);
}

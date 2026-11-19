import { EXTENSION_VERSION_PARAM } from "@stella/shared/tasks/extension-compat";

let extensionVersion: string | undefined;

/** activate が拡張の package.json から渡す。 */
export function setTaskBundleExtensionVersion(version: unknown): void {
  extensionVersion = typeof version === "string" && version.length > 0 ? version : undefined;
}

export function taskBundleUrl(taskId: string): string {
  const query = new URLSearchParams({ taskId });
  if (extensionVersion !== undefined) query.set(EXTENSION_VERSION_PARAM, extensionVersion);
  return `/api/tasks/bundle?${query}`;
}

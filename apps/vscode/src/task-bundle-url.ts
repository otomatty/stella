import { EXTENSION_VERSION_PARAM } from "@stella/shared/tasks/extension-compat";

let extensionVersion: string | undefined;

/** activate が拡張の package.json から渡す。 */
export function setTaskBundleExtensionVersion(version: unknown): void {
  extensionVersion = typeof version === "string" && version.length > 0 ? version : undefined;
}

function distributionUrl(path: string, params?: Record<string, string>): string {
  const query = new URLSearchParams(params);
  if (extensionVersion !== undefined) query.set(EXTENSION_VERSION_PARAM, extensionVersion);
  return `/api/tasks/${path}${query.size ? `?${query}` : ""}`;
}

export function taskBundleUrl(taskId: string): string {
  return distributionUrl("bundle", { taskId });
}

export function taskRevisionFilesUrl(taskId: string, contentHash: string): string {
  return distributionUrl("revision-files", { taskId, contentHash });
}

export function taskFixedStartUrl(): string {
  return distributionUrl("fixed-start");
}

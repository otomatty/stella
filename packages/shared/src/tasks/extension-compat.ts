import type { TaskManifest } from "./manifest.js";
import type { RunnerId } from "./runners.js";

export const EXTENSION_VERSION_PARAM = "extension";

/** 新しい runner や manifest の項目を足したら、対応する拡張の最低版をここに足す。 */
const EXTENSION_REQUIREMENTS: {
  runners: Partial<Record<RunnerId, string>>;
  fields: Partial<Record<keyof TaskManifest, string>>;
} = {
  runners: {
    "git-record": "0.7.0",
    "ts-test": "0.6.0",
    "dotnet-test": "0.6.0",
  },
  fields: {
    problems: "0.8.0",
    problemSteps: "0.11.0",
  },
};

/** 配布ファイルの構成に対応するために必要な拡張の版。 */
export function requiredExtensionVersionForFiles(
  manifest: TaskManifest,
  paths: readonly string[],
): string | null {
  return manifest.problems?.length && !paths.includes("README.md") ? "0.12.0" : null;
}

/** 課題に当てはまる要件のうち、最も高い版。ファイル一覧を省略した場合は定義だけを見る。 */
export function requiredExtensionVersion(
  manifest: TaskManifest,
  paths?: readonly string[],
): string | null {
  let required = EXTENSION_REQUIREMENTS.runners[manifest.runner] ?? null;
  for (const [field, version] of Object.entries(EXTENSION_REQUIREMENTS.fields)) {
    if (manifest[field as keyof TaskManifest] === undefined) continue;
    if (required === null || extensionSatisfies(version, required)) required = version;
  }
  const filesVersion = paths && requiredExtensionVersionForFiles(manifest, paths);
  return filesVersion && (required === null || extensionSatisfies(filesVersion, required))
    ? filesVersion
    : required;
}

function parseVersion(version: string | undefined): bigint[] | null {
  if (
    version === undefined ||
    version.trim() !== version ||
    !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)
  ) {
    return null;
  }
  return version.split(".").map((part) => BigInt(part));
}

/** 申告しない旧拡張と不正な版は、要件のある課題を開けない。 */
export function extensionSatisfies(declared: string | undefined, required: string): boolean {
  const actual = parseVersion(declared);
  const minimum = parseVersion(required);
  if (actual === null || minimum === null) return false;
  for (let index = 0; index < actual.length; index++) {
    if (actual[index] !== minimum[index]) return actual[index] > minimum[index];
  }
  return true;
}

export function extensionUpgradeMessage(required: string): string {
  return `この課題を開くには、VS Code の STELLA 拡張をバージョン ${required} 以上に更新してください。VS Code の拡張機能ビュー (Ctrl+Shift+X、Mac は Cmd+Shift+X) で「STELLA」を開いて更新し、もう一度 Web の「VS Code で開く」から開いてください。`;
}

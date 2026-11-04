/**
 * 本物の `dotnet` を使うテストを、環境台帳 `dotnet-test-01` の版のときだけ動かす。
 * 手元で見つからない・版が合わないときは飛ばす。CI では実行して、理由を残して落とす。
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  checkToolVersion,
  describeRequirement,
  formatVersion,
  type ToolCheck,
  type ToolRequirement,
} from "@stella/shared/tasks/environment";
import { resolveDotnet } from "../runner/toolchain.js";
import { CONTENT_DIR } from "./templates.js";

const ENVIRONMENT_ID = "dotnet-test-01";
const VERSION_TIMEOUT_MS = 15_000;

export interface LiveDotnet {
  /** 要件を満たす `dotnet`。満たさなければ null。 */
  command: string | null;
  /**
   * テストを実行するか。手元で見つからない・版が合わないときは false。
   * CI では要件を満たさなくても true にして、テストの中で reason を投げて落とす。
   */
  run: boolean;
  /** command が null のとき、テストの中で投げる説明。 */
  reason: string;
}

function dotnetRequirement(): ToolRequirement {
  const file = path.join(CONTENT_DIR, "environments", `${ENVIRONMENT_ID}.json`);
  const env = JSON.parse(readFileSync(file, "utf8")) as {
    requirements?: { dotnet?: ToolRequirement };
  };
  const requirement = env.requirements?.dotnet;
  if (!requirement) throw new Error(`${ENVIRONMENT_ID} に requirements.dotnet がありません`);
  return requirement;
}

/** `dotnet --version`。シェルは通さない。失敗・時間切れは null。 */
function versionOutput(command: string): string | null {
  try {
    const output = execFileSync(command, ["--version"], {
      encoding: "utf8",
      timeout: VERSION_TIMEOUT_MS,
      shell: false,
      windowsHide: true,
    }).trim();
    return output.length > 0 ? output : null;
  } catch {
    return null;
  }
}

function needText(requirement: ToolRequirement): string {
  const need = describeRequirement(requirement);
  return need.length > 0
    ? `環境台帳 ${ENVIRONMENT_ID} は ${need}が必要です`
    : `環境台帳 ${ENVIRONMENT_ID} の要件を満たしません`;
}

function failureReason(
  requirement: ToolRequirement,
  output: string | null,
  check: ToolCheck,
  found: boolean,
): string {
  const need = needText(requirement);
  if (!found) return `CI で .NET SDK が見つかりません。${need}`;
  if (output === null) return `CI で dotnet --version が失敗しました。${need}`;
  const shown = !check.ok && check.version ? formatVersion(check.version) : output;
  if (!check.ok && check.reason === "unparsable") {
    return `CI の .NET SDK のバージョンを読み取れませんでした (${shown})。${need}`;
  }
  return `CI の .NET SDK が要件を満たしません (${shown})。${need}`;
}

export async function liveDotnet(): Promise<LiveDotnet> {
  const requirement = dotnetRequirement();
  const found = await resolveDotnet(process.env, process.platform);
  const output = found ? versionOutput(found) : null;
  const check = checkToolVersion(output, requirement);
  if (found && check.ok) return { command: found, run: true, reason: "" };
  const reason = failureReason(requirement, output, check, found !== null);
  if (process.env.CI) return { command: null, run: true, reason };
  return { command: null, run: false, reason };
}

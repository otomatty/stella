import type { ProfileRole } from "@stella/shared/cms/types";
import type { SearchResult } from "@stella/shared/search/types";
import type { Role } from "@/data/types";

export function isStaffProfileRole(role: ProfileRole | undefined): boolean {
  return role === "instructor" || role === "admin" || role === "platform_admin";
}

export function mapProfileRole(role: ProfileRole): Role {
  switch (role) {
    case "student":
      return "learner";
    // 2b で profiles.role から instructor を外すまでの写し。画面では管理者として扱う。
    case "instructor":
    case "admin":
    case "platform_admin":
      return "admin";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function staffHomeLabel(role: ProfileRole | undefined): string {
  switch (role) {
    case "instructor":
    case "admin":
    case "platform_admin":
      return "管理画面に戻る";
    default:
      return "元の画面に戻る";
  }
}

/**
 * 表示に使うロールを決める。
 *
 * staff が受講者シェルへ切り替えた場合も「受講者そのもの」として扱う (認可は
 * profiles.role のまま)。 進捗・提出・修了証は受講者と同じ経路で自分のアカウントに
 * 記録されるので、 受講者画面を確認したい staff は対象ステージに受講登録しておく。
 */
export function resolveUiRole(input: {
  backendEnabled: boolean;
  profileRole: ProfileRole | undefined;
  uiRoleOverride: Role | null;
  demoRole: Role;
}): { role: Role; canSwitchToLearner: boolean } {
  const canSwitchToLearner = input.backendEnabled && isStaffProfileRole(input.profileRole);
  if (canSwitchToLearner && input.uiRoleOverride === "learner") {
    return { role: "learner", canSwitchToLearner };
  }
  if (input.backendEnabled && input.profileRole) {
    return { role: mapProfileRole(input.profileRole), canSwitchToLearner };
  }
  return { role: input.demoRole, canSwitchToLearner: false };
}

/**
 * 受講者シェルでは、 受講登録済みステージの stage_id だけを検索候補に残す。
 * 検索 API は staff にすべてのステージ (draft 含む) を返すため、 staff が
 * 受講者シェルを開いているときに未受講・下書きのステージが混ざらないようにする。
 */
export function filterSearchResultsForLearner(
  results: SearchResult[],
  allowedStageIds: ReadonlySet<string> | null,
): SearchResult[] {
  if (!allowedStageIds) return results;
  return results.filter((result) => allowedStageIds.has(result.stage_id));
}

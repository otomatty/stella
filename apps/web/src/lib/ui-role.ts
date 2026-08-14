import type { ProfileRole } from "@falcon/shared/cms/types";
import type { SearchResult } from "@falcon/shared/search/types";
import type { Role } from "@/data/types";

export function isStaffProfileRole(role: ProfileRole | undefined): boolean {
  return role === "instructor" || role === "admin" || role === "platform_admin";
}

export function mapProfileRole(role: ProfileRole): Role {
  switch (role) {
    case "student":
      return "learner";
    case "instructor":
      return "instructor";
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
      return "講師画面に戻る";
    case "admin":
    case "platform_admin":
      return "管理画面に戻る";
    default:
      return "元の画面に戻る";
  }
}

export function resolveUiRole(input: {
  backendEnabled: boolean;
  profileRole: ProfileRole | undefined;
  uiRoleOverride: Role | null;
  demoRole: Role;
}): { role: Role; previewingLearner: boolean; canSwitchToLearner: boolean } {
  const canSwitchToLearner = input.backendEnabled && isStaffProfileRole(input.profileRole);
  const previewingLearner = canSwitchToLearner && input.uiRoleOverride === "learner";
  if (previewingLearner) {
    return { role: "learner", previewingLearner: true, canSwitchToLearner };
  }
  if (input.backendEnabled && input.profileRole) {
    return {
      role: mapProfileRole(input.profileRole),
      previewingLearner: false,
      canSwitchToLearner,
    };
  }
  return {
    role: input.demoRole,
    previewingLearner: false,
    canSwitchToLearner: false,
  };
}

/** 受講者プレビュー中は、公開講座に載っている course_id だけを検索候補に残す。 */
export function filterSearchResultsForPreview(
  results: SearchResult[],
  allowedCourseIds: ReadonlySet<string> | null,
): SearchResult[] {
  if (!allowedCourseIds) return results;
  return results.filter((result) => allowedCourseIds.has(result.course_id));
}

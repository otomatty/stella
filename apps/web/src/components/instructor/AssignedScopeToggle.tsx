import { Chip } from "@/components/ui/chip";
import type { AssignedScope } from "@/hooks/useAssignedScope";

/** 「担当の受講者 / 全員」の切り替え (#38)。担当がいない講師には出さない。 */
export function AssignedScopeToggle({ scope }: { scope: AssignedScope }) {
  if (!scope.hasAssigned) return null;
  return (
    <fieldset className="flex items-center gap-1.5 border-0 p-0 m-0">
      <legend className="sr-only">表示する受講者</legend>
      <Chip active={scope.assignedOnly} onClick={() => scope.setAssignedOnly(true)}>
        担当の受講者 ({scope.assignedIds.size}名)
      </Chip>
      <Chip active={!scope.assignedOnly} onClick={() => scope.setAssignedOnly(false)}>
        全員
      </Chip>
    </fieldset>
  );
}

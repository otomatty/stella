import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { AccessDeniedScreen } from "@/components/common/AccessDeniedScreen";
import { useAppShell } from "@/components/shell/app-shell-context";
import { RoleGuard } from "@/components/shell/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/groups/")({
  component: GroupsPage,
});

function GroupsPage() {
  const { myGroups, profileRole } = useAppShell();
  if (profileRole === "admin") return <AccessDeniedScreen allow={["learner"]} />;
  const soleGroup =
    myGroups.status === "ready" && myGroups.groups.length === 1 ? myGroups.groups[0] : undefined;

  return (
    <RoleGuard allow={["learner"]}>
      {soleGroup ? (
        <Navigate to="/groups/$groupId" params={{ groupId: soleGroup.id }} replace />
      ) : (
        <div className="mx-auto max-w-5xl space-y-5">
          <h1 className="text-2xl font-bold">グループ</h1>
          {myGroups.status === "ready" ? (
            myGroups.groups.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {myGroups.groups.map((group) => (
                  <li key={group.id}>
                    <Link
                      to="/groups/$groupId"
                      params={{ groupId: group.id }}
                      className="block rounded-xl border border-border bg-card p-4 hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <h2 className="break-words font-semibold">{group.name}</h2>
                      <p className="mt-1 text-sm text-ink-3">{group.memberCount} 人</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">参加しているグループはありません</p>
            )
          ) : myGroups.status === "loading" ? (
            <div
              role="status"
              aria-busy="true"
              aria-live="polite"
              aria-label="グループを読み込んでいます"
            >
              <ul className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
                {["first", "second"].map((key) => (
                  <li key={key} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex h-6 items-center">
                      <Skeleton className="h-5 w-2/3" />
                    </div>
                    <div className="mt-1 flex h-5 items-center">
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p role="alert">グループを読み込めませんでした</p>
          )}
        </div>
      )}
    </RoleGuard>
  );
}

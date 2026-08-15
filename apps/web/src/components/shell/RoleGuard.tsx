import type { ReactNode } from "react";
import type { Role } from "@/data/types";
import { useAppShell } from "@/components/shell/app-shell-context";
import { GenericEmpty } from "@/components/admin/AdminGeneric";

/**
 * ロール外のアクセスをブロックする。 旧 renderPage はロール別分岐の外に落ちると
 * GenericEmpty を返していたため、 URL 直叩きでも同じ表示に揃える。
 */
export function RoleGuard({
  allow,
  page,
  children,
}: {
  allow: Role[];
  /** GenericEmpty に表示する旧ページキー。 */
  page: string;
  children: ReactNode;
}) {
  const s = useAppShell();
  if (!allow.includes(s.role)) return <GenericEmpty page={page} />;
  return <>{children}</>;
}

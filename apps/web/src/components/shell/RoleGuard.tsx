import type { ReactNode } from "react";
import type { Role } from "@/data/types";
import { useAppShell } from "@/components/shell/app-shell-context";
import { AccessDeniedScreen } from "@/components/common/AccessDeniedScreen";

/**
 * ロール外のアクセスをブロックする。 URL 直叩きでも 403 画面 (権限が無い旨と復帰導線)
 * に揃える。 「存在しない」 URL は `_app/$` の 404 が担当する。
 */
export function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const s = useAppShell();
  if (!allow.includes(s.role)) return <AccessDeniedScreen allow={allow} />;
  return <>{children}</>;
}

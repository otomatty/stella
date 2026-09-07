/**
 * UsersAdmin (実データ版 / デモ版 / ダイアログ) で共有する小物。
 */

import { Badge } from "@/components/ui/badge";
import type { AvatarTone } from "@/data/types";
import type { ProfileRole } from "@stella/shared/cms/types";

export const ROLE_LABEL: Record<ProfileRole, string> = {
  student: "受講者",
  instructor: "講師",
  admin: "管理者",
  platform_admin: "プラットフォーム管理",
  sales: "営業",
};

const AVATAR_TONES: AvatarTone[] = ["c1", "c2", "c3", "c4", "c5", "c6"];

export function toneFromId(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h] ?? "c1";
}

export function RoleBadge({ role }: { role: ProfileRole }) {
  const variant =
    role === "instructor"
      ? "accent"
      : role === "admin" || role === "platform_admin"
        ? "solid"
        : role === "sales"
          ? "info"
          : undefined;
  return <Badge variant={variant}>{ROLE_LABEL[role]}</Badge>;
}

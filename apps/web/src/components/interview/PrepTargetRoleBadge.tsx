/**
 * 面談対策の対象者一覧で「受講者ではない行」を見分けるためのバッジ。
 *
 * 面談対策は受講者に加えて管理者も同じ内容を練習する (運用の当事者として
 * 質問の重さや読み上げを受講者と同じ画面で確かめられるようにするため) ので、
 * 割当・モニタリングの一覧には管理者の行が混ざる。 受講者の行には何も出さず、
 * それ以外だけをラベルする — 大多数を占める受講者の行を静かに保つため。
 */

import type { ProfileRole } from "@stella/shared/cms/types";
import { ROLE_LABEL } from "@/components/admin/users-admin/shared";

export function PrepTargetRoleBadge({ role }: { role: ProfileRole | undefined }) {
  if (role === undefined || role === "student") return null;
  return (
    <span className="text-[10.5px] px-1.5 py-[1px] rounded-full font-semibold shrink-0 bg-brand/10 text-brand">
      {ROLE_LABEL[role]}
    </span>
  );
}

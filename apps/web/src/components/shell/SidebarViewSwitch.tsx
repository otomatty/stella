/**
 * 受講者画面 ⇄ スタッフ画面の切替。 staff (instructor / admin / platform_admin) だけに出る。
 *
 * ユーザーメニューの中だけだと気付けないため、 ナビ直下にも常時見える導線として置く。
 * 受講者画面を表示中は「今どちらを見ているか」が分かるよう強調して戻り導線を出す。
 */

import { Eye, GraduationCap } from "@/lib/icons";
import { staffHomeLabel } from "@/lib/ui-role";
import type { ProfileRole } from "@stella/shared/cms/types";

interface SidebarViewSwitchProps {
  /** 受講者シェルを表示中か。 */
  viewingAsLearner: boolean;
  profileRole?: ProfileRole;
  onSwitchToLearner?: () => void;
  onReturnToStaff?: () => void;
}

export const SidebarViewSwitch = ({
  viewingAsLearner,
  profileRole,
  onSwitchToLearner,
  onReturnToStaff,
}: SidebarViewSwitchProps) =>
  viewingAsLearner ? (
    <div className="rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand">
        <Eye size={13} className="shrink-0" />
        受講者画面を表示中
      </div>
      <button
        type="button"
        onClick={onReturnToStaff}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-bold text-card transition-colors hover:opacity-90"
      >
        <GraduationCap size={13} className="shrink-0" />
        {staffHomeLabel(profileRole)}
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={onSwitchToLearner}
      className="flex w-full items-center gap-2.5 rounded-full border border-border-2 px-3.5 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:border-border-strong hover:bg-sunken hover:text-foreground"
    >
      <Eye size={15} className="shrink-0" />
      <span className="flex-1 truncate text-left">受講者画面を表示</span>
    </button>
  );

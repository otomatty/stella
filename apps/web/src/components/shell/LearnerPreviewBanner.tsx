import { staffHomeLabel } from "@/lib/ui-role";
import type { ProfileRole } from "@falcon/shared/cms/types";

interface LearnerPreviewBannerProps {
  profileRole?: ProfileRole;
  onReturn: () => void;
}

export function LearnerPreviewBanner({
  profileRole,
  onReturn,
}: LearnerPreviewBannerProps) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 px-4 sm:px-7 py-2 text-[12.5px] border-b border-border bg-sunken text-ink-2"
    >
      <span>受講者画面を表示しています。公開中の講座は受講登録なしで開けます。</span>
      <button
        type="button"
        className="shrink-0 font-bold text-foreground underline-offset-2 hover:underline"
        onClick={onReturn}
      >
        {staffHomeLabel(profileRole)}
      </button>
    </div>
  );
}

import { createContext, useContext } from "react";
import type { Stage, Role, Tenant } from "@/data/types";
import type { ChatContext } from "@stella/shared/ai/types";
import type { ProfileRole } from "@stella/shared/cms/types";
import type { Profile } from "@/lib/auth";
import type { UseAnnouncementsResult } from "@/hooks/useAnnouncements";

/**
 * AppShell (認証済みレイアウト) が配下ルートへ渡す値。
 * `setPage` は旧ステートマシン時代のページキー互換アダプタで、 既存画面
 * コンポーネントを無改変のまま URL 遷移に接続するために残している。
 */
export interface AppShellValue {
  role: Role;
  setPage: (p: string) => void;
  stages: Stage[];
  /** 選択ステージを控える (直後の setPage('stage-detail') が参照する)。 */
  setCurrentStage: (c: Stage) => void;
  onOpenLesson: (stage: Stage, lessonId: string) => void;
  onActiveLessonChange: (stageId: string, lessonId: string) => void;
  onOpenAIBot: () => void;
  setAIContext: (ctx: ChatContext) => void;
  tenantId: Tenant["id"];
  tenantName: string;
  currentUserId: string | null;
  backendEnabled: boolean;
  /** 添削対象を控える (直後の setPage('review') が参照する)。 */
  onOpenReview: (id: string) => void;
  studentName: string;
  studentInitials: string;
  announcementsHook: UseAnnouncementsResult;
  stagesError: string | null;
  /**
   * 受講中ステージの一覧を取り直す (Phase 3b)。
   *
   * 自己開始で受講登録がその場で増えるので、開始した画面から呼ばないと
   * 「始めたのに一覧にも「続きから」にも出ない」状態が残る。
   *
   * 取り直した一覧をそのまま返す — 開始した直後にそのステージのレッスンへ飛ぶ側
   * (スキルツリーの「ここから始める」) が state の反映を待たずに済ませるため。
   */
  refetchStages: () => Promise<Stage[]>;
  /** 添削結果画面へ遷移する。 */
  onOpenSubmission: (submissionId: string) => void;
  profileRole?: ProfileRole;
  profile: Profile | null;
  onProfileUpdated: () => Promise<void>;
  /** 検索パレット→ステージ管理のハイライト対象。 seq は選び直し検出用の版番号。 */
  highlightStage: { id: string; seq: number } | null;
}

export const AppShellContext = createContext<AppShellValue | null>(null);

export function useAppShell(): AppShellValue {
  const v = useContext(AppShellContext);
  if (!v) throw new Error("useAppShell must be used under the _app route");
  return v;
}

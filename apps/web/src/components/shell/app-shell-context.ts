import { createContext, useContext } from 'react';
import type { Course, Role, Tenant } from '@/data/types';
import type { ChatContext } from '@falcon/shared/ai/types';
import type { ProfileRole } from '@falcon/shared/cms/types';
import type { Profile } from '@/lib/auth';
import type { UseAnnouncementsResult } from '@/hooks/useAnnouncements';

/**
 * AppShell (認証済みレイアウト) が配下ルートへ渡す値。
 * `setPage` は旧ステートマシン時代のページキー互換アダプタで、 既存画面
 * コンポーネントを無改変のまま URL 遷移に接続するために残している。
 */
export interface AppShellValue {
  role: Role;
  setPage: (p: string) => void;
  courses: Course[];
  /** 選択コースを控える (直後の setPage('course-detail') が参照する)。 */
  setCurrentCourse: (c: Course) => void;
  onOpenLesson: (course: Course, lessonId: string) => void;
  onActiveLessonChange: (courseId: string, lessonId: string) => void;
  onOpenAIBot: () => void;
  setAIContext: (ctx: ChatContext) => void;
  tenantId: Tenant['id'];
  tenantName: string;
  currentUserId: string | null;
  backendEnabled: boolean;
  /** 添削対象を控える (直後の setPage('review') が参照する)。 */
  onOpenReview: (id: string) => void;
  studentName: string;
  studentInitials: string;
  announcementsHook: UseAnnouncementsResult;
  coursesError: string | null;
  /** 添削結果画面へ遷移する。 */
  onOpenSubmission: (submissionId: string) => void;
  profileRole?: ProfileRole;
  profile: Profile | null;
  onProfileUpdated: () => Promise<void>;
  /** 検索パレット→コース管理のハイライト対象。 seq は選び直し検出用の版番号。 */
  highlightCourse: { id: string; seq: number } | null;
  /** staff が受講者シェルを開いている。 進捗・提出は書かない。 */
  previewingLearner: boolean;
}

export const AppShellContext = createContext<AppShellValue | null>(null);

export function useAppShell(): AppShellValue {
  const v = useContext(AppShellContext);
  if (!v) throw new Error('useAppShell must be used under the _app route');
  return v;
}

/** AppShell 配下以外では false。 進捗フックから provider 必須にしない。 */
export function useLearnerPreviewReadOnly(): boolean {
  return Boolean(useContext(AppShellContext)?.previewingLearner);
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles } from '@/lib/icons';
import { TENANTS } from '@/data/seed-catalog';
import { CURRENT_USER } from '@/demo/fixtures';
import type { Course, Role, Tenant, User } from '@/data/types';
import type { ChatContext } from '@falcon/shared/ai/types';
import { LessonAIProvider } from '@/components/common/LessonAIContext';
import { useCoursesForTenant, useEnrolledCoursesForTenant } from '@/data/courses-source';
import { useAuthSession } from '@/hooks/useAuthSession';
import { isBackendConfigured } from "@/lib/backend";
import { signOut as authSignOut } from '@/lib/auth';
import { configureRemoteSync, deriveCourseProgress } from '@/lib/lesson-progress';
import { useLessonProgressMap } from '@/hooks/useLessonProgress';
import type { ProfileRole } from '@falcon/shared/cms/types';
import type { SearchResult } from '@falcon/shared/search/types';

import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { DataSourceBanner } from '@/components/shell/DataSourceBanner';
import type { DataSourceKind } from '@/components/shell/DataSourceBanner';
import { LoginScreen } from '@/components/shell/LoginScreen';
import { AuthCallback } from '@/components/shell/AuthCallback';
import { TenantSelect } from '@/components/shell/TenantSelect';
import { InviteRequiredScreen } from '@/components/shell/InviteRequiredScreen';

import { LearnerDashboard } from '@/components/learner/LearnerDashboard';
import { CourseList } from '@/components/learner/CourseList';
import { CourseDetail } from '@/components/learner/CourseDetail';
import { LessonPlayer } from '@/components/learner/LessonPlayer';
import { CertificatePage } from '@/components/learner/Certificate';
import { ReviewResultView } from '@/components/learner/ReviewResultView';

import { InstructorDashboard } from '@/components/instructor/InstructorDashboard';
import { ReviewQueue } from '@/components/instructor/ReviewQueue';
import { ReviewEditor } from '@/components/instructor/ReviewEditor';
import { InstructorGeneric } from '@/components/instructor/InstructorGeneric';
import { Gradebook } from '@/components/instructor/Gradebook';

import { PublicCertificateVerify } from '@/components/public/PublicCertificateVerify';
import { SupportPage } from '@/components/public/SupportPage';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UsersAdmin } from '@/components/admin/UsersAdmin';
import { GenericEmpty } from '@/components/admin/AdminGeneric';
import { AdminCoursesPage } from '@/components/admin/AdminCoursesPage';
import { AdminAssignmentsPage } from '@/components/admin/AdminAssignmentsPage';
import { AdminEnrollmentsPage } from '@/components/admin/AdminEnrollmentsPage';
import { AdminAuditPage } from '@/components/admin/AdminAuditPage';
import { AdminReportPage } from '@/components/admin/AdminReportPage';
import { AdminOrganizationsPage } from '@/components/admin/AdminOrganizationsPage';
import { AdminSettingsPage } from '@/components/admin/AdminSettingsPage';

import { AIChatBot } from '@/components/common/AIChatBot';
import { TweaksPanel } from '@/components/common/TweaksPanel';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { usePendingReviewCount } from '@/hooks/useSubmissions';
import { useMyCertificates } from '@/hooks/useMyCertificates';
import { useNotifications } from '@/hooks/useNotifications';
import {
  useAnnouncements,
  type UseAnnouncementsResult,
} from '@/hooks/useAnnouncements';

type Stage = 'login' | 'tenant-select' | 'app';

/**
 * 直近に開いていた受講位置。 コース本体は肥大 / 陳腐化するので ID だけを保存し、
 * コース一覧が届いた時点で currentCourse に解決し直す。
 */
interface LastLocation {
  courseId: string;
  lessonId: string | null;
}

interface PersistedState {
  stage?: Stage;
  role?: Role;
  tenantId?: Tenant['id'];
  page?: string;
  showAIBot?: boolean;
  reviewSubmissionId?: string | null;
  resultSubmissionId?: string | null;
  lastLocation?: LastLocation | null;
}

const DEFAULTS = {
  role: 'learner' as Role,
  tenant: 'ses' as Tenant['id'],
  showAIBot: true,
};

function loadSaved(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('lms_state');
    return saved ? (JSON.parse(saved) as PersistedState) : null;
  } catch {
    return null;
  }
}

const PAGE_LABELS: Record<string, string> = {
  dash: 'ダッシュボード',
  courses: 'コース一覧',
  'course-detail': 'コース詳細',
  lesson: 'レッスン',
  'submission-result': '添削結果',
  cert: '修了証',
  'review-queue': '添削待ち',
  review: '添削エディタ',
  gradebook: '成績台帳',
  students: '担当受講者',
  users: 'ユーザー管理',
  enrollments: '受講登録',
  orgs: '組織マスタ',
  report: 'レポート',
  audit: '監査ログ',
  assignments: '課題管理',
  settings: '設定',
};

function roleLabel(role: Role, profileRole?: ProfileRole): string {
  if (profileRole === 'platform_admin') return 'プラットフォーム管理';
  if (role === 'learner') return 'マイラーニング';
  if (role === 'instructor') return '講師';
  return 'テナント管理';
}

/** profiles.role を UI 用 Role にマップする。 student → learner。 platform_admin → admin シェル。 */
function mapProfileRole(role: ProfileRole): Role {
  switch (role) {
    case 'student':
      return 'learner';
    case 'instructor':
      return 'instructor';
    case 'admin':
    case 'platform_admin':
      return 'admin';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export default function App() {
  // 公開検証ページ (Issue #26): `/?cert=<CODE>` はログイン不要で到達する。
  // 認証系フックを持つ本体 (MainApp) とは別コンポーネントに分けることで、
  // 早期 return が hooks 規則 (Rules of Hooks) に抵触しないようにする。
  const certCode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('cert')
      : null;
  if (certCode) {
    return (
      <>
        <PublicCertificateVerify certCode={certCode} />
        <Toaster />
      </>
    );
  }
  if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
    return (
      <>
        <AuthCallback />
        <Toaster />
      </>
    );
  }
  // サポートページ: ログイン不要で `/support` から到達する (ログインできない受け皿)。
  if (typeof window !== 'undefined' && window.location.pathname === '/support') {
    return (
      <>
        <SupportPage />
        <Toaster />
      </>
    );
  }
  return <MainApp />;
}

function MainApp() {
  const defaultTenant =
    TENANTS.find((t) => t.id === DEFAULTS.tenant) ?? TENANTS[1];

  const backendEnabled = isBackendConfigured();
  const { session, profile, loading: authLoading, inviteRequired } = useAuthSession();

  // Lazy init from localStorage so StrictMode's double-effect can't overwrite
  // our restored state with fresh defaults.
  const [stage, setStage] = useState<Stage>(() => loadSaved()?.stage ?? 'login');
  const [tenant, setTenant] = useState<Tenant>(() => {
    const saved = loadSaved();
    return (saved?.tenantId && TENANTS.find((t) => t.id === saved.tenantId)) || defaultTenant;
  });
  const [role, setRole] = useState<Role>(() => loadSaved()?.role ?? DEFAULTS.role);
  // 削除済み画面 (ノート / Q&A) を開いていた端末はダッシュボードへ戻す。
  const [page, setPage] = useState(() => {
    const savedPage = loadSaved()?.page ?? 'dash';
    return savedPage === 'qa' ? 'dash' : savedPage;
  });
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [lastLocation, setLastLocation] = useState<LastLocation | null>(
    () => loadSaved()?.lastLocation ?? null,
  );
  // 検索パレット (Issue #77) からのディープリンク。 通常のページ遷移では毎回クリアする。
  // `seq` は「同じコースを続けて選び直した」ことを子に伝えるための版番号。 これが無いと
  // CourseEditor を閉じた後に同じコースを再選択しても key が変わらず開き直せない。
  // リロードでレッスン画面に戻る場合は、 保存しておいた受講位置を初期値にする
  // (これが無いとコース先頭のレッスンが開いてしまう)。
  const [deepLinkLesson, setDeepLinkLesson] = useState<{
    id: string;
    seq: number;
  } | null>(() => {
    const saved = loadSaved();
    return saved?.page === 'lesson' && saved.lastLocation?.lessonId
      ? { id: saved.lastLocation.lessonId, seq: 0 }
      : null;
  });
  const [deepLinkCourse, setDeepLinkCourse] = useState<{
    id: string;
    seq: number;
  } | null>(null);
  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContext, setAiContext] = useState<ChatContext>({ kind: 'general' });
  const [showAIBot, setShowAIBot] = useState(() =>
    loadSaved()?.showAIBot ?? DEFAULTS.showAIBot,
  );
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(
    () => loadSaved()?.reviewSubmissionId ?? null,
  );
  const [resultSubmissionId, setResultSubmissionId] = useState<string | null>(
    () => loadSaved()?.resultSubmissionId ?? null,
  );
  const prevSessionRef = useRef<{ tenantId: Tenant['id']; role: Role } | null>(
    null,
  );

  // バックエンドが設定済みかつ profile を取得済みなら、 そこから role / tenant を上書きする。
  const effectiveRole: Role = backendEnabled && profile
    ? mapProfileRole(profile.role)
    : role;
  const effectiveTenant: Tenant = useMemo(() => {
    if (backendEnabled && profile) {
      // DB (GET /api/me の tenant) を真実とする。 seed カタログに無いテナントでも
      // fixtures の 'ses' 等へフォールバックせず、 実テナントとして扱う。
      const info = profile.tenant;
      const seedIcon = TENANTS.find((t) => t.id === profile.tenant_id)?.icon;
      const icon: Tenant['icon'] =
        info?.icon === 'cpu' || info?.icon === 'school'
          ? info.icon
          : seedIcon ?? 'school';
      return {
        id: profile.tenant_id,
        name: info?.name ?? profile.tenant_id,
        subtitle: info?.subtitle ?? '',
        icon,
        active: 0,
      };
    }
    return tenant;
  }, [backendEnabled, profile, tenant]);

  const effectiveUser: User = useMemo(() => {
    if (backendEnabled) {
      if (profile) {
        return {
          name: profile.display_name,
          email: profile.email ?? '',
          initials: profile.initials ?? profile.display_name.slice(0, 2),
        };
      }
      // profile 取得前の過渡状態でも fixtures のデモユーザーは出さない。
      const email = session?.user.email ?? '';
      return {
        name: email || 'ユーザー',
        email,
        initials: (email || 'U').slice(0, 2).toUpperCase(),
      };
    }
    return CURRENT_USER;
  }, [backendEnabled, profile, session]);

  // 受講者は「自分に割り当てられたコース」(enrollment ベース) を見る。 instructor/admin は
  // 従来どおりテナントのコース一覧を使う (公開コースを「探す」用途)。
  const browseCourses = useCoursesForTenant(
    effectiveTenant.id,
    effectiveRole !== 'learner',
  );
  const enrolledCourses = useEnrolledCoursesForTenant(
    effectiveTenant.id,
    session?.user.id ?? null,
    effectiveRole === 'learner',
  );
  // DB 由来コースは progress=0 で届くため、 レッスン進捗ストアから実進捗を導出する。
  const progressMap = useLessonProgressMap();
  const rawCourses =
    effectiveRole === 'learner' ? enrolledCourses.courses : browseCourses.courses;
  const courses = useMemo(
    () => rawCourses.map((c) => deriveCourseProgress(c, progressMap)),
    [rawCourses, progressMap],
  );
  // リロード復帰: レッスン画面のときだけ保存 courseId を解決する。
  // course-detail などでは走らせない (別コース詳細を開いたあとのリロードで
  // lastLocation のコースに上書きされるのを防ぐ)。
  useEffect(() => {
    if (page !== 'lesson' || currentCourse || !lastLocation) return;
    const found = courses.find((c) => c.id === lastLocation.courseId);
    if (found) setCurrentCourse(found);
  }, [courses, currentCourse, lastLocation, page]);

  // currentCourse は選択時点のスナップショットなので、 進捗が更新された最新の同一コースへ
  // 解決し直す (再開直後に進捗リングが 0% のまま固まらないように)。
  const activeCourse = useMemo(
    () =>
      currentCourse
        ? courses.find((c) => c.id === currentCourse.id) ?? currentCourse
        : null,
    [courses, currentCourse],
  );

  const courseSource =
    effectiveRole === 'learner' ? enrolledCourses.source : browseCourses.source;
  const courseError =
    effectiveRole === 'learner' ? enrolledCourses.error : browseCourses.error;
  // バナー集約 + LearnerDashboard への props 渡し用（二重 fetch 回避）。
  const announcements = useAnnouncements(
    effectiveTenant.id,
    effectiveRole === 'learner',
  );
  const dataSource = pickSource(courseSource, announcements.source);
  const pendingReviewCount = usePendingReviewCount(effectiveTenant.id);
  // サイドバーのバッジ件数は固定モック値ではなく実データで出す。
  const myCertificates = useMyCertificates(
    session?.user.id ?? null,
    effectiveRole === 'learner',
  );
  const sidebarCounts =
    effectiveRole === 'learner'
      ? {
          cert: backendEnabled
            ? myCertificates.certificates.length
            : courses.filter((c) => c.completed).length,
        }
      : effectiveRole === 'instructor'
        ? {
            'review-queue': pendingReviewCount,
          }
        : undefined;
  // 通知センター (Issue #25)。 バックエンド未設定 / 未ログイン時はフック内部で空になる。
  // userId を鍵に含め、 ユーザー切替時に前ユーザーの通知が残らないようにする。
  const notifications = useNotifications(
    effectiveTenant.id,
    session?.user.id ?? null,
    true,
  );
  const openSubmissionResult = (id: string) => {
    setResultSubmissionId(id);
    setPage('submission-result');
  };

  /**
   * 通常のページ遷移。 サイドバー / 各画面からの遷移では検索のディープリンクを捨てる
   * (「コース一覧」を押したのに検索で開いた編集画面へ戻る、 といった挙動を防ぐ)。
   */
  const navigate = (nextPage: string) => {
    setDeepLinkLesson(null);
    setDeepLinkCourse(null);
    setPage(nextPage);
  };

  /**
   * レッスン画面を「指定のレッスンで」開く。 ダッシュボードの「続きから学習」・ シラバスの
   * 行クリック・ 検索パレットの共通導線。 開いた位置は `lastLocation` に控え、 リロード後も
   * ここへ戻れるようにする。
   */
  const openLesson = useCallback((course: Course, lessonId: string) => {
    setCurrentCourse(course);
    // 同じレッスンを選び直しても反映されるよう、 選択のたびに seq を進める。
    setDeepLinkLesson((prev) => ({ id: lessonId, seq: (prev?.seq ?? 0) + 1 }));
    setDeepLinkCourse(null);
    setLastLocation({ courseId: course.id, lessonId });
    setPage('lesson');
  }, []);

  /** レッスン画面内での切替 (サイドバー / 次のレッスン) を受講位置へ反映する。 */
  const handleActiveLessonChange = useCallback(
    (courseId: string, lessonId: string) => {
      setLastLocation((prev) =>
        prev?.courseId === courseId && prev.lessonId === lessonId
          ? prev
          : { courseId, lessonId },
      );
    },
    [],
  );

  /** 検索パレットのヒットを開く。 受講者は受講画面、 staff はコース管理画面へ。 */
  const handleSearchSelect = (result: SearchResult) => {
    if (effectiveRole === 'learner') {
      const target = courses.find((c) => c.id === result.course_id);
      if (!target) {
        toast.error('このコースは現在受講対象に含まれていません');
        return;
      }
      if (result.kind === 'lesson') {
        openLesson(target, result.id);
        return;
      }
      setCurrentCourse(target);
      setDeepLinkLesson(null);
      setDeepLinkCourse(null);
      setPage('course-detail');
      return;
    }
    // instructor / admin: コース管理画面へ。 admin は該当コースの編集画面を直接開き、
    // instructor は一覧内で該当コースをハイライトする。
    setDeepLinkLesson(null);
    setDeepLinkCourse((prev) => ({
      id: result.course_id,
      seq: (prev?.seq ?? 0) + 1,
    }));
    setPage('courses');
  };

  // ページがレッスン以外に戻ったら context を general にリセット
  useEffect(() => {
    if (page !== 'lesson') {
      setAiContext({ kind: 'general' });
    }
  }, [page]);

  // 組織マスタは platform_admin のみ。 tenant admin 等が残留 page を持っていても戻す。
  useEffect(() => {
    if (page === 'orgs' && profile?.role !== 'platform_admin') {
      setPage('dash');
    }
  }, [page, profile?.role]);

  // テナント / ロール切替時のみ添削対象をクリア (初回マウントでは loadSaved を維持)
  useEffect(() => {
    const prev = prevSessionRef.current;
    if (prev && (prev.tenantId !== tenant.id || prev.role !== role)) {
      setReviewSubmissionId(null);
    }
    prevSessionRef.current = { tenantId: tenant.id, role };
  }, [tenant.id, role]);

  useEffect(() => {
    localStorage.setItem(
      'lms_state',
      JSON.stringify({
        stage,
        role,
        tenantId: tenant.id,
        page,
        showAIBot,
        reviewSubmissionId,
        resultSubmissionId,
        lastLocation,
      }),
    );
  }, [
    stage,
    role,
    tenant,
    page,
    showAIBot,
    reviewSubmissionId,
    resultSubmissionId,
    lastLocation,
  ]);

  // レッスン進捗のサーバ同期 (Issue #21): バックエンド + profile が揃った時のみ有効化。
  // 未設定 / ログアウト時は null を渡して同期を停止し、 localStorage のみで動作させる。
  useEffect(() => {
    if (backendEnabled && session && profile) {
      configureRemoteSync({
        userId: session.user.id,
        tenantId: profile.tenant_id,
      });
    } else {
      configureRemoteSync(null);
    }
  }, [backendEnabled, session, profile]);

  // Backtick toggle for tweaks panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inField =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        Boolean(target?.isContentEditable);
      if (inField) return;
      if (e.key === '`') {
        e.preventDefault();
        setTweaksVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Pseudo-routes
  useEffect(() => {
    if (page === '__logout') {
      setReviewSubmissionId(null);
      void (async () => {
        try {
          if (backendEnabled) {
            await authSignOut();
          }
          setStage('login');
          setPage('dash');
          toast('ログアウトしました');
        } catch (err) {
          console.error('[logout]', err);
          toast.error('ログアウトに失敗しました');
          setPage('dash');
        }
      })();
    }
    if (page === '__ai') {
      setAiOpen(true);
      setPage('dash');
    }
  }, [page, backendEnabled]);

  // ----- 認証/オンボーディングの分岐 -----

  if (backendEnabled) {
    if (authLoading) {
      return (
        <>
          <div className="min-h-screen grid place-items-center bg-background text-ink-3">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" />
              セッション復元中…
            </div>
          </div>
          <Toaster />
        </>
      );
    }
    if (!session) {
      return (
        <>
          <LoginScreen />
          <Toaster />
        </>
      );
    }
    if (inviteRequired) {
      return (
        <>
          <InviteRequiredScreen
            email={session.user.email ?? ""}
            onSignOut={() => void authSignOut()}
          />
          <Toaster />
        </>
      );
    }
    // backendEnabled + session (+ profile or transient null): アプリへ進む (stage 関係なし)
  } else {
    // 既存の fixtures フロー (バックエンド未設定時)
    if (stage === 'login') {
      return (
        <>
          <LoginScreen onMockLogin={() => setStage('tenant-select')} />
          <Toaster />
        </>
      );
    }
    if (stage === 'tenant-select') {
      return (
        <>
          <TenantSelect
            onPick={(t) => {
              setTenant(t);
              setStage('app');
              setPage('dash');
            }}
          />
          <Toaster />
        </>
      );
    }
  }

  const crumbs = [
    effectiveTenant.name,
    roleLabel(effectiveRole, profile?.role),
    page === 'course-detail' && activeCourse
      ? activeCourse.title
      : PAGE_LABELS[page] ?? page,
  ];

  const isFlush = page === 'lesson' || page === 'review';

  return (
    <>
      <div className="grid min-h-screen" style={{ gridTemplateColumns: '232px 1fr' }}>
        <Sidebar
          role={effectiveRole}
          page={page}
          setPage={navigate}
          user={effectiveUser}
          counts={sidebarCounts}
          profileRole={profile?.role}
        />
        <div className="min-w-0 flex flex-col">
          {import.meta.env.DEV ? <DataSourceBanner source={dataSource} /> : null}
          <Topbar
            crumbs={crumbs}
            onSearchSelect={handleSearchSelect}
            notify={{
              role: effectiveRole,
              tenantId: effectiveTenant.id,
              notifications: notifications.notifications,
              unreadCount: notifications.unreadCount,
              loading: notifications.loading,
              onMarkRead: (id) => void notifications.markRead(id),
              onMarkAllRead: () => void notifications.markAllRead(),
              onAfterCreateAnnouncement: () => void notifications.refetch(),
              courses: browseCourses.courses,
              onOpenSubmission: openSubmissionResult,
            }}
          />
          <div className={isFlush ? 'flex-1 min-w-0' : 'p-7 flex-1 min-w-0 overflow-x-hidden'}>
            {renderPage({
              role: effectiveRole,
              page,
              setPage: navigate,
              courses,
              deepLinkLesson,
              deepLinkCourse,
              currentCourse: activeCourse,
              setCurrentCourse,
              onOpenLesson: openLesson,
              onActiveLessonChange: handleActiveLessonChange,
              onOpenAIBot: () => setAiOpen(true),
              setAIContext: setAiContext,
              tenantId: effectiveTenant.id,
              tenantName: effectiveTenant.name,
              currentUserId: session?.user.id ?? null,
              backendEnabled,
              reviewSubmissionId,
              onOpenReview: setReviewSubmissionId,
              studentName: effectiveUser.name,
              studentInitials: effectiveUser.initials,
              announcementsHook: announcements,
              coursesError: courseError,
              resultSubmissionId,
              onOpenSubmission: openSubmissionResult,
              profileRole: profile?.role,
            })}
          </div>
        </div>
      </div>

      {/* Floating AI chatbot (learner only) — lesson 内でも開けるよう gate を撤廃 */}
      {showAIBot && effectiveRole === 'learner' ? (
        <LessonAIProvider value={aiContext}>
          {!aiOpen ? (
            <Button
              variant="primary"
              size="icon"
              onClick={() => setAiOpen(true)}
              title="学習アシスタントAI"
              className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg z-[90]"
            >
              <Sparkles size={18} />
            </Button>
          ) : (
            <AIChatBot onClose={() => setAiOpen(false)} />
          )}
        </LessonAIProvider>
      ) : null}

      {/* Tweaks panel — backtick toggle.
          バックエンド設定時は profile が真実なので、 fixtures-flow tweaks は dev only として残す。 */}
      {tweaksVisible && !backendEnabled ? (
        <TweaksPanel
          role={role}
          tenant={tenant}
          showAIBot={showAIBot}
          onRole={(r) => {
            setRole(r);
            setPage('dash');
          }}
          onTenant={(t) => setTenant(t)}
          onToggleAIBot={() => setShowAIBot((v) => !v)}
        />
      ) : null}

      <Toaster />
    </>
  );
}

function pickSource(...sources: DataSourceKind[]): DataSourceKind {
  if (sources.includes('error')) return 'error';
  if (sources.includes('fixtures')) return 'fixtures';
  return 'db';
}

interface RenderParams {
  role: Role;
  page: string;
  setPage: (p: string) => void;
  courses: Course[];
  currentCourse: Course | null;
  setCurrentCourse: (c: Course) => void;
  /** 指定のレッスンでレッスン画面を開く (「続きから」 / シラバスの行クリック)。 */
  onOpenLesson: (course: Course, lessonId: string) => void;
  /** レッスン画面内でのレッスン切替の通知 (リロード後の復帰位置に使う)。 */
  onActiveLessonChange: (courseId: string, lessonId: string) => void;
  onOpenAIBot: () => void;
  setAIContext: (ctx: ChatContext) => void;
  tenantId: Tenant['id'];
  tenantName: string;
  currentUserId: string | null;
  backendEnabled: boolean;
  reviewSubmissionId: string | null;
  onOpenReview: (id: string) => void;
  studentName: string;
  studentInitials: string;
  announcementsHook: UseAnnouncementsResult;
  coursesError: string | null;
  resultSubmissionId: string | null;
  onOpenSubmission: (submissionId: string) => void;
  profileRole?: ProfileRole;
  /**
   * 検索から指定されたレッスン (受講者のレッスン画面を開く位置)。
   * `seq` は同じレッスンを選び直したときにも再適用させるための版番号。
   */
  deepLinkLesson: { id: string; seq: number } | null;
  /**
   * 検索から指定されたコース (staff のコース管理で開く / ハイライトする対象)。
   * `seq` は同じコースを選び直したときに子を再マウントさせるための版番号。
   */
  deepLinkCourse: { id: string; seq: number } | null;
}

function renderPage({
  role,
  page,
  setPage,
  courses,
  deepLinkLesson,
  deepLinkCourse,
  currentCourse,
  setCurrentCourse,
  onOpenLesson,
  onActiveLessonChange,
  onOpenAIBot,
  setAIContext,
  tenantId,
  tenantName,
  currentUserId,
  backendEnabled,
  reviewSubmissionId,
  onOpenReview,
  studentName,
  studentInitials,
  announcementsHook,
  coursesError,
  resultSubmissionId,
  onOpenSubmission,
  profileRole,
}: RenderParams) {
  if (page === 'submission-result' && resultSubmissionId) {
    return (
      <ReviewResultView
        submissionId={resultSubmissionId}
        setPage={setPage}
      />
    );
  }
  if (role === 'learner') {
    if (page === 'dash')
      return (
        <LearnerDashboard
          setPage={setPage}
          onOpenLesson={onOpenLesson}
          courses={courses}
          announcementsHook={announcementsHook}
          coursesError={coursesError}
          onOpenSubmission={onOpenSubmission}
          studentName={studentName}
          currentUserId={currentUserId}
          backendEnabled={backendEnabled}
        />
      );
    if (page === 'courses')
      return (
        <CourseList
          setPage={setPage}
          courses={courses}
          setCurrentCourse={setCurrentCourse}
        />
      );
    if (page === 'course-detail') {
      const target = currentCourse ?? courses[0];
      if (!target) return <EmptyCoursesNotice setPage={setPage} />;
      return (
        <CourseDetail
          course={target}
          setPage={setPage}
          onOpenLesson={(lessonId) => onOpenLesson(target, lessonId)}
          onOpenSubmission={onOpenSubmission}
        />
      );
    }
    if (page === 'lesson') {
      const target = currentCourse ?? courses[0];
      if (!target) return <EmptyCoursesNotice setPage={setPage} />;
      return (
        <LessonPlayer
          course={target}
          setPage={setPage}
          onOpenAIBot={onOpenAIBot}
          setAIContext={setAIContext}
          tenantId={tenantId}
          studentName={studentName}
          studentInitials={studentInitials}
          initialLesson={deepLinkLesson}
          onActiveLessonChange={onActiveLessonChange}
        />
      );
    }
    if (page === 'cert')
      return (
        <CertificatePage
          courses={courses}
          currentUserId={currentUserId}
          studentName={studentName}
          studentInitials={studentInitials}
          tenantName={tenantName}
          backendEnabled={backendEnabled}
        />
      );
  }
  if (role === 'instructor') {
    if (page === 'dash')
      return (
        <InstructorDashboard
          tenantId={tenantId}
          setPage={setPage}
          onOpenReview={onOpenReview}
          backendEnabled={backendEnabled}
        />
      );
    if (page === 'review-queue')
      return (
        <ReviewQueue
          tenantId={tenantId}
          setPage={setPage}
          onOpenReview={onOpenReview}
        />
      );
    if (page === 'review')
      return (
        <ReviewEditor
          tenantId={tenantId}
          submissionId={reviewSubmissionId}
          setPage={setPage}
        />
      );
    if (page === 'gradebook') return <Gradebook courses={courses} />;
    if (page === 'students' || page === 'courses')
      return (
        <InstructorGeneric
          page={page}
          tenantId={tenantId}
          backendEnabled={backendEnabled}
          highlightCourseId={deepLinkCourse?.id ?? null}
          highlightSeq={deepLinkCourse?.seq ?? 0}
        />
      );
  }
  if (role === 'admin') {
    if (page === 'dash')
      return <AdminDashboard tenantId={tenantId} backendEnabled={backendEnabled} />;
    if (page === 'users')
      return (
        <UsersAdmin
          tenantId={tenantId}
          tenantName={tenantName}
          currentUserId={currentUserId}
          currentUserRole={profileRole ?? null}
          backendEnabled={backendEnabled}
        />
      );
    if (page === 'courses')
      return (
        <AdminCoursesPage
          // seq を含めることで、 同じコースを選び直したときも再マウントされ
          // CourseEditor を閉じた後に開き直せる。
          key={deepLinkCourse ? `${deepLinkCourse.id}:${deepLinkCourse.seq}` : 'list'}
          tenantId={tenantId}
          initialCourseId={deepLinkCourse?.id ?? null}
        />
      );
    if (page === 'gradebook') return <Gradebook courses={courses} />;
    if (page === 'assignments') return <AdminAssignmentsPage tenantId={tenantId} />;
    if (page === 'enrollments')
      return (
        <AdminEnrollmentsPage
          key={tenantId}
          tenantId={tenantId}
          currentUserId={currentUserId}
          backendEnabled={backendEnabled}
        />
      );
    if (page === 'audit')
      return <AdminAuditPage tenantId={tenantId} backendEnabled={backendEnabled} />;
    if (page === 'orgs') {
      if (profileRole !== 'platform_admin') {
        return (
          <div className="max-w-md mx-auto mt-16 text-center">
            <div className="text-[15px] font-semibold mb-2">権限がありません</div>
            <div className="text-[12.5px] text-ink-3 mb-4">
              組織マスタはプラットフォーム管理のみ利用できます。
            </div>
            <button
              type="button"
              className="text-[12.5px] text-brand underline underline-offset-2"
              onClick={() => setPage('dash')}
            >
              ダッシュボードに戻る
            </button>
          </div>
        );
      }
      return <AdminOrganizationsPage backendEnabled={backendEnabled} />;
    }
    if (page === 'report')
      return <AdminReportPage tenantId={tenantId} backendEnabled={backendEnabled} />;
    if (page === 'settings')
      return (
        <AdminSettingsPage
          tenantName={tenantName}
          backendEnabled={backendEnabled}
        />
      );
  }
  return <GenericEmpty page={page} />;
}

function EmptyCoursesNotice({ setPage }: { setPage: (p: string) => void }) {
  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <div className="text-[15px] font-semibold mb-2">受講可能なコースがありません</div>
      <div className="text-[12.5px] text-ink-3 mb-4">
        現在このテナントに公開中のコースはありません。 管理者がコースを公開するまでお待ちください。
      </div>
      <button
        type="button"
        className="text-[12.5px] text-brand underline underline-offset-2"
        onClick={() => setPage('dash')}
      >
        ダッシュボードに戻る
      </button>
    </div>
  );
}

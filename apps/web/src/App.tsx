import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles } from '@/lib/icons';
import { TENANTS, CURRENT_USER } from '@/data/fixtures';
import type { Course, Role, Tenant, User } from '@/data/types';
import type { ChatContext } from '@falcon/shared/ai/types';
import { LessonAIProvider } from '@/components/common/LessonAIContext';
import { useCoursesForTenant, useEnrolledCoursesForTenant } from '@/data/courses-source';
import { useAuthSession } from '@/hooks/useAuthSession';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signOut as authSignOut } from '@/lib/auth';
import { configureRemoteSync } from '@/lib/lesson-progress';
import type { ProfileRole } from '@falcon/shared/cms/types';

import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { LoginScreen } from '@/components/shell/LoginScreen';
import { TenantSelect } from '@/components/shell/TenantSelect';
import { OnboardingScreen } from '@/components/shell/OnboardingScreen';

import { LearnerDashboard } from '@/components/learner/LearnerDashboard';
import { CourseList } from '@/components/learner/CourseList';
import { CourseDetail } from '@/components/learner/CourseDetail';
import { LessonPlayer } from '@/components/learner/LessonPlayer';
import { CertificatePage } from '@/components/learner/Certificate';
import { StandaloneQA } from '@/components/learner/StandaloneQA';

import { InstructorDashboard } from '@/components/instructor/InstructorDashboard';
import { ReviewQueue } from '@/components/instructor/ReviewQueue';
import { ReviewEditor } from '@/components/instructor/ReviewEditor';
import { InstructorGeneric } from '@/components/instructor/InstructorGeneric';
import { InstructorQA } from '@/components/instructor/InstructorQA';
import { Gradebook } from '@/components/instructor/Gradebook';

import { PublicCertificateVerify } from '@/components/public/PublicCertificateVerify';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UsersAdmin } from '@/components/admin/UsersAdmin';
import { AdminGeneric, GenericEmpty } from '@/components/admin/AdminGeneric';
import { AdminCoursesPage } from '@/components/admin/AdminCoursesPage';
import { AdminAssignmentsPage } from '@/components/admin/AdminAssignmentsPage';
import { AdminEnrollmentsPage } from '@/components/admin/AdminEnrollmentsPage';

import { AIChatBot } from '@/components/common/AIChatBot';
import { TweaksPanel } from '@/components/common/TweaksPanel';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { usePendingReviewCount } from '@/hooks/useSubmissions';
import { useNotifications } from '@/hooks/useNotifications';

type Stage = 'login' | 'tenant-select' | 'app';

interface PersistedState {
  stage?: Stage;
  role?: Role;
  tenantId?: Tenant['id'];
  page?: string;
  showAIBot?: boolean;
  reviewSubmissionId?: string | null;
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
  cert: '修了証',
  qa: 'Q&A',
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

const roleLabel = (role: Role) =>
  role === 'learner' ? 'マイラーニング' : role === 'instructor' ? '講師' : 'テナント管理';

/** profiles.role を UI 用 Role にマップする。 student → learner。 */
function mapProfileRole(role: ProfileRole): Role {
  if (role === 'student') return 'learner';
  if (role === 'instructor') return 'instructor';
  return 'admin';
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
  return <MainApp />;
}

function MainApp() {
  const defaultTenant =
    TENANTS.find((t) => t.id === DEFAULTS.tenant) ?? TENANTS[1];

  const supabaseEnabled = isSupabaseConfigured();
  const { session, profile, loading: authLoading, refreshProfile } = useAuthSession();

  // Lazy init from localStorage so StrictMode's double-effect can't overwrite
  // our restored state with fresh defaults.
  const [stage, setStage] = useState<Stage>(() => loadSaved()?.stage ?? 'login');
  const [tenant, setTenant] = useState<Tenant>(() => {
    const saved = loadSaved();
    return (saved?.tenantId && TENANTS.find((t) => t.id === saved.tenantId)) || defaultTenant;
  });
  const [role, setRole] = useState<Role>(() => loadSaved()?.role ?? DEFAULTS.role);
  const [page, setPage] = useState(() => loadSaved()?.page ?? 'dash');
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContext, setAiContext] = useState<ChatContext>({ kind: 'general' });
  const [showAIBot, setShowAIBot] = useState(() =>
    loadSaved()?.showAIBot ?? DEFAULTS.showAIBot,
  );
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(
    () => loadSaved()?.reviewSubmissionId ?? null,
  );
  const prevSessionRef = useRef<{ tenantId: Tenant['id']; role: Role } | null>(
    null,
  );

  // Supabase が設定済みかつ profile を取得済みなら、 そこから role / tenant を上書きする。
  const effectiveRole: Role = supabaseEnabled && profile
    ? mapProfileRole(profile.role)
    : role;
  const effectiveTenant: Tenant = useMemo(() => {
    if (supabaseEnabled && profile) {
      const t = TENANTS.find((t) => t.id === profile.tenant_id);
      if (t) return t;
    }
    return tenant;
  }, [supabaseEnabled, profile, tenant]);

  const effectiveUser: User = useMemo(() => {
    if (supabaseEnabled && profile) {
      return {
        name: profile.display_name,
        email: profile.email ?? '',
        initials: profile.initials ?? profile.display_name.slice(0, 2),
      };
    }
    return CURRENT_USER;
  }, [supabaseEnabled, profile]);

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
  const courses =
    effectiveRole === 'learner' ? enrolledCourses.courses : browseCourses.courses;
  const pendingReviewCount = usePendingReviewCount(effectiveTenant.id);
  // 通知センター (Issue #25)。 Supabase 未設定 / 未ログイン時はフック内部で空になる。
  // userId を鍵に含め、 ユーザー切替時に前ユーザーの通知が残らないようにする。
  const notifications = useNotifications(
    effectiveTenant.id,
    session?.user.id ?? null,
    true,
  );

  // ページがレッスン以外に戻ったら context を general にリセット
  useEffect(() => {
    if (page !== 'lesson') {
      setAiContext({ kind: 'general' });
    }
  }, [page]);

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
      }),
    );
  }, [stage, role, tenant, page, showAIBot, reviewSubmissionId]);

  // レッスン進捗のサーバ同期 (Issue #21): Supabase + profile が揃った時のみ有効化。
  // 未設定 / ログアウト時は null を渡して同期を停止し、 localStorage のみで動作させる。
  useEffect(() => {
    if (supabaseEnabled && session && profile) {
      configureRemoteSync({
        userId: session.user.id,
        tenantId: profile.tenant_id,
      });
    } else {
      configureRemoteSync(null);
    }
  }, [supabaseEnabled, session, profile]);

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
          if (supabaseEnabled) {
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
    if (page === '__switch_tenant') {
      setReviewSubmissionId(null);
      setStage('tenant-select');
      setPage('dash');
    }
    if (page === '__ai') {
      setAiOpen(true);
      setPage('dash');
    }
  }, [page, supabaseEnabled]);

  // ----- 認証/オンボーディングの分岐 -----

  if (supabaseEnabled) {
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
          <LoginScreen onLogin={() => undefined} />
          <Toaster />
        </>
      );
    }
    if (!profile) {
      return (
        <>
          <OnboardingScreen
            userId={session.user.id}
            email={session.user.email}
            onCompleted={refreshProfile}
          />
          <Toaster />
        </>
      );
    }
    // supabaseEnabled + session + profile: アプリへ進む (stage 関係なし)
  } else {
    // 既存の fixtures フロー (Supabase 未設定時)
    if (stage === 'login') {
      return (
        <>
          <LoginScreen onLogin={() => setStage('tenant-select')} />
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
    roleLabel(effectiveRole),
    page === 'course-detail' && currentCourse
      ? currentCourse.title
      : PAGE_LABELS[page] ?? page,
  ];

  const isFlush = page === 'lesson' || page === 'review';

  return (
    <>
      <div className="grid min-h-screen" style={{ gridTemplateColumns: '232px 1fr' }}>
        <Sidebar
          role={effectiveRole}
          page={page}
          setPage={setPage}
          tenant={effectiveTenant}
          user={effectiveUser}
          reviewQueueCount={
            effectiveRole === 'instructor' ? pendingReviewCount : undefined
          }
        />
        <div className="min-w-0 flex flex-col">
          <Topbar
            crumbs={crumbs}
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
            }}
          />
          <div className={isFlush ? 'flex-1 min-w-0' : 'p-7 flex-1 min-w-0 overflow-x-hidden'}>
            {renderPage({
              role: effectiveRole,
              page,
              setPage,
              courses,
              currentCourse,
              setCurrentCourse,
              onOpenAIBot: () => setAiOpen(true),
              setAIContext: setAiContext,
              tenantId: effectiveTenant.id,
              tenantName: effectiveTenant.name,
              currentUserId: session?.user.id ?? null,
              supabaseEnabled,
              reviewSubmissionId,
              onOpenReview: setReviewSubmissionId,
              studentName: effectiveUser.name,
              studentInitials: effectiveUser.initials,
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
          Supabase 設定時は profile が真実なので、 fixtures-flow tweaks は dev only として残す。 */}
      {tweaksVisible && !supabaseEnabled ? (
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

interface RenderParams {
  role: Role;
  page: string;
  setPage: (p: string) => void;
  courses: Course[];
  currentCourse: Course | null;
  setCurrentCourse: (c: Course) => void;
  onOpenAIBot: () => void;
  setAIContext: (ctx: ChatContext) => void;
  tenantId: Tenant['id'];
  tenantName: string;
  currentUserId: string | null;
  supabaseEnabled: boolean;
  reviewSubmissionId: string | null;
  onOpenReview: (id: string) => void;
  studentName: string;
  studentInitials: string;
}

function renderPage({
  role,
  page,
  setPage,
  courses,
  currentCourse,
  setCurrentCourse,
  onOpenAIBot,
  setAIContext,
  tenantId,
  tenantName,
  currentUserId,
  supabaseEnabled,
  reviewSubmissionId,
  onOpenReview,
  studentName,
  studentInitials,
}: RenderParams) {
  if (role === 'learner') {
    if (page === 'dash')
      return <LearnerDashboard setPage={setPage} courses={courses} tenantId={tenantId} />;
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
      return <CourseDetail course={target} setPage={setPage} />;
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
          currentUserId={currentUserId}
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
          supabaseEnabled={supabaseEnabled}
        />
      );
    if (page === 'qa')
      return (
        <StandaloneQA
          tenantId={tenantId}
          currentUserId={currentUserId}
          courses={courses}
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
    if (page === 'qa')
      return <InstructorQA tenantId={tenantId} currentUserId={currentUserId} />;
    if (page === 'gradebook') return <Gradebook courses={courses} />;
    if (page === 'students' || page === 'courses')
      return <InstructorGeneric page={page} />;
  }
  if (role === 'admin') {
    if (page === 'dash') return <AdminDashboard />;
    if (page === 'users')
      return (
        <UsersAdmin
          tenantId={tenantId}
          tenantName={tenantName}
          currentUserId={currentUserId}
          supabaseEnabled={supabaseEnabled}
        />
      );
    if (page === 'courses') return <AdminCoursesPage tenantId={tenantId} />;
    if (page === 'gradebook') return <Gradebook courses={courses} />;
    if (page === 'assignments') return <AdminAssignmentsPage tenantId={tenantId} />;
    if (page === 'enrollments')
      return (
        <AdminEnrollmentsPage
          key={tenantId}
          tenantId={tenantId}
          currentUserId={currentUserId}
          supabaseEnabled={supabaseEnabled}
        />
      );
    if (page === 'orgs' || page === 'report' || page === 'audit')
      return <AdminGeneric page={page} />;
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

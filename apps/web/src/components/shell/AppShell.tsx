import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Sparkles } from "@/lib/icons";
import { TENANTS } from "@/data/seed-catalog";
import { CURRENT_USER } from "@/demo/fixtures";
import type { Course, Role, Tenant, User } from "@/data/types";
import type { ChatContext } from "@falcon/shared/ai/types";
import { LessonAIProvider } from "@/components/common/LessonAIContext";
import { useCoursesForTenant, useEnrolledCoursesForTenant } from "@/data/courses-source";
import { useAuthSession } from "@/hooks/useAuthSession";
import { isBackendConfigured } from "@/lib/backend";
import { signOut as authSignOut } from "@/lib/auth";
import { configureRemoteSync, deriveCourseProgress } from "@/lib/lesson-progress";
import { useLessonProgressMap } from "@/hooks/useLessonProgress";
import { useIsNarrowViewport } from "@/hooks/useIsNarrowViewport";
import type { SearchResult } from "@falcon/shared/search/types";

import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { LoginScreen } from "@/components/shell/LoginScreen";
import { InviteRequiredScreen } from "@/components/shell/InviteRequiredScreen";
import { resolveUiRole } from "@/lib/ui-role";
import { AppShellContext, type AppShellValue } from "@/components/shell/app-shell-context";

import { AIChatBot } from "@/components/common/AIChatBot";
import { TweaksPanel } from "@/components/common/TweaksPanel";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { usePendingReviewCount } from "@/hooks/useSubmissions";
import { useMyCertificates } from "@/hooks/useMyCertificates";
import { useNotifications } from "@/hooks/useNotifications";
import { useAnnouncements } from "@/hooks/useAnnouncements";

type Stage = "login" | "tenant-select" | "app";

/** ログイン完了後に戻す URL の保存先 (AuthCallback が読み取る)。 */
export const POST_LOGIN_REDIRECT_KEY = "falcon_post_login_redirect_v1";

/**
 * 直近に開いていた受講位置。 コース本体は肥大 / 陳腐化するので ID だけを保存し、
 * ダッシュボードの「続きから学習」やサイドバーの「現在のレッスン」の解決に使う。
 */
interface LastLocation {
  courseId: string;
  lessonId: string | null;
}

interface PersistedState {
  stage?: Stage;
  role?: Role;
  tenantId?: Tenant["id"];
  showAIBot?: boolean;
  lastLocation?: LastLocation | null;
  /** staff が受講者シェルを開いているときだけ 'learner'。 API の role は変えない。 */
  uiRoleOverride?: Role | null;
}

const DEFAULTS = {
  role: "learner" as Role,
  tenant: "ses" as Tenant["id"],
  showAIBot: true,
};

function loadSaved(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("lms_state");
    return saved ? (JSON.parse(saved) as PersistedState) : null;
  } catch {
    return null;
  }
}

/** 旧ページキー → URL。 パラメータ付きページ (lesson / review 等) はアダプタ内で解決する。 */
const PATH_BY_PAGE: Record<string, string> = {
  dash: "/",
  courses: "/courses",
  cert: "/certificates",
  "interview-prep": "/interview-prep",
  "review-queue": "/review-queue",
  gradebook: "/gradebook",
  students: "/students",
  users: "/users",
  enrollments: "/enrollments",
  assignments: "/assignments",
  audit: "/audit",
  orgs: "/orgs",
  report: "/report",
  settings: "/settings",
};

/** URL → 旧ページキー (Sidebar のアクティブ表示用)。 */
function pageKeyFromPath(path: string): string {
  if (path.startsWith("/courses/")) {
    return path.includes("/lessons/") ? "lesson" : "course-detail";
  }
  if (path.startsWith("/reviews/")) return "review";
  if (path.startsWith("/submissions/")) return "submission-result";
  const hit = Object.entries(PATH_BY_PAGE).find(([, p]) => p === path);
  return hit ? hit[0] : path.replace(/^\//, "") || "dash";
}

/** `/courses/$courseId/...` から courseId を取り出す (無ければ null)。 */
function courseIdFromPath(path: string): string | null {
  const m = path.match(/^\/courses\/([^/]+)/);
  const id = m?.[1];
  return id ? decodeURIComponent(id) : null;
}

function firstLessonId(course: Course): string | null {
  // 先頭セクションが空のコースがあるため、 全セクションを横断して最初のレッスンを取る。
  return course.sections?.flatMap((sec) => sec.lessons).find(Boolean)?.id ?? null;
}

export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  // どのルートにも一致しなかった URL (`_app/$` の 404)。
  const isUnknownRoute = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId === "/_app/$"),
  });
  const page = pageKeyFromPath(pathname);

  const defaultTenant = TENANTS.find((t) => t.id === DEFAULTS.tenant) ?? TENANTS[0];

  const backendEnabled = isBackendConfigured();
  const {
    session,
    profile,
    loading: authLoading,
    inviteRequired,
    refreshProfile,
  } = useAuthSession();

  // Lazy init from localStorage so StrictMode's double-effect can't overwrite
  // our restored state with fresh defaults.
  const [stage, setStage] = useState<Stage>(() => {
    const saved = loadSaved()?.stage;
    if (saved === "app" || saved === "login") return saved;
    // 旧デモの tenant-select は廃止。保存されていてもアプリへ進む。
    if (saved === "tenant-select") return "app";
    return "login";
  });
  const [tenant, setTenant] = useState<Tenant>(() => {
    const saved = loadSaved();
    return (saved?.tenantId && TENANTS.find((t) => t.id === saved.tenantId)) || defaultTenant;
  });
  const [role, setRole] = useState<Role>(() => loadSaved()?.role ?? DEFAULTS.role);
  const [uiRoleOverride, setUiRoleOverride] = useState<Role | null>(
    () => loadSaved()?.uiRoleOverride ?? null,
  );
  const [lastLocation, setLastLocation] = useState<LastLocation | null>(
    () => loadSaved()?.lastLocation ?? null,
  );
  // 検索パレット → コース管理のハイライト対象。 通常のページ遷移では毎回クリアする。
  // `seq` は「同じコースを続けて選び直した」ことを子に伝えるための版番号。
  const [highlightCourse, setHighlightCourse] = useState<{
    id: string;
    seq: number;
  } | null>(null);
  const [tweaksVisible, setTweaksVisible] = useState(false);
  // lg 未満でのみ使うナビゲーションドロワーの開閉。
  const [navOpen, setNavOpen] = useState(false);
  const isNarrow = useIsNarrowViewport();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContext, setAiContext] = useState<ChatContext>({ kind: "general" });
  const [showAIBot, setShowAIBot] = useState(() => loadSaved()?.showAIBot ?? DEFAULTS.showAIBot);
  // 「選択してから遷移する」旧 API (setCurrentCourse → setPage('course-detail') 等) の
  // 橋渡し。 URL が真実になったため state ではなく ref で十分。
  const selectedCourseRef = useRef<Course | null>(null);
  const reviewIdRef = useRef<string | null>(null);
  const prevSessionRef = useRef<{ tenantId: Tenant["id"]; role: Role } | null>(null);

  // バックエンドが設定済みかつ profile を取得済みなら、 そこから role / tenant を上書きする。
  // staff は UI だけ受講者シェルへ切り替えられる（認可は profiles.role のまま）。
  const { role: effectiveRole, canSwitchToLearner } = resolveUiRole({
    backendEnabled,
    profileRole: profile?.role,
    uiRoleOverride,
    demoRole: role,
  });
  const effectiveTenant: Tenant = useMemo(() => {
    if (backendEnabled && profile) {
      // DB (GET /api/me の tenant) を真実とする。 seed カタログに無いテナントでも
      // fixtures の 'ses' 等へフォールバックせず、 実テナントとして扱う。
      const info = profile.tenant;
      const seedIcon = TENANTS.find((t) => t.id === profile.tenant_id)?.icon;
      const icon: Tenant["icon"] =
        info?.icon === "cpu" || info?.icon === "school" ? info.icon : (seedIcon ?? "school");
      return {
        id: profile.tenant_id,
        name: info?.name ?? profile.tenant_id,
        subtitle: info?.subtitle ?? "",
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
          email: profile.email ?? "",
          initials: profile.initials ?? profile.display_name.slice(0, 2),
          avatarUrl: profile.avatar_url ?? null,
        };
      }
      // profile 取得前の過渡状態でも fixtures のデモユーザーは出さない。
      const email = session?.user.email ?? "";
      return {
        name: email || "ユーザー",
        email,
        initials: (email || "U").slice(0, 2).toUpperCase(),
      };
    }
    return CURRENT_USER;
  }, [backendEnabled, profile, session]);

  // 受講者は「自分に割り当てられたコース」(enrollment ベース) を見る。 instructor/admin は
  // 従来どおりテナントのコース一覧を使う (公開コースを「探す」用途)。
  // staff が受講者シェルを開いている場合も enrollment ベース (= 受講者と同じ経路)。
  // 受講者画面を確認したい staff は対象講座に自分を受講登録しておく。
  const browseCourses = useCoursesForTenant(effectiveTenant.id, effectiveRole !== "learner");
  const enrolledCourses = useEnrolledCoursesForTenant(
    effectiveTenant.id,
    session?.user.id ?? null,
    effectiveRole === "learner",
  );
  // DB 由来コースは progress=0 で届くため、 レッスン進捗ストアから実進捗を導出する。
  const progressMap = useLessonProgressMap();
  const rawCourses = effectiveRole === "learner" ? enrolledCourses.courses : browseCourses.courses;
  const courses = useMemo(
    () => rawCourses.map((c) => deriveCourseProgress(c, progressMap)),
    [rawCourses, progressMap],
  );

  const courseError = effectiveRole === "learner" ? enrolledCourses.error : browseCourses.error;
  // 検索 API は staff に同テナントの全講座 (draft 含む) を返すため、 staff が受講者シェルを
  // 開いているときだけクライアント側で自分の講座に絞る。 受講者は API 側で既に絞られており、
  // ここで絞ると enrollment のロード中 / 取得失敗時に検索結果が空になるので触らない。
  const scopeSearchToOwnCourses = effectiveRole === "learner" && canSwitchToLearner;
  // LearnerDashboard への props 渡し用（二重 fetch 回避）。
  const announcements = useAnnouncements(effectiveTenant.id, effectiveRole === "learner");
  const pendingReviewCount = usePendingReviewCount(effectiveTenant.id);
  // サイドバーのバッジ件数は固定モック値ではなく実データで出す。
  const myCertificates = useMyCertificates(session?.user.id ?? null, effectiveRole === "learner");
  const sidebarCounts =
    effectiveRole === "learner"
      ? {
          cert: backendEnabled
            ? myCertificates.certificates.length
            : courses.filter((c) => c.completed).length,
        }
      : effectiveRole === "instructor"
        ? {
            "review-queue": pendingReviewCount,
          }
        : undefined;
  // 通知センター (Issue #25)。 バックエンド未設定 / 未ログイン時はフック内部で空になる。
  // userId を鍵に含め、 ユーザー切替時に前ユーザーの通知が残らないようにする。
  const notifications = useNotifications(effectiveTenant.id, session?.user.id ?? null, true);

  const openSubmissionResult = useCallback(
    (id: string) => {
      void navigate({
        to: "/submissions/$submissionId",
        params: { submissionId: id },
      });
    },
    [navigate],
  );

  const setCurrentCourse = useCallback((c: Course) => {
    selectedCourseRef.current = c;
  }, []);
  const onOpenReview = useCallback((id: string) => {
    reviewIdRef.current = id;
  }, []);

  const doLogout = useCallback(async () => {
    reviewIdRef.current = null;
    setUiRoleOverride(null);
    try {
      if (backendEnabled) {
        await authSignOut();
      }
      setStage("login");
      await navigate({ to: "/" });
      toast("ログアウトしました");
    } catch (err) {
      console.error("[logout]", err);
      toast.error("ログアウトに失敗しました");
    }
  }, [backendEnabled, navigate]);

  const switchToLearnerView = useCallback(() => {
    setNavOpen(false);
    setUiRoleOverride("learner");
    void navigate({ to: "/" });
  }, [navigate]);

  const returnToStaffView = useCallback(() => {
    setNavOpen(false);
    setUiRoleOverride(null);
    void navigate({ to: "/" });
  }, [navigate]);

  /**
   * 旧ページキー互換の遷移アダプタ。 既存画面コンポーネントの `setPage(key)` を
   * URL 遷移へ変換する。 パラメータ付きページは直前に控えた選択 (ref) や
   * lastLocation / 現在の URL から解決する。
   */
  const setPage = useCallback(
    (key: string) => {
      setHighlightCourse(null);
      if (key === "__logout") {
        void doLogout();
        return;
      }
      if (key === "__ai") {
        setAiOpen(true);
        return;
      }
      if (key === "course-detail") {
        // 戻る/進むで古いコースに戻った直後は ref が別コースを指しうるため URL を優先する。
        const courseId = courseIdFromPath(pathname) ?? selectedCourseRef.current?.id;
        void navigate(
          courseId ? { to: "/courses/$courseId", params: { courseId } } : { to: "/courses" },
        );
        return;
      }
      if (key === "lesson") {
        // サイドバーの「現在のレッスン」。 受講位置 → 選択中コース → 先頭コースの順で解決。
        const target =
          (lastLocation && courses.find((c) => c.id === lastLocation.courseId)) ||
          selectedCourseRef.current ||
          courses[0];
        const lessonId =
          (target && lastLocation?.courseId === target.id ? lastLocation.lessonId : null) ??
          (target ? firstLessonId(target) : null);
        if (target && lessonId) {
          void navigate({
            to: "/courses/$courseId/lessons/$lessonId",
            params: { courseId: target.id, lessonId },
          });
        } else {
          void navigate({ to: "/courses" });
        }
        return;
      }
      if (key === "review") {
        const id = reviewIdRef.current;
        void navigate(
          id
            ? { to: "/reviews/$submissionId", params: { submissionId: id } }
            : { to: "/review-queue" },
        );
        return;
      }
      if (key === "submission-result") {
        // 旧フローでは onOpenSubmission が担う。 直接来た場合はダッシュボードへ。
        void navigate({ to: "/" });
        return;
      }
      void navigate({ to: PATH_BY_PAGE[key] ?? "/" });
    },
    [courses, doLogout, lastLocation, navigate, pathname],
  );

  /**
   * レッスン画面を「指定のレッスンで」開く。 ダッシュボードの「続きから学習」・ シラバスの
   * 行クリック・ 検索パレットの共通導線。 開いた位置は `lastLocation` に控える。
   */
  const openLesson = useCallback(
    (course: Course, lessonId: string) => {
      selectedCourseRef.current = course;
      setLastLocation({ courseId: course.id, lessonId });
      void navigate({
        to: "/courses/$courseId/lessons/$lessonId",
        params: { courseId: course.id, lessonId },
      });
    },
    [navigate],
  );

  /**
   * レッスン画面内での切替 (サイドバー / 次のレッスン) を受講位置と URL へ反映する。
   * replace で履歴を汚さない (戻るでレッスンを 1 つずつ遡らせない)。
   */
  const handleActiveLessonChange = useCallback(
    (courseId: string, lessonId: string) => {
      setLastLocation((prev) =>
        prev?.courseId === courseId && prev.lessonId === lessonId ? prev : { courseId, lessonId },
      );
      void navigate({
        to: "/courses/$courseId/lessons/$lessonId",
        params: { courseId, lessonId },
        replace: true,
      });
    },
    [navigate],
  );

  /** 検索パレットのヒットを開く。 受講者は受講画面、 staff はコース管理画面へ。 */
  const handleSearchSelect = (result: SearchResult) => {
    if (effectiveRole === "learner") {
      const target = courses.find((c) => c.id === result.course_id);
      if (!target) {
        toast.error("このコースは現在受講対象に含まれていません");
        return;
      }
      if (result.kind === "lesson") {
        openLesson(target, result.id);
        return;
      }
      selectedCourseRef.current = target;
      void navigate({
        to: "/courses/$courseId",
        params: { courseId: target.id },
      });
      return;
    }
    // instructor / admin: コース管理画面へ。 admin は該当コースの編集画面を直接開き、
    // instructor は一覧内で該当コースをハイライトする。
    setHighlightCourse((prev) => ({
      id: result.course_id,
      seq: (prev?.seq ?? 0) + 1,
    }));
    void navigate({ to: "/courses" });
  };

  // 未ログインで開いた保護 URL (共有リンク等) を控える。 Google OAuth は固定で
  // /auth/callback に戻るため、 AuthCallback がこれを読んで元の URL へ復元する。
  useEffect(() => {
    // 404 の URL を復帰先に残すとログイン直後にまた 404 を踏むので除外する。
    if (backendEnabled && !authLoading && !session && pathname !== "/" && !isUnknownRoute) {
      sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, pathname + window.location.search);
    }
  }, [backendEnabled, authLoading, session, pathname, isUnknownRoute]);

  // lg に広がったらドロワーを閉じる。 CSS で隠すだけでは Radix のモーダルロック
  // (body の pointer-events / フォーカストラップ) が残り、 デスクトップ UI が操作不能になる。
  useEffect(() => {
    if (!isNarrow) setNavOpen(false);
  }, [isNarrow]);

  // レッスン以外に移動したら AI の文脈を general にリセット
  useEffect(() => {
    if (!pathname.includes("/lessons/")) {
      setAiContext({ kind: "general" });
    }
  }, [pathname]);

  // テナント / ロール切替時のみ添削対象をクリア
  useEffect(() => {
    const prev = prevSessionRef.current;
    if (prev && (prev.tenantId !== tenant.id || prev.role !== role)) {
      reviewIdRef.current = null;
    }
    prevSessionRef.current = { tenantId: tenant.id, role };
  }, [tenant.id, role]);

  useEffect(() => {
    localStorage.setItem(
      "lms_state",
      JSON.stringify({
        stage,
        role,
        tenantId: tenant.id,
        showAIBot,
        lastLocation,
        uiRoleOverride,
      }),
    );
  }, [stage, role, tenant, showAIBot, lastLocation, uiRoleOverride]);

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
      const inField = tag === "INPUT" || tag === "TEXTAREA" || Boolean(target?.isContentEditable);
      if (inField) return;
      if (e.key === "`") {
        e.preventDefault();
        setTweaksVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ----- 認証/オンボーディングの分岐 -----

  if (backendEnabled) {
    if (authLoading) {
      return <PageSkeleton label="セッション復元中" />;
    }
    if (!session) {
      return <LoginScreen />;
    }
    if (inviteRequired) {
      return (
        <InviteRequiredScreen
          email={session.user.email ?? ""}
          onSignOut={() => void authSignOut()}
        />
      );
    }
    // backendEnabled + session (+ profile or transient null): アプリへ進む (stage 関係なし)
  } else {
    // 既存の fixtures フロー (バックエンド未設定時)
    if (stage === "login") {
      return (
        <LoginScreen
          onMockLogin={() => {
            setTenant(TENANTS[0] ?? tenant);
            setStage("app");
            void navigate({ to: "/" });
          }}
        />
      );
    }
  }

  const isFlush = page === "lesson" || page === "review";

  const shellValue: AppShellValue = {
    role: effectiveRole,
    setPage,
    courses,
    setCurrentCourse,
    onOpenLesson: openLesson,
    onActiveLessonChange: handleActiveLessonChange,
    onOpenAIBot: () => setAiOpen(true),
    setAIContext: setAiContext,
    tenantId: effectiveTenant.id,
    tenantName: effectiveTenant.name,
    currentUserId: session?.user.id ?? null,
    backendEnabled,
    onOpenReview,
    studentName: effectiveUser.name,
    studentInitials: effectiveUser.initials,
    announcementsHook: announcements,
    coursesError: courseError,
    onOpenSubmission: openSubmissionResult,
    profileRole: profile?.role,
    profile,
    onProfileUpdated: refreshProfile,
    highlightCourse,
  };

  return (
    <>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[232px_1fr]">
        {/* lg 未満ではサイドバーを畳み、 Topbar のハンバーガーからドロワーで開く。
            `lg:contents` で通常時は aside 自体がグリッド列になる。 */}
        <div className="hidden lg:contents">
          <Sidebar
            role={effectiveRole}
            page={page}
            setPage={setPage}
            user={effectiveUser}
            counts={sidebarCounts}
            profileRole={profile?.role}
            canSwitchToLearner={canSwitchToLearner}
            onSwitchToLearner={switchToLearnerView}
            onReturnToStaff={returnToStaffView}
          />
        </div>
        <DialogPrimitive.Root open={navOpen} onOpenChange={setNavOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 lg:hidden" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 left-0 z-50 outline-hidden lg:hidden"
            >
              <DialogPrimitive.Title className="sr-only">
                メインナビゲーション
              </DialogPrimitive.Title>
              <Sidebar
                role={effectiveRole}
                page={page}
                setPage={(key) => {
                  setNavOpen(false);
                  setPage(key);
                }}
                user={effectiveUser}
                counts={sidebarCounts}
                profileRole={profile?.role}
                canSwitchToLearner={canSwitchToLearner}
                onSwitchToLearner={switchToLearnerView}
                onReturnToStaff={returnToStaffView}
              />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
        <div className="min-w-0 flex flex-col">
          <Topbar
            onOpenNav={() => setNavOpen(true)}
            onSearchSelect={handleSearchSelect}
            searchCourseIds={scopeSearchToOwnCourses ? new Set(courses.map((c) => c.id)) : null}
            learnerPreview={
              canSwitchToLearner && effectiveRole === "learner"
                ? { profileRole: profile?.role, onReturnToStaff: returnToStaffView }
                : null
            }
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
          <div
            className={isFlush ? "flex-1 min-w-0" : "p-4 sm:p-7 flex-1 min-w-0 overflow-x-hidden"}
          >
            <AppShellContext.Provider value={shellValue}>
              <Outlet />
            </AppShellContext.Provider>
          </div>
        </div>
      </div>

      {/* Floating AI chatbot (learner only) — lesson 内でも開けるよう gate を撤廃 */}
      {showAIBot && effectiveRole === "learner" ? (
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
            void navigate({ to: "/" });
          }}
          onTenant={(t) => setTenant(t)}
          onToggleAIBot={() => setShowAIBot((v) => !v)}
        />
      ) : null}
    </>
  );
}

function NotFoundNotice({
  title,
  description,
  backLabel,
  onBack,
}: {
  title: string;
  description: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <div className="text-[15px] font-semibold mb-2">{title}</div>
      <div className="text-[12.5px] text-ink-3 mb-4">{description}</div>
      <button
        type="button"
        className="text-[12.5px] text-brand underline underline-offset-2"
        onClick={onBack}
      >
        {backLabel}
      </button>
    </div>
  );
}

/** URL の courseId が受講対象に見つからないとき (削除 / 受講解除 / 共有リンク切れ)。 */
export function CourseNotFoundNotice({ setPage }: { setPage: (p: string) => void }) {
  return (
    <NotFoundNotice
      title="コースが見つかりません"
      description="このコースは削除されたか、 現在の受講対象に含まれていません。"
      backLabel="コース一覧に戻る"
      onBack={() => setPage("courses")}
    />
  );
}

/** URL の lessonId がコース内に見つからないとき (削除 / 共有リンク切れ)。 */
export function LessonNotFoundNotice({ setPage }: { setPage: (p: string) => void }) {
  return (
    <NotFoundNotice
      title="レッスンが見つかりません"
      description="このレッスンは削除されたか、 コースの構成が変更された可能性があります。"
      backLabel="コース詳細に戻る"
      onBack={() => setPage("course-detail")}
    />
  );
}

export function EmptyCoursesNotice({ setPage }: { setPage: (p: string) => void }) {
  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <div className="text-[15px] font-semibold mb-2">受講可能なコースがありません</div>
      <div className="text-[12.5px] text-ink-3 mb-4">
        現在このテナントに公開中のコースはありません。 管理者がコースを公開するまでお待ちください。
      </div>
      <button
        type="button"
        className="text-[12.5px] text-brand underline underline-offset-2"
        onClick={() => setPage("dash")}
      >
        ダッシュボードに戻る
      </button>
    </div>
  );
}

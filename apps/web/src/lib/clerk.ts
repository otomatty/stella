/**
 * Clerk (本番のログイン) の読み込みと、自作のログイン画面から呼ぶ流れ。
 *
 * ログイン・確認コード・Google でのログイン・セッションの更新と失効は Clerk が受け持ち、
 * アプリはパスワードも確認コードも持たない (画面の入力はブラウザから Clerk へ直接送られる)。
 * Clerk の画面部品は使わず、`no-rhc` (外から追加のスクリプトを読み込まない) の版を使う。
 *
 *   - メールの確認コード … 既に Clerk に居る人はサインイン、初めての人はサインアップとして
 *     同じ画面で扱う (招待済みかはアプリの `/api/me` が決める)
 *   - Google … Clerk の OAuth へ移り、`/auth/callback` に戻ってセッションを作る
 */

import type { Clerk as ClerkClass } from "@clerk/clerk-js";

type ClerkInstance = InstanceType<typeof ClerkClass>;

/** Google から戻る場所 (Clerk のダッシュボードの許可するリダイレクト先にも入れる)。 */
export const CLERK_CALLBACK_PATH = "/auth/callback";

export function clerkPublishableKey(): string {
  return (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "").trim();
}

let loading: Promise<ClerkInstance> | null = null;

/** Clerk を 1 回だけ読み込む (画面の SDK がセッションを復元し、トークンを更新し続ける)。 */
export function loadClerk(): Promise<ClerkInstance> {
  if (!loading) {
    const key = clerkPublishableKey();
    loading = (async () => {
      if (!key) throw new Error("VITE_CLERK_PUBLISHABLE_KEY が設定されていません");
      const { Clerk } = await import("@clerk/clerk-js/no-rhc");
      const clerk = new Clerk(key);
      await clerk.load();
      return clerk;
    })().catch((err: unknown) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

/** API に送るセッショントークン (約 60 秒で切れ、SDK が更新する)。ログインしていなければ null。 */
export async function clerkSessionToken(
  options: { skipCache?: boolean } = {},
): Promise<string | null> {
  const clerk = await loadClerk();
  if (!clerk.session) return null;
  return (
    (await clerk.session.getToken(options.skipCache ? { skipCache: true } : undefined)) ?? null
  );
}

export interface ClerkUserSummary {
  id: string;
  email: string | null;
}

/** いまログインしている Clerk の利用者 (居なければ null)。 */
export async function clerkCurrentUser(): Promise<ClerkUserSummary | null> {
  const clerk = await loadClerk();
  if (!clerk.session || !clerk.user) return null;
  return { id: clerk.user.id, email: clerk.user.primaryEmailAddress?.emailAddress ?? null };
}

/** ログイン状態が変わったら呼ぶ (最初の 1 回は呼ばない)。 */
export async function onClerkUserChange(
  callback: (user: ClerkUserSummary | null) => void,
): Promise<() => void> {
  const clerk = await loadClerk();
  let last = clerk.session?.id ?? null;
  return clerk.addListener(
    ({ session, user }) => {
      const id = session?.id ?? null;
      if (id === last) return;
      last = id;
      callback(
        session && user
          ? { id: user.id, email: user.primaryEmailAddress?.emailAddress ?? null }
          : null,
      );
    },
    { skipInitialEmit: true },
  );
}

export async function clerkSignOut(): Promise<void> {
  const clerk = await loadClerk();
  await clerk.signOut();
}

/** 確認コードをどちらの手続きで送ったか (確かめるときに同じ手続きを使う)。 */
export type EmailCodeFlow = "sign_in" | "sign_up";

interface ClerkErrorLike {
  errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
}

function clerkErrorCodes(err: unknown): string[] {
  const errors = (err as ClerkErrorLike | null)?.errors;
  return Array.isArray(errors) ? errors.map((e) => e.code ?? "") : [];
}

/** Clerk のエラーを画面の文に直す。 */
export function clerkErrorMessage(err: unknown): string {
  const codes = clerkErrorCodes(err);
  if (codes.includes("form_code_incorrect")) return "確認コードが違います";
  if (codes.includes("verification_expired")) {
    return "確認コードの有効期限が切れました。コードを送り直してください";
  }
  if (codes.includes("verification_failed") || codes.includes("too_many_requests")) {
    return "試行の回数が多すぎます。しばらく待ってからやり直してください";
  }
  if (codes.includes("form_param_format_invalid")) return "メールアドレスの形が正しくありません";
  if (codes.includes("strategy_for_user_invalid")) {
    return "このメールアドレスでは確認コードでのログインを使えません。Google でログインしてください";
  }
  const first = (err as ClerkErrorLike | null)?.errors?.[0];
  if (first?.longMessage || first?.message) return first.longMessage ?? first.message ?? "";
  return err instanceof Error ? err.message : "ログインに失敗しました";
}

/**
 * メールアドレスに確認コードを送る。Clerk にまだ居ない人 (初めてログインする招待者) は
 * サインアップの確認コードを送る。
 */
export async function sendEmailCode(email: string): Promise<EmailCodeFlow> {
  const clerk = await loadClerk();
  const client = clerk.client;
  if (!client) throw new Error("ログインの準備ができていません。ページを読み込み直してください");
  try {
    const signIn = await client.signIn.create({ identifier: email });
    const factor = signIn.supportedFirstFactors?.find((f) => f.strategy === "email_code");
    if (!factor || !("emailAddressId" in factor)) {
      throw new Error("確認コードでのログインが有効になっていません (Clerk の設定)");
    }
    await signIn.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: factor.emailAddressId,
    });
    return "sign_in";
  } catch (err) {
    if (!clerkErrorCodes(err).includes("form_identifier_not_found")) throw err;
    const signUp = await client.signUp.create({ emailAddress: email });
    await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    return "sign_up";
  }
}

function statusMessage(status: string | null): string {
  if (status === "needs_second_factor") {
    return "多要素認証が必要な設定です。管理者に連絡してください";
  }
  return "ログインを完了できませんでした。最初からやり直してください";
}

/** 届いた確認コードを確かめ、セッションを作る。 */
export async function verifyEmailCode(flow: EmailCodeFlow, code: string): Promise<void> {
  const clerk = await loadClerk();
  const client = clerk.client;
  if (!client) throw new Error("ログインの準備ができていません。ページを読み込み直してください");
  if (flow === "sign_in") {
    const signIn = await client.signIn.attemptFirstFactor({ strategy: "email_code", code });
    if (signIn.status !== "complete" || !signIn.createdSessionId) {
      throw new Error(statusMessage(signIn.status));
    }
    await clerk.setActive({ session: signIn.createdSessionId });
    return;
  }
  const signUp = await client.signUp.attemptEmailAddressVerification({ code });
  if (signUp.status !== "complete" || !signUp.createdSessionId) {
    throw new Error(statusMessage(signUp.status));
  }
  await clerk.setActive({ session: signUp.createdSessionId });
}

/** Google から戻ったあとに開くページ (ログイン前に開こうとしていた URL) を控える場所。 */
const RETURN_TO_KEY = "stella_auth_return_to_v1";

/** 同じオリジンのパスだけを戻り先にする (`//evil.example` のような別オリジンへは戻さない)。 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  if (value.startsWith(CLERK_CALLBACK_PATH)) return "/";
  return value;
}

/** Google でのログインへ移る (戻り先は `/auth/callback`。そのあとログイン前に開いていたページへ戻す)。 */
export async function signInWithGoogle(): Promise<void> {
  const clerk = await loadClerk();
  const client = clerk.client;
  if (!client) throw new Error("ログインの準備ができていません。ページを読み込み直してください");
  const { pathname, search, hash } = window.location;
  const returnTo = safeReturnPath(`${pathname}${search}${hash}`);
  try {
    window.sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  } catch {
    // 控えられなければトップへ戻るだけ。
  }
  await client.signIn.authenticateWithRedirect({
    strategy: "oauth_google",
    redirectUrl: `${window.location.origin}${CLERK_CALLBACK_PATH}`,
    redirectUrlComplete: `${window.location.origin}${returnTo}`,
  });
}

function takeReturnPath(): string {
  try {
    const saved = window.sessionStorage.getItem(RETURN_TO_KEY);
    window.sessionStorage.removeItem(RETURN_TO_KEY);
    return safeReturnPath(saved);
  } catch {
    return "/";
  }
}

/** Google から戻ったところで、サインイン (初めてならサインアップ) を仕上げ、元のページへ戻す。 */
export async function completeOAuthRedirect(): Promise<void> {
  const clerk = await loadClerk();
  const returnTo = takeReturnPath();
  await clerk.handleRedirectCallback(
    {
      signInForceRedirectUrl: returnTo,
      signUpForceRedirectUrl: returnTo,
      signInFallbackRedirectUrl: returnTo,
      signUpFallbackRedirectUrl: returnTo,
    },
    async (to) => {
      window.location.replace(to);
    },
  );
}

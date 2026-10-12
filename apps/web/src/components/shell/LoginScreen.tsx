import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Brand } from "@/components/common/Brand";
import { LoginMilkyWay } from "@/components/shell/LoginMilkyWay";
import { Button } from "@/components/ui/button";
import { usePublicUnits } from "@/hooks/usePublicContent";
import { isApiConfigured } from "@/lib/api-client";
import { isBackendConfigured } from "@/lib/backend";
import { ACCESS_LOGOUT_PATH, isAccessMode, signInWithDevToken } from "@/lib/auth-client";

interface LoginScreenProps {
  /** バックエンド未設定時の fixtures 用モックログイン。 */
  onMockLogin?: () => void;
  /** access で profile を取れなかった理由。 */
  error?: string | null;
}

/**
 * ログイン画面。 ログインそのものは Cloudflare Access が受け持つので、 本番 (access) でここが
 * 出るのは「Access は通ったのにアプリが利用者を確かめられなかった」ときだけ。 ローカル
 * (dev-token) は開発用トークンを貼り付けるフォーム、 バックエンド未設定はデモの入口を出す。
 */
export const LoginScreen = ({ onMockLogin, error }: LoginScreenProps) => {
  // ログインなしで読める導入案内 (Issue #41)。公開の単元があるときだけ入口を出す
  // (本文がまだ無い間は、空の案内ページへ誘わない)。
  const { data: publicUnits } = usePublicUnits(isApiConfigured());

  const body = !isBackendConfigured() ? (
    <DemoLogin onMockLogin={onMockLogin} />
  ) : isAccessMode() ? (
    <AccessRetry error={error ?? null} />
  ) : (
    <DevTokenLogin />
  );

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-background">
      <div className="flex items-center justify-center p-8 md:p-10">
        <div className="w-full max-w-[360px]">
          <Brand size="md" className="mb-10" />

          {body}

          {publicUnits.length > 0 ? (
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-3">
              はじめての方は、ログインの前に
              <Link to="/start" className="text-brand underline underline-offset-2">
                VS Code の準備
              </Link>
              を読めます。
            </p>
          ) : null}

          <p className="mt-8 text-[11.5px] leading-relaxed text-ink-3 text-center">
            ログインできない場合は
            <Link to="/support" className="text-brand underline underline-offset-2">
              サポート
            </Link>
            までお問い合わせください。
          </p>
        </div>
      </div>

      {/* アートの罫線・文字色が暗い地に載る前提で作られているので、 ここだけは
          テーマに関係なく暗いまま固定する (スライドの lead 面と同じ #141418)。
          ダークテーマだと左の面 (#0d0d10) とほぼ同じ濃さになって「2 面ある」ことが
          読めなくなるので、 継ぎ目にブランドグラデーションの 1px を立てて分ける。 */}
      <div className="hidden md:flex bg-[#141418] text-white relative overflow-hidden p-12 flex-col justify-center">
        <div className="absolute inset-y-0 left-0 w-px sf-gradient-bg opacity-70" />
        <LoginMilkyWay />
        {/* 文字が乗る左側の暗幕。 天の川は明るさが場所も時間も変わるので、
            可読性はシェーダ側の調整ではなくこの層で担保する。
            格子の飾りはここに重ねない — 星と同じ大きさの点と線が並ぶと、 どちらも
            「細かい模様」として溶け合って、 帯が読めなくなる。 */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141418] via-[#141418]/55 to-transparent" />

        <div className="relative z-10">
          {/* white/35 は #141418 上で 3.21:1 しか出ず 11px の本文には足りない (AA は 4.5:1)。
              天の川が地を持ち上げるぶんの余裕も見て 55% (6.15:1) にしてある。 */}
          <div className="text-[11px] font-display font-semibold tracking-[0.22em] text-white/55 mb-4">
            LEARNING PLATFORM
          </div>
          <p className="text-[28px] leading-snug tracking-tight max-w-[16em] font-medium">
            「学ぶ人の、
            <span className="sf-gradient-text-on-dark">はじめの一歩</span>に。」
          </p>
        </div>
      </div>
    </div>
  );
};

/** バックエンド未設定 (fixtures デモ)。 */
function DemoLogin({ onMockLogin }: { onMockLogin?: () => void }) {
  const onClick = () => {
    if (onMockLogin) {
      onMockLogin();
      return;
    }
    // 本番想定でバックエンド未設定の場合は無反応にせず、 原因とサポート導線を示す。
    toast.error(
      "ログインを開始できませんでした。 サーバ設定が未完了の可能性があります。 問題が続く場合はサポートへお問い合わせください。",
    );
  };
  return (
    <>
      <h1 className="text-[24px] tracking-tight font-semibold mb-2">ログイン</h1>
      <p className="text-ink-3 text-[13.5px] mb-7">
        バックエンド未設定のため、 デモのデータで開きます。
      </p>
      <Button type="button" variant="primary" size="full" onClick={onClick}>
        デモを開く
      </Button>
    </>
  );
}

/** access: Access は通ったが、 アプリが利用者を確かめられなかった。 */
function AccessRetry({ error }: { error: string | null }) {
  return (
    <>
      <h1 className="text-[24px] tracking-tight font-semibold mb-2">ログインを確認できません</h1>
      <p className="text-ink-3 text-[13.5px] leading-relaxed mb-3">
        Cloudflare Access のログインは済んでいますが、 STELLA
        があなたのアカウントを確認できませんでした。 ページを読み込み直すか、
        別のアカウントでログインし直してください。
      </p>
      {error ? (
        <p className="mb-5 rounded-md border border-border bg-sunken px-3 py-2 text-[12px] text-ink-2 break-words">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          size="full"
          onClick={() => window.location.reload()}
        >
          ログインし直す
        </Button>
        <Button asChild variant="outline" size="full">
          <a href={ACCESS_LOGOUT_PATH}>ログアウトして別のアカウントを使う</a>
        </Button>
      </div>
    </>
  );
}

/** dev-token: ローカル開発用。 発行した開発用トークンを貼り付けて保存する。 */
function DevTokenLogin() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = signInWithDevToken(token);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setToken("");
  };

  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-[24px] tracking-tight font-semibold mb-2">開発用ログイン</h1>
      <p className="text-ink-3 text-[13px] leading-relaxed mb-4">
        ローカル開発 (Cloudflare Access なし) 用の画面です。 開発用トークンを発行して貼り付けます。
      </p>
      <pre className="mb-4 overflow-x-auto rounded-md border border-border bg-sunken px-3 py-2 font-mono text-[11.5px] text-ink-2">
        bun run --filter=@stella/api dev:token seed-learner
      </pre>
      <p className="text-ink-3 text-[12px] leading-relaxed mb-4">
        profile ID は <code>seed-learner</code> / <code>seed-learner2</code> /{" "}
        <code>seed-instructor</code> / <code>seed-admin</code> / <code>seed-sales</code> など。
        トークンは API の <code>.dev.vars</code> の <code>DEV_AUTH_JWT_SECRET</code> で署名され、
        localhost の API だけが受け付けます。
      </p>
      <label htmlFor="dev-token" className="mb-1 block text-[12px] font-medium text-ink-2">
        開発用トークン
      </label>
      <textarea
        id="dev-token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        rows={4}
        spellCheck={false}
        autoComplete="off"
        placeholder="eyJhbGciOiJIUzI1NiIs..."
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "dev-token-error" : undefined}
        className="mb-2 w-full resize-y rounded-md border border-input bg-card px-3 py-2 font-mono text-[11.5px] break-all"
      />
      {error ? (
        <p id="dev-token-error" role="alert" className="mb-3 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="full" disabled={!token.trim()}>
        このトークンでログイン
      </Button>
    </form>
  );
}

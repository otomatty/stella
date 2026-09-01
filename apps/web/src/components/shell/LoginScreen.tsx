import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Google } from "@/lib/icons";
import { Brand } from "@/components/common/Brand";
import { LoginAurora } from "@/components/shell/LoginAurora";
import { Button } from "@/components/ui/button";
import { isBackendConfigured } from "@/lib/backend";
import { signInWithGoogle } from "@/lib/auth";

interface LoginScreenProps {
  /** バックエンド未設定時の fixtures 用モックログイン。 */
  onMockLogin?: () => void;
}

export const LoginScreen = ({ onMockLogin }: LoginScreenProps) => {
  const handleGoogleLogin = () => {
    if (!isBackendConfigured()) {
      // fixtures デモ (バックエンド未設定) はモックログインへ。
      if (onMockLogin) {
        onMockLogin();
        return;
      }
      // 本番想定でバックエンド未設定の場合は無反応にせず、 原因とサポート導線を示す。
      toast.error(
        "ログインを開始できませんでした。 サーバ設定が未完了の可能性があります。 問題が続く場合はサポートへお問い合わせください。",
      );
      return;
    }
    try {
      signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "ログインに失敗しました";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-background">
      <div className="flex items-center justify-center p-8 md:p-10">
        <div className="w-full max-w-[360px]">
          <Brand size="md" className="mb-10" />

          <h1 className="text-[24px] tracking-tight font-semibold mb-2">ログイン</h1>
          <p className="text-ink-3 text-[13.5px] mb-7">Google アカウントでログインしてください。</p>

          <Button type="button" variant="primary" size="full" onClick={handleGoogleLogin}>
            <Google width={16} height={16} />
            Googleでログイン
          </Button>

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
        <LoginAurora />
        {/* 文字が乗る左側の暗幕。 オーロラは明るさが場所も時間も変わるので、
            可読性はシェーダ側の調整ではなくこの層で担保する。 */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141418] via-[#141418]/55 to-transparent" />
        <div className="absolute inset-0 login-art-grid" />

        <div className="relative z-10">
          {/* white/35 は #141418 上で 3.21:1 しか出ず 11px の本文には足りない (AA は 4.5:1)。
              オーロラが地を持ち上げるぶんの余裕も見て 55% (6.15:1) にしてある。 */}
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

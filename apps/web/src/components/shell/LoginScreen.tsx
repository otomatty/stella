import { toast } from 'sonner';
import { Google } from '@/lib/icons';
import { Brand } from '@/components/common/Brand';
import { Button } from '@/components/ui/button';
import { isBackendConfigured } from "@/lib/backend";
import { signInWithGoogle } from '@/lib/auth';

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
        'ログインを開始できませんでした。 サーバ設定が未完了の可能性があります。 問題が続く場合はサポートへお問い合わせください。',
      );
      return;
    }
    try {
      signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ログインに失敗しました';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-12">
            <Brand size="md" />
          </div>

          <h1 className="text-[24px] tracking-tight font-semibold mb-2">ログイン</h1>
          <p className="text-ink-3 text-[13.5px] mb-7">
            Google アカウントでログインしてください。
          </p>

          <Button type="button" variant="primary" size="full" onClick={handleGoogleLogin}>
            <Google width={16} height={16} />
            Googleでログイン
          </Button>

          <div className="mt-8 text-[11.5px] text-ink-3 text-center">
            ログインできない場合は{' '}
            <a href="/support" className="text-brand underline underline-offset-2">
              サポート
            </a>{' '}
            までお問い合わせください。
          </div>
        </div>
      </div>

      <div className="hidden md:flex bg-ink text-card relative overflow-hidden p-12 flex-col justify-between">
        <div className="absolute inset-0 login-art-grid" />
        <div className="relative z-10">
          <Brand size="md" inverted subtitle="" title="" />
        </div>
        <div className="relative z-10">
          <div className="text-[26px] leading-snug tracking-tight max-w-[480px] font-medium">
            「学ぶ人の、<span className="text-[oklch(75%_0.13_85)]">はじめの一歩</span> に。」
          </div>
        </div>
        <div className="text-[12.5px] text-[oklch(75%_0.01_260)] relative z-10">
          v1.0 Draft · 2テナント稼働中 · 219名の受講者が学習中
        </div>
      </div>
    </div>
  );
};

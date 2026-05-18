import { useState } from 'react';
import { Mail, Google } from '@/lib/icons';
import { Brand } from '@/components/common/Brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginScreenProps {
  onLogin: (via: 'email' | 'google') => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('tanaka@example.com');
  const [sent, setSent] = useState(false);

  const sendMagic = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSent(true);
    setTimeout(() => onLogin('email'), 1400);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-12">
            <Brand size="md" />
          </div>

          {!sent ? (
            <>
              <h1 className="text-[24px] tracking-tight font-semibold mb-2">ログイン</h1>
              <p className="text-ink-3 text-[13.5px] mb-7">
                メールアドレスにログイン用リンクをお送りします。パスワードは不要です。
              </p>

              <form onSubmit={sendMagic}>
                <div className="mb-4">
                  <Label htmlFor="login-email">メールアドレス</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button type="submit" variant="accent" size="full">
                  <Mail size={15} />
                  ログインリンクを送信
                </Button>
              </form>

              <div className="flex items-center gap-3 my-5 text-ink-4 text-[11px] uppercase tracking-widest">
                <div className="flex-1 h-px bg-border" />
                または
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="full"
                onClick={() => onLogin('google')}
              >
                <Google width={16} height={16} />
                Googleでログイン
              </Button>
            </>
          ) : (
            <div className="text-center py-10">
              <div className="grid place-items-center w-14 h-14 rounded-full bg-brand-soft text-brand mx-auto mb-4">
                <Mail size={24} />
              </div>
              <h2 className="text-[18px] mb-1.5 font-semibold">メールを確認してください</h2>
              <p className="text-ink-3 text-[13px]">
                {email} 宛にリンクを送信しました。
                <br />
                リンクは15分間有効です。
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-border border-t-brand animate-spin-slow" />
                <span className="text-ink-3 text-[11.5px]">自動でログインします…</span>
              </div>
            </div>
          )}

          <div className="mt-8 text-[11.5px] text-ink-3 text-center">
            ログインできない場合は{' '}
            <a className="text-brand underline underline-offset-2">サポート</a> までお問い合わせください。
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
            「非専門家を <span className="text-[oklch(75%_0.13_85)]">一定水準の専門性</span>{' '}
            を持つ人材へ育てる」
            <div className="text-sm font-normal text-[oklch(80%_0.01_260)] mt-5 max-w-[440px] leading-relaxed">
              部活動指導者講習とSES未経験エンジニア育成。異なる領域を、同じ学習設計で支える汎用プラットフォーム。
            </div>
          </div>
        </div>
        <div className="text-[12.5px] text-[oklch(75%_0.01_260)] relative z-10">
          v1.0 Draft · 2テナント稼働中 · 219名の受講者が学習中
        </div>
      </div>
    </div>
  );
};

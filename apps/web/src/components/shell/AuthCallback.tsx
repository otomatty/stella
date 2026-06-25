import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, XCircle } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { completeAuthFromCallbackHash } from '@/lib/auth';

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const result = completeAuthFromCallbackHash(window.location.hash);
    if (result.ok) {
      window.location.replace('/');
      return;
    }
    // 失敗時は即バウンスせず、 原因を提示して再ログイン / サポート導線を出す。
    setError(result.error);
    toast.error(result.error);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-5">
        <div className="w-full max-w-[420px] rounded-md border border-border-2 bg-card p-6 text-center">
          <XCircle size={28} className="mx-auto mb-2 text-destructive" />
          <div className="mb-1 text-[15px] font-semibold">ログインに失敗しました</div>
          <p className="mb-5 text-[12.5px] leading-relaxed text-ink-3 break-words">{error}</p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="accent"
              size="full"
              onClick={() => window.location.replace('/')}
            >
              もう一度ログイン
            </Button>
            <a
              href="/support"
              className="text-[12px] text-brand underline underline-offset-2"
            >
              解決しない場合はサポートへ
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background text-ink-3">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 size={16} className="animate-spin" />
        ログイン処理中…
      </div>
    </div>
  );
}

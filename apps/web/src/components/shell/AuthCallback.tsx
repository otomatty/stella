import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from '@/lib/icons';
import { completeAuthFromCallbackHash } from '@/lib/auth';

export function AuthCallback() {
  const [message, setMessage] = useState('ログイン処理中…');

  useEffect(() => {
    const result = completeAuthFromCallbackHash(window.location.hash);
    if (result.ok) {
      window.location.replace('/');
      return;
    }
    setMessage(result.error);
    toast.error(result.error);
    window.setTimeout(() => window.location.replace('/'), 2500);
  }, []);

  return (
    <div className="min-h-screen grid place-items-center bg-background text-ink-3">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 size={16} className="animate-spin" />
        {message}
      </div>
    </div>
  );
}

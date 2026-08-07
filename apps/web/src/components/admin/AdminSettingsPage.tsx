/**
 * `/admin/settings` — テナント設定。
 *
 * テストモードの切り替えを行う。 テストモード ON のあいだは、 ユーザー登録 (招待) 時に
 * 動作確認用のテストデータ (受講登録・進捗・ウェルカム通知) が自動投入される。
 *
 * バックエンド未設定時 (fixtures デモ) は設定を保存する先が無いため、 その旨を案内する。
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FlaskConical, Loader2 } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchTenantSettings,
  updateTestMode,
} from '@/lib/admin-settings-api';

interface Props {
  tenantName: string;
  backendEnabled: boolean;
}

export const AdminSettingsPage = ({ tenantName, backendEnabled }: Props) => {
  const [testMode, setTestMode] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!backendEnabled) return;
    let cancelled = false;
    void fetchTenantSettings()
      .then((s) => {
        if (!cancelled) {
          setTestMode(s.test_mode);
          setError(null);
        }
      })
      .catch((err) => {
        console.error('[AdminSettingsPage] fetch failed', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '設定の取得に失敗しました');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendEnabled]);

  const onToggle = async () => {
    if (testMode === null) return;
    const next = !testMode;
    setSaving(true);
    try {
      const saved = await updateTestMode(next);
      setTestMode(saved.test_mode);
      toast.success(
        saved.test_mode ? 'テストモードを有効にしました' : 'テストモードを無効にしました',
      );
    } catch (err) {
      console.error('[AdminSettingsPage] update failed', err);
      toast.error(err instanceof Error ? err.message : '設定の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="設定" sub={`${tenantName} のテナント設定`} />

      {!backendEnabled ? (
        <Card className="text-center p-12 text-ink-3 text-sm">
          テナント設定はバックエンド接続時に利用できます (現在はデモ表示です)。
        </Card>
      ) : (
        <Card className="max-w-[720px]">
          <CardHeader>
            <CardTitle>テストモード</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-ink-3">
                <Loader2 size={15} className="animate-spin" />
                読み込み中…
              </div>
            ) : error ? (
              <div className="py-2 text-[12.5px] text-destructive">
                設定の取得に失敗しました: {error}
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-md bg-sunken grid place-items-center text-ink-2 shrink-0">
                  <FlaskConical size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13.5px] font-semibold">
                      テストモード
                    </span>
                    {testMode ? (
                      <Badge variant="warning">有効</Badge>
                    ) : (
                      <Badge>無効</Badge>
                    )}
                  </div>
                  <p className="text-[12.5px] text-ink-3 leading-relaxed">
                    有効にすると、 ユーザー登録 (招待) 時に動作確認用のテストデータを自動投入します。
                    受講者には公開中コースの受講登録 (期限30日・必須) と最初のレッスンの完了進捗、
                    全ロールにウェルカム通知が作成されます。 本番運用時は無効にしてください。
                  </p>
                </div>
                <Button
                  variant={testMode ? 'accent' : 'default'}
                  disabled={saving}
                  onClick={() => void onToggle()}
                >
                  {saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : null}
                  {testMode ? '無効にする' : '有効にする'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

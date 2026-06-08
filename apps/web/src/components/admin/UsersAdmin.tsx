/**
 * `/admin/users` — ユーザー管理 (Issue #22)。
 *
 * Supabase 設定時: 同テナントの `profiles` を実データで一覧し、 招待 (単体 / CSV 一括) /
 * ロール変更 / 無効化を service-role API 経由で行う。
 * Supabase 未設定時 (dev fixtures フロー): デモデータを read-only で表示する。
 */

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  Upload,
  Plus,
  Search,
  MoreHorizontal,
  Shield,
  Lock,
  Mail,
} from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type { AvatarTone } from '@/data/types';
import type { ProfileRole } from '@falcon/shared/cms/types';
import { isValidEmail, type InviteUserInput } from '@falcon/shared/admin/types';
import { parseInviteCsv } from '@falcon/shared/admin/parse-invite-csv';
import { useProfiles } from '@/hooks/useProfiles';
import {
  inviteUsers,
  setUserRole,
  setUserDisabled,
  type AdminProfileRow,
} from '@/lib/admin-users-api';

const ROLE_LABEL: Record<ProfileRole, string> = {
  student: '受講者',
  instructor: '講師',
  admin: '管理者',
};

const AVATAR_TONES: AvatarTone[] = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

function toneFromId(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[h] ?? 'c1';
}

function RoleBadge({ role }: { role: ProfileRole }) {
  if (role === 'instructor') return <Badge variant="accent">講師</Badge>;
  if (role === 'admin') return <Badge variant="solid">管理者</Badge>;
  return <Badge>受講者</Badge>;
}

interface Props {
  tenantId: string;
  tenantName: string;
  currentUserId: string | null;
  supabaseEnabled: boolean;
}

export function UsersAdmin({
  tenantId,
  tenantName,
  currentUserId,
  supabaseEnabled,
}: Props) {
  if (!supabaseEnabled) {
    return <UsersAdminDemo />;
  }
  return (
    <UsersAdminLive
      tenantId={tenantId}
      tenantName={tenantName}
      currentUserId={currentUserId}
    />
  );
}

// ---------------------------------------------------------------
// 実データ版
// ---------------------------------------------------------------

function UsersAdminLive({
  tenantId,
  tenantName,
  currentUserId,
}: {
  tenantId: string;
  tenantName: string;
  currentUserId: string | null;
}) {
  const { profiles, loading, error, refetch } = useProfiles(tenantId);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<ProfileRole | 'all'>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { student: 0, instructor: 0, admin: 0 };
    for (const p of profiles) c[p.role]++;
    return c;
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (!q) return true;
      return (
        p.display_name.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [profiles, query, roleFilter]);

  const onChangeRole = async (p: AdminProfileRow, role: ProfileRole) => {
    setMenuId(null);
    if (role === p.role) return;
    setBusyId(p.id);
    try {
      await setUserRole(p.id, role);
      toast.success(`${p.display_name} を「${ROLE_LABEL[role]}」に変更しました`);
      await refetch();
    } catch (err) {
      toast.error(`ロール変更失敗: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  };

  const onToggleDisabled = async (p: AdminProfileRow) => {
    setMenuId(null);
    setBusyId(p.id);
    try {
      await setUserDisabled(p.id, !p.disabled);
      toast.success(
        `${p.display_name} を${!p.disabled ? '無効化' : '有効化'}しました`,
      );
      await refetch();
    } catch (err) {
      toast.error(`状態変更失敗: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="ユーザー管理"
        sub={`${tenantName} のユーザーを管理 · CSV一括招待 / ロール割当`}
        actions={
          <>
            <Button onClick={() => setCsvOpen(true)}>
              <Upload size={14} />
              CSV一括招待
            </Button>
            <Button variant="accent" onClick={() => setInviteOpen(true)}>
              <Plus size={14} />
              ユーザーを招待
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border flex-wrap">
          <div className="flex items-center gap-2 bg-sunken border border-border rounded-md px-2.5 py-1.5 w-[280px] text-ink-3 text-[12.5px]">
            <Search size={13} />
            <input
              placeholder="名前・メールで検索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-none outline-none placeholder:text-ink-3"
            />
          </div>
          <FilterChip
            active={roleFilter === 'all'}
            onClick={() => setRoleFilter('all')}
            label={`全 ${profiles.length}名`}
          />
          <FilterChip
            active={roleFilter === 'student'}
            onClick={() => setRoleFilter('student')}
            label={`受講者 ${counts.student}`}
            variant="info"
          />
          <FilterChip
            active={roleFilter === 'instructor'}
            onClick={() => setRoleFilter('instructor')}
            label={`講師 ${counts.instructor}`}
            variant="accent"
          />
          <FilterChip
            active={roleFilter === 'admin'}
            onClick={() => setRoleFilter('admin')}
            label={`管理者 ${counts.admin}`}
          />
        </div>

        {loading && profiles.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">読み込み中…</div>
        ) : profiles.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">
            まだユーザーがいません。 「ユーザーを招待」 から追加してください。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>登録日</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className={p.disabled ? 'opacity-60' : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback tone={toneFromId(p.id)}>
                          {(p.initials ?? p.display_name.slice(0, 1)).slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{p.display_name}</span>
                      {p.id === currentUserId ? (
                        <span className="text-[10.5px] text-ink-3">(あなた)</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-ink-3">{p.email ?? '—'}</TableCell>
                  <TableCell>
                    <RoleBadge role={p.role} />
                  </TableCell>
                  <TableCell>
                    {p.disabled ? (
                      <Badge variant="danger">無効</Badge>
                    ) : (
                      <Badge variant="success">有効</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-ink-3 text-[11.5px]">
                    {new Date(p.created_at).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <div className="relative flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={p.id === currentUserId || busyId === p.id}
                        onClick={() => setMenuId((id) => (id === p.id ? null : p.id))}
                        title={
                          p.id === currentUserId
                            ? '自分自身は変更できません'
                            : '操作'
                        }
                      >
                        <MoreHorizontal size={13} />
                      </Button>
                      {menuId === p.id ? (
                        <RowMenu
                          profile={p}
                          onChangeRole={(role) => void onChangeRole(p, role)}
                          onToggleDisabled={() => void onToggleDisabled(p)}
                          onClose={() => setMenuId(null)}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tenantName={tenantName}
        onInvited={refetch}
      />
      <CsvInviteDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        tenantName={tenantName}
        onInvited={refetch}
      />
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  variant?: 'info' | 'accent';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'ring-2 ring-brand rounded-full' : ''}
    >
      <Badge variant={variant}>{label}</Badge>
    </button>
  );
}

function RowMenu({
  profile,
  onChangeRole,
  onToggleDisabled,
  onClose,
}: {
  profile: AdminProfileRow;
  onChangeRole: (role: ProfileRole) => void;
  onToggleDisabled: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* クリックアウトで閉じる透明レイヤ */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-7 z-20 w-48 bg-card border border-border rounded-md shadow-lg text-[12.5px] py-1">
        <div className="px-3 py-1.5 text-[11px] text-ink-3 flex items-center gap-1.5">
          <Shield size={12} />
          ロール変更
        </div>
        {(['student', 'instructor', 'admin'] as ProfileRole[]).map((role) => (
          <button
            key={role}
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-sunken flex items-center justify-between"
            onClick={() => onChangeRole(role)}
          >
            {ROLE_LABEL[role]}
            {profile.role === role ? <span className="text-brand">✓</span> : null}
          </button>
        ))}
        <div className="my-1 border-t border-border" />
        <button
          type="button"
          className="w-full text-left px-3 py-1.5 hover:bg-sunken flex items-center gap-1.5 text-destructive"
          onClick={onToggleDisabled}
        >
          <Lock size={12} />
          {profile.disabled ? '有効化する' : '無効化する'}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// 招待ダイアログ (単体)
// ---------------------------------------------------------------

function InviteDialog({
  open,
  onOpenChange,
  tenantName,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantName: string;
  onInvited: () => Promise<void> | void;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<ProfileRole>('student');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail('');
    setDisplayName('');
    setRole('student');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error('メールアドレスを入力してください');
      return;
    }
    if (!isValidEmail(trimmed)) {
      toast.error('有効なメールアドレスを入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const invites: InviteUserInput[] = [
        { email: trimmed, displayName: displayName.trim() || trimmed.split('@')[0]!, role },
      ];
      const res = await inviteUsers(invites);
      const first = res.results[0];
      if (first && first.ok) {
        toast.success(`${trimmed} を招待しました`);
        reset();
        onOpenChange(false);
        await onInvited();
      } else {
        toast.error(`招待失敗: ${first?.error ?? 'unknown'}`);
      }
    } catch (err) {
      toast.error(`招待失敗: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),460px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={16} />
            ユーザーを招待
          </DialogTitle>
          <DialogDescription>
            {tenantName} に招待メールを送ります。 受諾後、 指定したロールでログインできます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4 px-6 py-2">
          <div>
            <Label htmlFor="inv-email">メールアドレス</Label>
            <Input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="inv-name">表示名 (任意)</Label>
            <Input
              id="inv-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: 田中 翔太"
            />
          </div>
          <div>
            <Label htmlFor="inv-role">ロール</Label>
            <select
              id="inv-role"
              value={role}
              onChange={(e) => setRole(e.target.value as ProfileRole)}
              className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
            >
              <option value="student">受講者</option>
              <option value="instructor">講師</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <DialogFooter className="px-0 pb-2 border-t-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? '送信中…' : '招待を送る'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------
// CSV 一括招待ダイアログ
// ---------------------------------------------------------------

function CsvInviteDialog({
  open,
  onOpenChange,
  tenantName,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantName: string;
  onInvited: () => Promise<void> | void;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseInviteCsv(text), [text]);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
  };

  const submit = async () => {
    if (parsed.rows.length === 0) {
      toast.error('有効な行がありません');
      return;
    }
    setSubmitting(true);
    try {
      const res = await inviteUsers(parsed.rows);
      const ok = res.results.filter((r) => r.ok).length;
      const failed = res.results.filter((r) => !r.ok);
      if (ok > 0) {
        toast.success(`${ok} 件を招待しました`);
      }
      if (failed.length > 0) {
        toast.error(
          `${failed.length} 件失敗: ${failed
            .slice(0, 3)
            .map((f) => `${f.email} (${f.error})`)
            .join(', ')}${failed.length > 3 ? ' …' : ''}`,
        );
      }
      await onInvited();
      if (failed.length === 0) {
        setText('');
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(`一括招待失敗: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-2rem),560px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} />
            CSV一括招待
          </DialogTitle>
          <DialogDescription>
            {tenantName} へ一括招待します。 形式: <code>email, 表示名, ロール</code>{' '}
            (1 行 1 名 / ヘッダ行は自動スキップ)。 ロールは 受講者 / 講師 / 管理者。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-6 py-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => void onPickFile(e.target.files?.[0])}
            />
            <Button type="button" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={13} />
              CSVファイルを選択
            </Button>
            <span className="text-[11.5px] text-ink-3">または下に貼り付け</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'email,表示名,ロール\nhanako@example.com,山田 花子,講師\ntaro@example.com,田中 太郎,受講者'}
            className="h-40 w-full rounded-sm border border-input bg-card px-3 py-2 text-[12.5px] font-mono resize-y outline-none focus:border-brand"
          />
          <div className="text-[11.5px] text-ink-3 flex items-center gap-3">
            <span className="text-success">有効 {parsed.rows.length} 件</span>
            {parsed.errors.length > 0 ? (
              <span className="text-destructive">エラー {parsed.errors.length} 件</span>
            ) : null}
          </div>
          {parsed.errors.length > 0 ? (
            <div className="max-h-24 overflow-y-auto rounded-md border border-destructive/40 bg-danger-soft px-3 py-2 text-[11px] text-destructive">
              {parsed.errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={submitting || parsed.rows.length === 0}
            onClick={() => void submit()}
          >
            {submitting ? '送信中…' : `${parsed.rows.length} 件を招待`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------
// デモ版 (Supabase 未設定時)
// ---------------------------------------------------------------

const DEMO_USERS: Array<{
  n: string;
  c: AvatarTone;
  e: string;
  r: ProfileRole;
}> = [
  { n: '田中 翔太', c: 'c1', e: 'tanaka@example.com', r: 'student' },
  { n: '佐藤 美咲', c: 'c2', e: 'sato.m@example.com', r: 'student' },
  { n: '堀江メンター', c: 'c3', e: 'horie@ursal.co.jp', r: 'instructor' },
  { n: '鈴木 健一', c: 'c4', e: 'suzuki@example.com', r: 'student' },
  { n: '中村 理恵', c: 'c6', e: 'nakamura@ursal.co.jp', r: 'admin' },
];

function UsersAdminDemo() {
  return (
    <>
      <PageHeader
        title="ユーザー管理"
        sub="テナント内の全ユーザーを管理 · CSV一括招待 / ロール割当"
        actions={
          <>
            <Button disabled>
              <Upload size={14} />
              CSV一括招待
            </Button>
            <Button variant="accent" disabled>
              <Plus size={14} />
              ユーザーを招待
            </Button>
          </>
        }
      />
      <div className="mb-4 rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        Supabase 未設定のためデモデータを表示しています。 招待 / ロール変更を行うには
        <code className="mx-1">VITE_SUPABASE_*</code> と API の service-role を設定してください。
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_USERS.map((u, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback tone={u.c}>{u.n.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.n}</span>
                  </div>
                </TableCell>
                <TableCell className="text-ink-3">{u.e}</TableCell>
                <TableCell>
                  <RoleBadge role={u.r} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" disabled>
                    <MoreHorizontal size={13} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

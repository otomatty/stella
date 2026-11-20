import { Notice } from "@/components/common/Notice";
import { IntegrationGroupFilter } from "@/components/integrations/IntegrationGroupFilter";
/**
 * `/admin/users` — ユーザー管理 (Issue #22)。
 *
 * バックエンド設定時: `profiles` を実データで一覧し、 招待 (単体 / CSV 一括) /
 * ロール変更 / 無効化 / 受講者の削除を service-role API 経由で行う。
 * バックエンド未設定時 (dev fixtures フロー): デモデータを read-only で表示する。
 *
 * 招待・削除ダイアログ / デモ版 / 共有小物は users-admin/ 配下に分割。
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Upload, Plus, Search, MoreHorizontal, Shield, Lock, Trash } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { RecordItem, RecordList } from "@/components/common/RecordList";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { ProfileRole } from "@stella/shared/cms/types";
import { ASSIGNABLE_PROFILE_ROLES, type AssignableProfileRole } from "@stella/shared/admin/types";
import { useProfiles } from "@/hooks/useProfiles";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { setUserRole, setUserDisabled, type AdminProfileRow } from "@/lib/admin-users-api";

import { ProfileAvatar, ROLE_LABEL, RoleBadge } from "./users-admin/shared";
import { InviteDialog } from "./users-admin/InviteDialog";
import { DeleteUserDialog } from "./users-admin/DeleteUserDialog";
import { CsvInviteDialog } from "./users-admin/CsvInviteDialog";
import { UsersAdminDemo } from "./users-admin/UsersAdminDemo";

interface Props {
  currentUserId: string | null;
  backendEnabled: boolean;
}

export function UsersAdmin({ currentUserId, backendEnabled }: Props) {
  if (!backendEnabled) {
    return <UsersAdminDemo />;
  }
  return <UsersAdminLive currentUserId={currentUserId} />;
}

// ---------------------------------------------------------------
// 実データ版
// ---------------------------------------------------------------

function UsersAdminLive({ currentUserId }: { currentUserId: string | null }) {
  const isMobile = useIsMobileViewport();
  const [groupId, setGroupId] = useState("");
  const { profiles, loading, error, refetch } = useProfiles(true, groupId);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<ProfileRole | "all">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProfileRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(() => new Set());

  const visibleProfiles = useMemo(
    () => profiles.filter((row) => !removedIds.has(row.id)),
    [profiles, removedIds],
  );

  const counts = useMemo(() => {
    const c: Record<ProfileRole, number> = {
      student: 0,
      admin: 0,
    };
    for (const p of visibleProfiles) c[p.role]++;
    return c;
  }, [visibleProfiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleProfiles.filter((p) => {
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      if (!q) return true;
      return p.display_name.toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q);
    });
  }, [visibleProfiles, query, roleFilter]);

  const onChangeRole = async (p: AdminProfileRow, role: AssignableProfileRole) => {
    setMenuId(null);
    if (role === p.role) return;
    setBusyId(p.id);
    try {
      await setUserRole(p.id, role);
      toast.success(`${p.display_name} を「${ROLE_LABEL[role]}」に変更しました`);
      await refetch();
    } catch (err) {
      toast.error(`ロール変更失敗: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusyId(null);
    }
  };

  const onToggleDisabled = async (p: AdminProfileRow) => {
    setMenuId(null);
    setBusyId(p.id);
    try {
      await setUserDisabled(p.id, !p.disabled);
      toast.success(`${p.display_name} を${!p.disabled ? "無効化" : "有効化"}しました`);
      await refetch();
    } catch (err) {
      toast.error(`状態変更失敗: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusyId(null);
    }
  };

  const askDelete = (profile: AdminProfileRow) => {
    setMenuId(null);
    setDeleteTarget(profile);
    setDeleteOpen(true);
  };

  const forgetDeletedUser = async (userId: string) => {
    setRemovedIds((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
    await refetch();
  };

  const rowActions = (p: AdminProfileRow) => (
    <UserRowActions
      profile={p}
      manageable={p.id !== currentUserId}
      busy={busyId === p.id}
      open={menuId === p.id}
      onToggle={() => setMenuId((id) => (id === p.id ? null : p.id))}
      onChangeRole={(role) => void onChangeRole(p, role)}
      onToggleDisabled={() => void onToggleDisabled(p)}
      onDelete={p.role === "student" && p.id !== currentUserId ? () => askDelete(p) : undefined}
      onClose={() => setMenuId(null)}
    />
  );

  return (
    <>
      <PageHeader
        title="ユーザー管理"
        sub="ユーザーを管理 · CSV一括招待 / ロール割当"
        actions={
          <>
            <IntegrationGroupFilter value={groupId} onChange={setGroupId} />
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

      {error ? <Notice className="mb-4">{error}</Notice> : null}

      <Card className="overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border flex-wrap">
          <div className="flex items-center gap-2 bg-sunken border border-border rounded-md px-2.5 py-1.5 w-full sm:w-[280px] text-ink-3 text-[12.5px]">
            <Search size={13} />
            <input
              placeholder="名前・メールで検索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-none outline-none placeholder:text-ink-3"
            />
          </div>
          <FilterChip
            active={roleFilter === "all"}
            onClick={() => setRoleFilter("all")}
            label={`全 ${visibleProfiles.length}名`}
          />
          <FilterChip
            active={roleFilter === "student"}
            onClick={() => setRoleFilter("student")}
            label={`受講者 ${counts.student}`}
            variant="info"
          />
          <FilterChip
            active={roleFilter === "admin"}
            onClick={() => setRoleFilter("admin")}
            label={`管理者 ${counts.admin}`}
          />
        </div>

        {loading && profiles.length === 0 ? (
          <SkeletonRows rows={5} className="p-4" />
        ) : visibleProfiles.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">
            まだユーザーがいません。 「ユーザーを招待」 から追加してください。
          </div>
        ) : isMobile ? (
          <RecordList aria-label="ユーザーの一覧">
            {filtered.map((p) => (
              <RecordItem
                key={p.id}
                leading={<ProfileAvatar profile={p} />}
                title={p.display_name}
                titleSuffix={p.id === currentUserId ? <CurrentUserLabel /> : null}
                subtitle={<span className="break-all">{p.email ?? "—"}</span>}
                badges={
                  <>
                    <RoleBadge role={p.role} />
                    <UserStatusBadge disabled={p.disabled} />
                  </>
                }
                meta={new Date(p.created_at).toLocaleDateString("ja-JP")}
                actions={rowActions(p)}
                dimmed={p.disabled}
              />
            ))}
          </RecordList>
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
                <TableRow key={p.id} className={p.disabled ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ProfileAvatar profile={p} />
                      <span className="font-medium">{p.display_name}</span>
                      {p.id === currentUserId ? <CurrentUserLabel /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-ink-3">{p.email ?? "—"}</TableCell>
                  <TableCell>
                    <RoleBadge role={p.role} />
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge disabled={p.disabled} />
                  </TableCell>
                  <TableCell className="text-ink-3 text-[11.5px]">
                    {new Date(p.created_at).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>{rowActions(p)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={refetch} />
      <CsvInviteDialog open={csvOpen} onOpenChange={setCsvOpen} onInvited={refetch} />
      <DeleteUserDialog
        profile={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={forgetDeletedUser}
      />
    </>
  );
}

function CurrentUserLabel() {
  return <span className="text-[10.5px] text-ink-3">(あなた)</span>;
}

function UserStatusBadge({ disabled }: { disabled: boolean }) {
  return disabled ? <Badge variant="danger">無効</Badge> : <Badge variant="success">有効</Badge>;
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
  variant?: "info" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "ring-2 ring-brand rounded-full" : ""}
    >
      <Badge variant={variant}>{label}</Badge>
    </button>
  );
}

interface RowMenuItemsProps {
  profile: AdminProfileRow;
  onChangeRole: (role: AssignableProfileRole) => void;
  onToggleDisabled: () => void;
  onDelete?: () => void;
}

interface UserRowActionsProps extends RowMenuItemsProps {
  manageable: boolean;
  busy: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function UserRowActions({
  manageable,
  busy,
  open,
  onToggle,
  onClose,
  ...menuItems
}: UserRowActionsProps) {
  return (
    <div className="flex justify-end">
      {/* 枠の overflow-hidden でメニューが切れないようにする。 */}
      <Popover open={open && manageable} onOpenChange={(next) => (next ? onToggle() : onClose())}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!manageable || busy}
            title={manageable ? "操作" : "自分自身は変更できません"}
          >
            <MoreHorizontal size={13} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          aria-label="操作"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="w-48 rounded-md bg-card px-0 py-1 text-[12.5px] text-foreground"
        >
          <RowMenuItems {...menuItems} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function RowMenuItems({ profile, onChangeRole, onToggleDisabled, onDelete }: RowMenuItemsProps) {
  return (
    <>
      <div className="px-3 py-1.5 text-[11px] text-ink-3 flex items-center gap-1.5">
        <Shield size={12} />
        ロール変更
      </div>
      {ASSIGNABLE_PROFILE_ROLES.map((role) => (
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
        {profile.disabled ? "有効化する" : "無効化する"}
      </button>
      {onDelete ? (
        <button
          type="button"
          className="w-full text-left px-3 py-1.5 hover:bg-sunken flex items-center gap-1.5 text-destructive"
          onClick={onDelete}
        >
          <Trash size={12} />
          削除する…
        </button>
      ) : null}
    </>
  );
}

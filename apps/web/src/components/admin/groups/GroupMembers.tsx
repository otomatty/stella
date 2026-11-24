import { useId, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProfiles, type AdminProfileRow } from "@/lib/admin-users-api";
import type { GroupMember, GroupRequest } from "@/lib/admin-groups-api";
import { GroupTime } from "./group-display";

export function GroupMembers({
  members,
  editable,
  request,
  onMembersChanged,
  onPeerNameChanged,
}: {
  members: GroupMember[];
  editable: boolean;
  request: GroupRequest;
  onMembersChanged: () => Promise<void>;
  onPeerNameChanged: (id: string, peerName: string | null) => void;
}) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminProfileRow[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [peerName, setPeerName] = useState("");
  const [peerError, setPeerError] = useState<string | null>(null);
  const memberIds = new Set(members.map((member) => member.id));
  const candidates = results?.filter((profile) => !memberIds.has(profile.id));

  async function findLearners() {
    const query = search.trim().toLowerCase();
    if (!query || searching) return;
    setSearching(true);
    setError(null);
    setResults(null);
    try {
      const profiles = await listProfiles();
      setResults(
        profiles.filter(
          (profile) =>
            profile.role === "student" &&
            !profile.disabled &&
            [profile.display_name, profile.email].some((value) =>
              value?.toLowerCase().includes(query),
            ),
        ),
      );
    } catch {
      setError("受講者を検索できませんでした。");
    } finally {
      setSearching(false);
    }
  }

  async function changeMembers(change: "add" | "remove", ids: string[]) {
    if (busy || ids.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await request("/members", { method: "PATCH", body: { [change]: ids } });
      setSelected([]);
      await onMembersChanged();
      toast.success(change === "add" ? "メンバーを追加しました" : "メンバーを外しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "メンバーを更新できませんでした");
    } finally {
      setBusy(false);
    }
  }

  async function savePeerName(id: string, value: string | null) {
    if (busy) return;
    setBusy(true);
    setPeerError(null);
    try {
      await request(`/members/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { peerName: value },
      });
      onPeerNameChanged(id, value);
      setEditing(null);
      toast.success(value === null ? "呼び名を解除しました" : "呼び名を保存しました");
    } catch (err) {
      setPeerError(err instanceof Error ? err.message : "呼び名を変更できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {editable && (
          <>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void findLearners();
              }}
            >
              <div className="w-full min-w-0 sm:max-w-sm">
                <Label htmlFor={searchId}>追加する受講者を検索</Label>
                <Input
                  id={searchId}
                  type="search"
                  className="min-h-11"
                  placeholder="表示名またはメール"
                  value={search}
                  disabled={searching}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setResults(null);
                  }}
                />
              </div>
              <Button className="min-h-11" type="submit" disabled={searching || !search.trim()}>
                検索
              </Button>
            </form>
            {searching && (
              <p role="status" className="text-sm text-ink-2">
                受講者を検索しています…
              </p>
            )}
            {candidates &&
              (candidates.length === 0 ? (
                <p role="status" className="text-sm text-ink-2">
                  追加できる受講者は見つかりませんでした。
                </p>
              ) : (
                <ul
                  aria-label="受講者の検索結果"
                  className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border"
                >
                  {candidates.map((profile) => (
                    <li
                      key={profile.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <span className="min-w-0 break-all text-sm">
                        {profile.display_name} <span className="text-ink-2">{profile.email}</span>
                      </span>
                      <Button
                        className="min-h-11"
                        type="button"
                        aria-label={`${profile.display_name}を追加`}
                        disabled={busy}
                        onClick={() => void changeMembers("add", [profile.id])}
                      >
                        追加
                      </Button>
                    </li>
                  ))}
                </ul>
              ))}
            {error && <Notice role="alert">{error}</Notice>}
            {members.length > 0 && (
              <Button
                type="button"
                className="min-h-11"
                variant="outline"
                disabled={busy || selected.length === 0}
                onClick={() => void changeMembers("remove", selected)}
              >
                選んだメンバーを外す{selected.length > 0 ? `（${selected.length}人）` : ""}
              </Button>
            )}
          </>
        )}
        {members.length === 0 ? (
          <p className="text-sm text-ink-2">メンバーはいません。</p>
        ) : (
          <Table aria-label="グループのメンバー">
            <TableHeader>
              <TableRow>
                {editable && <TableHead>選択</TableHead>}
                {["表示名", "メール", "呼び名", "外部 ID", "参加日（日本時間）"].map((label) => (
                  <TableHead key={label}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  {editable && (
                    <TableCell>
                      <label className="inline-flex size-11 items-center justify-center">
                        <input
                          type="checkbox"
                          className="size-5 accent-primary"
                          aria-label={`${member.displayName}を外す対象に選ぶ`}
                          checked={selected.includes(member.id)}
                          disabled={
                            busy || (selected.length >= 100 && !selected.includes(member.id))
                          }
                          onChange={(event) =>
                            setSelected(
                              event.target.checked
                                ? [...selected, member.id]
                                : selected.filter((id) => id !== member.id),
                            )
                          }
                        />
                      </label>
                    </TableCell>
                  )}
                  <TableCell className="max-w-48 break-all font-medium">
                    {member.displayName}
                  </TableCell>
                  <TableCell className="max-w-56 break-all">{member.email ?? "—"}</TableCell>
                  <TableCell>
                    {editing === member.id ? (
                      <form
                        className="w-44 space-y-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (peerName.trim()) void savePeerName(member.id, peerName.trim());
                        }}
                      >
                        <Input
                          aria-label={`${member.displayName}の呼び名`}
                          className="min-h-11"
                          value={peerName}
                          maxLength={50}
                          disabled={busy}
                          onChange={(event) => setPeerName(event.target.value)}
                        />
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="submit"
                            className="min-h-11"
                            disabled={busy || !peerName.trim()}
                          >
                            保存
                          </Button>
                          {member.peerName !== null && (
                            <Button
                              type="button"
                              className="min-h-11"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void savePeerName(member.id, null)}
                            >
                              解除
                            </Button>
                          )}
                          <Button
                            type="button"
                            className="min-h-11"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setEditing(null)}
                          >
                            キャンセル
                          </Button>
                        </div>
                        {peerError && <Notice role="alert">{peerError}</Notice>}
                      </form>
                    ) : (
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="max-w-40 break-all">{member.peerName ?? "—"}</span>
                        <Button
                          type="button"
                          className="min-h-11"
                          variant="ghost"
                          aria-label={`${member.displayName}の呼び名を編集`}
                          disabled={busy}
                          onClick={() => {
                            setEditing(member.id);
                            setPeerName(member.peerName ?? "");
                            setPeerError(null);
                          }}
                        >
                          編集
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-44 break-all">{member.externalId ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <GroupTime value={member.joinedAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

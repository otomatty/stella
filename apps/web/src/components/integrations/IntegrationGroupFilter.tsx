import { useEffect, useState } from "react";
import type { IntegrationGroup } from "@stella/shared/integrations/types";
import { apiFetch } from "@/lib/api-client";
import { isBackendConfigured } from "@/lib/backend";

export function IntegrationGroupFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [groups, setGroups] = useState<IntegrationGroup[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isBackendConfigured()) return;
    const ac = new AbortController();
    void apiFetch<{ groups: IntegrationGroup[] }>("/api/admin/integration-groups", {
      signal: ac.signal,
    })
      .then((data) => setGroups(data.groups))
      .catch(() => {
        if (!ac.signal.aborted) setFailed(true);
      });
    return () => ac.abort();
  }, []);
  if (failed) return <span role="status">グループの取得に失敗しました</span>;
  if (!groups.length) return null;
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      グループ
      <select
        aria-label="グループで絞り込む"
        className="h-8 rounded-sm border border-border-2 bg-card px-3"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">すべて</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} ({group.key})
          </option>
        ))}
      </select>
    </label>
  );
}

import { Sliders } from '@/lib/icons';
import type { Role, Tenant } from '@/data/types';
import { TENANTS } from '@/demo/fixtures';
import { cn } from '@/lib/utils';

interface TweaksPanelProps {
  role: Role;
  tenant: Tenant;
  showAIBot: boolean;
  onRole: (role: Role) => void;
  onTenant: (tenant: Tenant) => void;
  onToggleAIBot: () => void;
}

const ROLE_OPTIONS: Array<{ id: Role; label: string }> = [
  { id: 'learner', label: '受講者' },
  { id: 'instructor', label: '講師' },
  { id: 'admin', label: '管理者' },
];

const Pill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-2 py-[3px] rounded-[4px] border text-[11px] transition-colors',
      active
        ? 'bg-ink text-card border-ink'
        : 'bg-card text-ink-2 border-border-2 hover:border-ink-3',
    )}
  >
    {children}
  </button>
);

export const TweaksPanel = ({
  role,
  tenant,
  showAIBot,
  onRole,
  onTenant,
  onToggleAIBot,
}: TweaksPanelProps) => (
  <div className="fixed bottom-5 right-5 w-[280px] bg-card border border-border rounded-lg shadow-lg p-4 z-[100] text-[13px]">
    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-3.5 flex items-center gap-1.5">
      <Sliders size={12} />
      TWEAKS
    </h4>
    <div className="flex items-center gap-2 mb-2.5 text-xs">
      <label className="flex-1 text-ink-2">ロール</label>
      <div className="flex gap-1">
        {ROLE_OPTIONS.map((r) => (
          <Pill key={r.id} active={role === r.id} onClick={() => onRole(r.id)}>
            {r.label}
          </Pill>
        ))}
      </div>
    </div>
    {TENANTS.length > 1 ? (
      <div className="flex items-center gap-2 mb-2.5 text-xs">
        <label className="flex-1 text-ink-2">テナント</label>
        <div className="flex gap-1">
          {TENANTS.map((t) => (
            <Pill key={t.id} active={tenant.id === t.id} onClick={() => onTenant(t)}>
              {t.name}
            </Pill>
          ))}
        </div>
      </div>
    ) : null}
    <div className="flex items-center gap-2 mb-2.5 text-xs">
      <label className="flex-1 text-ink-2">AI アシスタント</label>
      <div className="flex gap-1">
        <Pill active={showAIBot} onClick={onToggleAIBot}>
          表示
        </Pill>
      </div>
    </div>
    <div className="text-[10.5px] text-ink-3 mt-2.5 border-t border-border pt-2.5 leading-relaxed">
      ロール切替 → ダッシュボードへリセット。<br />
      変更は保持されます。<br />
      ` (バッククォート) キーで表示/非表示。
    </div>
  </div>
);

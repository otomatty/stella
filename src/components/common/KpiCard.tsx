import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  trend?: ReactNode;
  trendDir?: 'up' | 'down';
  children?: ReactNode;
}

export const KpiCard = ({ label, value, unit, trend, trendDir, children }: KpiCardProps) => (
  <div className="bg-card border border-border rounded-lg px-4 py-3.5">
    <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3 font-medium uppercase tracking-wider">
      {label}
    </div>
    <div className="flex items-baseline gap-1.5 mt-1.5 text-[28px] tracking-tight font-semibold">
      {value}
      {unit ? <span className="text-xs text-ink-3 font-normal">{unit}</span> : null}
    </div>
    {trend ? (
      <div
        className={cn(
          'flex items-center gap-1 mt-1.5 text-[11.5px]',
          trendDir === 'up' ? 'text-success' : trendDir === 'down' ? 'text-danger' : 'text-ink-3',
        )}
      >
        {trend}
      </div>
    ) : null}
    {children}
  </div>
);

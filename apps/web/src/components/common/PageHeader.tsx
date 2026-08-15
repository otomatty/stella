import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}

export const PageHeader = ({ title, sub, actions }: PageHeaderProps) => (
  <div className="flex items-end gap-5 mb-6 pb-5 border-b border-border">
    <div>
      <h1 className="text-[22px] tracking-tight font-semibold">{title}</h1>
      {sub ? <div className="text-ink-3 text-[13px] mt-1">{sub}</div> : null}
    </div>
    {actions ? <div className="ml-auto flex gap-2">{actions}</div> : null}
  </div>
);

import { cn } from '@/lib/utils';

interface BrandProps {
  /** 32px for login, 28px for sidebar */
  size?: 'sm' | 'md';
  title?: string;
  subtitle?: string;
  inverted?: boolean;
  className?: string;
}

export const Brand = ({
  size = 'sm',
  title = 'FALCON INFORMAL',
  subtitle = '',
  inverted = false,
  className,
}: BrandProps) => {
  const markSize = size === 'md' ? 'w-8 h-8 text-sm' : 'w-7 h-7 text-[13px]';
  const markBg = inverted ? 'bg-card text-ink' : 'bg-ink text-card';
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'grid place-items-center rounded-md font-bold tracking-tight',
          markSize,
          markBg,
        )}
      >
        F
      </div>
      <div className="leading-tight">
        <div className="font-semibold text-[13px]">{title}</div>
        {subtitle && <div className="text-[11px] text-ink-3">{subtitle}</div>}
      </div>
    </div>
  );
};

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  tone?: 'ink' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

const toneClass: Record<NonNullable<ProgressProps['tone']>, string> = {
  ink: 'bg-ink',
  // ブランド進捗は DS のシグネチャグラデーション (単色マゼンタは使わない)
  brand: 'sf-gradient-bg',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, tone = 'brand', size = 'sm', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative w-full overflow-hidden rounded-full bg-muted',
      size === 'sm' ? 'h-[5px]' : 'h-2',
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full rounded-full transition-[width] duration-300 ease-out', toneClass[tone])}
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

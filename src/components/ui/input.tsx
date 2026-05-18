import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex w-full h-10 px-3 py-2 text-sm',
      'bg-card border border-input rounded-sm',
      'placeholder:text-ink-4',
      'transition-[border-color,box-shadow]',
      'focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-soft',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

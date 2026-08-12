import React from 'react';

/**
 * Card — Sports Force / Tech&Boost
 * Airy white surface, soft neutral shadow, 16px radius.
 * `accentBar` adds the signature gradient strip across the top.
 */
export function Card({
  elevation = 'md',
  accentBar = false,
  interactive = false,
  padding = 24,
  children,
  style,
  ...rest
}) {
  const shadows = {
    none: 'none',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  };

  const base = {
    position: 'relative',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: shadows[elevation] ?? shadows.md,
    padding: typeof padding === 'number' ? `${padding}px` : padding,
    overflow: 'hidden',
    transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
  };

  const onEnter = (e) => {
    if (!interactive) return;
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
  };
  const onLeave = (e) => {
    if (!interactive) return;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = shadows[elevation] ?? shadows.md;
  };

  return (
    <div
      style={{ ...base, ...style }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      {...rest}
    >
      {accentBar ? (
        <span style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'var(--gradient-brand)',
        }} />
      ) : null}
      {children}
    </div>
  );
}

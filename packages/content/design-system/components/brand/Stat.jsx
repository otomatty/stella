import React from 'react';

/**
 * Stat — Sports Force / Tech&Boost signature metric block.
 * A huge gradient-clipped numeral with an optional unit suffix and a
 * label beneath (e.g. "300+ / 導入企業数", "94点 / 顧客満足度").
 */
export function Stat({
  value,
  unit,
  label,
  align = 'center',
  size = 'lg',
  style,
  ...rest
}) {
  const sizes = { md: 48, lg: 'var(--fs-stat)', xl: 88 };
  const fs = sizes[size] ?? sizes.lg;
  const items = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: items, textAlign: align, gap: 6, ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: typeof fs === 'number' ? `${fs}px` : fs,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          background: 'var(--gradient-brand)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}>
          {value}
        </span>
        {unit ? (
          <span style={{
            fontFamily: 'var(--font-jp)',
            fontWeight: 900,
            fontSize: '0.34em',
            color: 'var(--sf-red)',
            transform: 'translateY(-0.1em)',
          }}>
            {unit}
          </span>
        ) : null}
      </div>
      {label ? (
        <span style={{ fontFamily: 'var(--font-jp)', fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          {label}
        </span>
      ) : null}
    </div>
  );
}

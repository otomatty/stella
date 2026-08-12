import React from 'react';

/**
 * SectionHeading — Sports Force / Tech&Boost signature pattern.
 * A faint wide-tracked English eyebrow, a heavy JP title, and a
 * short gradient underline beneath. Mirrors the site's section
 * headers (e.g. "RESULTS & CASE STUDIES / 実績・事例").
 */
export function SectionHeading({
  eyebrow,
  title,
  align = 'center',
  underline = true,
  onDark = false,
  style,
  ...rest
}) {
  const items = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: items, textAlign: align, gap: 12, ...style }} {...rest}>
      {eyebrow ? (
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-eyebrow)',
          fontWeight: 700,
          letterSpacing: 'var(--ls-eyebrow)',
          textTransform: 'uppercase',
          color: onDark ? 'rgba(255,255,255,0.55)' : 'var(--ink-300)',
        }}>
          {eyebrow}
        </span>
      ) : null}
      <h2 style={{
        margin: 0,
        fontFamily: 'var(--font-jp)',
        fontWeight: 900,
        fontSize: 'clamp(28px, 4vw, var(--fs-h2))',
        lineHeight: 'var(--lh-tight)',
        letterSpacing: 'var(--ls-heading)',
        color: onDark ? '#fff' : 'var(--text-strong)',
      }}>
        {title}
      </h2>
      {underline ? (
        <span style={{
          marginTop: 4,
          width: 72,
          height: 4,
          borderRadius: 'var(--radius-pill)',
          background: 'var(--gradient-brand)',
        }} />
      ) : null}
    </div>
  );
}

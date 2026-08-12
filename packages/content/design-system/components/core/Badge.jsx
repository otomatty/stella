import React from 'react';

/**
 * Badge / Tag — Sports Force / Tech&Boost
 * Small status or category label. `gradient` uses the signature
 * gradient fill; `soft` tints; `outline` is a hairline chip.
 */
export function Badge({
  variant = 'soft',
  tone = 'accent',
  size = 'md',
  children,
  style,
  ...rest
}) {
  const sizes = {
    sm: { padding: '3px 9px', font: '11px' },
    md: { padding: '5px 12px', font: '12px' },
    lg: { padding: '7px 16px', font: '13px' },
  };
  const s = sizes[size] || sizes.md;

  const tones = {
    accent:  { soft: ['rgba(230,47,154,0.12)', '#B81E72'], solid: ['var(--sf-magenta)', '#fff'] },
    ink:     { soft: ['var(--ink-100)', 'var(--ink-700)'], solid: ['var(--ink-900)', '#fff'] },
    success: { soft: ['rgba(22,163,74,0.12)', '#15803D'], solid: ['var(--success)', '#fff'] },
    warning: { soft: ['rgba(245,158,11,0.16)', '#B45309'], solid: ['var(--warning)', '#3b2a00'] },
    danger:  { soft: ['rgba(229,52,43,0.12)', '#C0241C'], solid: ['var(--danger)', '#fff'] },
  };
  const t = tones[tone] || tones.accent;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: s.padding,
    fontFamily: 'var(--font-jp)',
    fontSize: s.font,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '0.03em',
    borderRadius: 'var(--radius-pill)',
    whiteSpace: 'nowrap',
  };

  let skin;
  if (variant === 'gradient') {
    skin = { background: 'var(--gradient-brand)', color: '#fff' };
  } else if (variant === 'solid') {
    skin = { background: t.solid[0], color: t.solid[1] };
  } else if (variant === 'outline') {
    skin = { background: 'transparent', color: t.soft[1], boxShadow: `inset 0 0 0 1.5px ${t.soft[0].replace(/[\d.]+\)$/, '0.5)')}` };
  } else {
    skin = { background: t.soft[0], color: t.soft[1] };
  }

  return (
    <span style={{ ...base, ...skin, ...style }} {...rest}>
      {children}
    </span>
  );
}

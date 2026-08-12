import React from 'react';

/**
 * Button — Sports Force / Tech&Boost
 * The signature action is the gradient pill (variant="primary").
 * Secondary = solid ink. Ghost = subtle. Outline = hairline border.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  pill = true,
  leadingIcon,
  trailingIcon,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  children,
  style,
  ...rest
}) {
  const sizes = {
    sm: { padding: '8px 18px', font: '14px', icon: 16, gap: '8px' },
    md: { padding: '13px 26px', font: '15px', icon: 18, gap: '10px' },
    lg: { padding: '18px 36px', font: '17px', icon: 22, gap: '12px' },
  };
  const s = sizes[size] || sizes.md;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    width: fullWidth ? '100%' : 'auto',
    padding: s.padding,
    fontFamily: 'var(--font-jp)',
    fontSize: s.font,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '0.02em',
    border: 'none',
    borderRadius: pill ? 'var(--radius-pill)' : 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const variants = {
    primary: {
      background: 'var(--gradient-brand)',
      color: 'var(--text-on-accent)',
      boxShadow: 'var(--glow-brand)',
    },
    secondary: {
      background: 'var(--ink-900)',
      color: '#fff',
      boxShadow: 'var(--shadow-sm)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--text-strong)',
      boxShadow: 'inset 0 0 0 1.5px var(--border-strong)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-strong)',
    },
  };

  const merged = { ...base, ...(variants[variant] || variants.primary), ...style };

  const onEnter = (e) => {
    if (disabled) return;
    e.currentTarget.style.transform = 'translateY(-1px)';
    if (variant === 'primary') e.currentTarget.style.filter = 'brightness(1.06)';
    if (variant === 'ghost' || variant === 'outline') e.currentTarget.style.background = 'var(--surface-sunk)';
  };
  const onLeave = (e) => {
    if (disabled) return;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.filter = 'none';
    if (variant === 'ghost' || variant === 'outline') e.currentTarget.style.background = 'transparent';
  };
  const onDown = (e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(1px) scale(0.99)'; };
  const onUp = (e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={merged}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={onDown}
      onMouseUp={onUp}
      {...rest}
    >
      {leadingIcon ? <span style={{ display: 'inline-flex', width: s.icon, height: s.icon }}>{leadingIcon}</span> : null}
      {children}
      {trailingIcon ? <span style={{ display: 'inline-flex', width: s.icon, height: s.icon }}>{trailingIcon}</span> : null}
    </button>
  );
}

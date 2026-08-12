import React from 'react';

/**
 * Switch — Sports Force / Tech&Boost
 * Toggle. On-state fills with the signature gradient.
 */
export function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  label,
  id,
  style,
  ...rest
}) {
  const dims = size === 'sm'
    ? { w: 38, h: 22, knob: 16 }
    : { w: 48, h: 28, knob: 22 };
  const pad = (dims.h - dims.knob) / 2;
  const sid = id || (label ? `sw-${label.replace(/\s+/g, '-')}` : undefined);

  const track = {
    position: 'relative',
    width: dims.w,
    height: dims.h,
    flex: `0 0 ${dims.w}px`,
    borderRadius: 'var(--radius-pill)',
    background: checked ? 'var(--gradient-brand)' : 'var(--ink-200)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background var(--dur-base) var(--ease-out)',
    opacity: disabled ? 0.5 : 1,
    boxShadow: checked ? '0 4px 12px rgba(230,47,154,0.30)' : 'inset 0 0 0 1px rgba(0,0,0,0.04)',
  };
  const knob = {
    position: 'absolute',
    top: pad,
    left: checked ? dims.w - dims.knob - pad : pad,
    width: dims.knob,
    height: dims.knob,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    transition: 'left var(--dur-base) var(--ease-out)',
  };

  const toggle = () => { if (!disabled) onChange?.(!checked); };

  const control = (
    <span
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } }}
      style={track}
      id={sid}
      {...rest}
    >
      <span style={knob} />
    </span>
  );

  if (!label) return control;
  return (
    <label htmlFor={sid} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-jp)', fontSize: 15, color: 'var(--text-body)', cursor: disabled ? 'not-allowed' : 'pointer', ...style }}>
      {control}
      {label}
    </label>
  );
}

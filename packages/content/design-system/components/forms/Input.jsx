import React from 'react';

/**
 * Input — Sports Force / Tech&Boost
 * Clean text field. Hairline border, generous padding, magenta
 * focus ring. Supports label, hint, error, and leading icon.
 */
export function Input({
  label,
  hint,
  error,
  leadingIcon,
  size = 'md',
  type = 'text',
  id,
  style,
  required = false,
  ...rest
}) {
  const sizes = {
    sm: { padding: '8px 12px', font: '14px' },
    md: { padding: '12px 14px', font: '15px' },
    lg: { padding: '15px 16px', font: '16px' },
  };
  const s = sizes[size] || sizes.md;
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-')}` : undefined);
  const [focus, setFocus] = React.useState(false);

  const borderColor = error ? 'var(--danger)' : focus ? 'var(--sf-magenta)' : 'var(--border-subtle)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontFamily: 'var(--font-jp)', ...style }}>
      {label ? (
        <label htmlFor={inputId} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '0.02em' }}>
          {label}
          {required ? <span style={{ color: 'var(--sf-magenta)', marginLeft: 4 }}>*</span> : null}
        </label>
      ) : null}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leadingIcon ? (
          <span style={{ position: 'absolute', left: 13, display: 'inline-flex', width: 18, height: 18, color: 'var(--text-faint)' }}>
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={inputId}
          type={type}
          required={required}
          onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: leadingIcon ? `${s.padding.split(' ')[0]} 14px ${s.padding.split(' ')[0]} 40px` : s.padding,
            fontFamily: 'var(--font-jp)',
            fontSize: s.font,
            color: 'var(--text-strong)',
            background: 'var(--white)',
            border: `1.5px solid ${borderColor}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            boxShadow: focus ? 'var(--ring)' : 'none',
            transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
          }}
          {...rest}
        />
      </div>
      {error ? (
        <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{hint}</span>
      ) : null}
    </div>
  );
}

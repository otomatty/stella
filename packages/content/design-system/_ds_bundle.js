/* @ds-bundle: {"format":3,"namespace":"SportsForceTechBoostDesignSystem_381be8","components":[{"name":"SectionHeading","sourcePath":"components/brand/SectionHeading.jsx"},{"name":"Stat","sourcePath":"components/brand/Stat.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/brand/SectionHeading.jsx":"b005838f3b10","components/brand/Stat.jsx":"234e0fedbc15","components/core/Badge.jsx":"6c517f8cb6ce","components/core/Button.jsx":"8918473cf72e","components/core/Card.jsx":"95504f1ef135","components/forms/Input.jsx":"27c1e8b8da91","components/forms/Switch.jsx":"8dbedf47395d"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SportsForceTechBoostDesignSystem_381be8 = window.SportsForceTechBoostDesignSystem_381be8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SectionHeading — Sports Force / Tech&Boost signature pattern.
 * A faint wide-tracked English eyebrow, a heavy JP title, and a
 * short gradient underline beneath. Mirrors the site's section
 * headers (e.g. "RESULTS & CASE STUDIES / 実績・事例").
 */
function SectionHeading({
  eyebrow,
  title,
  align = 'center',
  underline = true,
  onDark = false,
  style,
  ...rest
}) {
  const items = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: items,
      textAlign: align,
      gap: 12,
      ...style
    }
  }, rest), eyebrow ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-eyebrow)',
      fontWeight: 700,
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: onDark ? 'rgba(255,255,255,0.55)' : 'var(--ink-300)'
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-jp)',
      fontWeight: 900,
      fontSize: 'clamp(28px, 4vw, var(--fs-h2))',
      lineHeight: 'var(--lh-tight)',
      letterSpacing: 'var(--ls-heading)',
      color: onDark ? '#fff' : 'var(--text-strong)'
    }
  }, title), underline ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 4,
      width: 72,
      height: 4,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--gradient-brand)'
    }
  }) : null);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/brand/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Stat — Sports Force / Tech&Boost signature metric block.
 * A huge gradient-clipped numeral with an optional unit suffix and a
 * label beneath (e.g. "300+ / 導入企業数", "94点 / 顧客満足度").
 */
function Stat({
  value,
  unit,
  label,
  align = 'center',
  size = 'lg',
  style,
  ...rest
}) {
  const sizes = {
    md: 48,
    lg: 'var(--fs-stat)',
    xl: 88
  };
  const fs = sizes[size] ?? sizes.lg;
  const items = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: items,
      textAlign: align,
      gap: 6,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: typeof fs === 'number' ? `${fs}px` : fs,
      lineHeight: 1,
      letterSpacing: '-0.02em',
      background: 'var(--gradient-brand)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent'
    }
  }, value), unit ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-jp)',
      fontWeight: 900,
      fontSize: '0.34em',
      color: 'var(--sf-red)',
      transform: 'translateY(-0.1em)'
    }
  }, unit) : null), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-jp)',
      fontSize: 14,
      fontWeight: 700,
      color: 'var(--text-muted)',
      letterSpacing: '0.04em'
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Stat.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge / Tag — Sports Force / Tech&Boost
 * Small status or category label. `gradient` uses the signature
 * gradient fill; `soft` tints; `outline` is a hairline chip.
 */
function Badge({
  variant = 'soft',
  tone = 'accent',
  size = 'md',
  children,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '3px 9px',
      font: '11px'
    },
    md: {
      padding: '5px 12px',
      font: '12px'
    },
    lg: {
      padding: '7px 16px',
      font: '13px'
    }
  };
  const s = sizes[size] || sizes.md;
  const tones = {
    accent: {
      soft: ['rgba(230,47,154,0.12)', '#B81E72'],
      solid: ['var(--sf-magenta)', '#fff']
    },
    ink: {
      soft: ['var(--ink-100)', 'var(--ink-700)'],
      solid: ['var(--ink-900)', '#fff']
    },
    success: {
      soft: ['rgba(22,163,74,0.12)', '#15803D'],
      solid: ['var(--success)', '#fff']
    },
    warning: {
      soft: ['rgba(245,158,11,0.16)', '#B45309'],
      solid: ['var(--warning)', '#3b2a00']
    },
    danger: {
      soft: ['rgba(229,52,43,0.12)', '#C0241C'],
      solid: ['var(--danger)', '#fff']
    }
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
    whiteSpace: 'nowrap'
  };
  let skin;
  if (variant === 'gradient') {
    skin = {
      background: 'var(--gradient-brand)',
      color: '#fff'
    };
  } else if (variant === 'solid') {
    skin = {
      background: t.solid[0],
      color: t.solid[1]
    };
  } else if (variant === 'outline') {
    skin = {
      background: 'transparent',
      color: t.soft[1],
      boxShadow: `inset 0 0 0 1.5px ${t.soft[0].replace(/[\d.]+\)$/, '0.5)')}`
    };
  } else {
    skin = {
      background: t.soft[0],
      color: t.soft[1]
    };
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...base,
      ...skin,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Sports Force / Tech&Boost
 * The signature action is the gradient pill (variant="primary").
 * Secondary = solid ink. Ghost = subtle. Outline = hairline border.
 */
function Button({
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
    sm: {
      padding: '8px 18px',
      font: '14px',
      icon: 16,
      gap: '8px'
    },
    md: {
      padding: '13px 26px',
      font: '15px',
      icon: 18,
      gap: '10px'
    },
    lg: {
      padding: '18px 36px',
      font: '17px',
      icon: 22,
      gap: '12px'
    }
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
    userSelect: 'none'
  };
  const variants = {
    primary: {
      background: 'var(--gradient-brand)',
      color: 'var(--text-on-accent)',
      boxShadow: 'var(--glow-brand)'
    },
    secondary: {
      background: 'var(--ink-900)',
      color: '#fff',
      boxShadow: 'var(--shadow-sm)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--text-strong)',
      boxShadow: 'inset 0 0 0 1.5px var(--border-strong)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-strong)'
    }
  };
  const merged = {
    ...base,
    ...(variants[variant] || variants.primary),
    ...style
  };
  const onEnter = e => {
    if (disabled) return;
    e.currentTarget.style.transform = 'translateY(-1px)';
    if (variant === 'primary') e.currentTarget.style.filter = 'brightness(1.06)';
    if (variant === 'ghost' || variant === 'outline') e.currentTarget.style.background = 'var(--surface-sunk)';
  };
  const onLeave = e => {
    if (disabled) return;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.filter = 'none';
    if (variant === 'ghost' || variant === 'outline') e.currentTarget.style.background = 'transparent';
  };
  const onDown = e => {
    if (!disabled) e.currentTarget.style.transform = 'translateY(1px) scale(0.99)';
  };
  const onUp = e => {
    if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)';
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: merged,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onMouseDown: onDown,
    onMouseUp: onUp
  }, rest), leadingIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: s.icon,
      height: s.icon
    }
  }, leadingIcon) : null, children, trailingIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: s.icon,
      height: s.icon
    }
  }, trailingIcon) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — Sports Force / Tech&Boost
 * Airy white surface, soft neutral shadow, 16px radius.
 * `accentBar` adds the signature gradient strip across the top.
 */
function Card({
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
    lg: 'var(--shadow-lg)'
  };
  const base = {
    position: 'relative',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: shadows[elevation] ?? shadows.md,
    padding: typeof padding === 'number' ? `${padding}px` : padding,
    overflow: 'hidden',
    transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)'
  };
  const onEnter = e => {
    if (!interactive) return;
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
  };
  const onLeave = e => {
    if (!interactive) return;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = shadows[elevation] ?? shadows.md;
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      ...base,
      ...style
    },
    onMouseEnter: onEnter,
    onMouseLeave: onLeave
  }, rest), accentBar ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: 'var(--gradient-brand)'
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — Sports Force / Tech&Boost
 * Clean text field. Hairline border, generous padding, magenta
 * focus ring. Supports label, hint, error, and leading icon.
 */
function Input({
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
    sm: {
      padding: '8px 12px',
      font: '14px'
    },
    md: {
      padding: '12px 14px',
      font: '15px'
    },
    lg: {
      padding: '15px 16px',
      font: '16px'
    }
  };
  const s = sizes[size] || sizes.md;
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-')}` : undefined);
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--sf-magenta)' : 'var(--border-subtle)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '7px',
      fontFamily: 'var(--font-jp)',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: '13px',
      fontWeight: 700,
      color: 'var(--text-strong)',
      letterSpacing: '0.02em'
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--sf-magenta)',
      marginLeft: 4
    }
  }, "*") : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, leadingIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 13,
      display: 'inline-flex',
      width: 18,
      height: 18,
      color: 'var(--text-faint)'
    }
  }, leadingIcon) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    required: required,
    onFocus: e => {
      setFocus(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur?.(e);
    },
    style: {
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
      transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)'
    }
  }, rest))), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--danger)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--text-faint)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Switch — Sports Force / Tech&Boost
 * Toggle. On-state fills with the signature gradient.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  label,
  id,
  style,
  ...rest
}) {
  const dims = size === 'sm' ? {
    w: 38,
    h: 22,
    knob: 16
  } : {
    w: 48,
    h: 28,
    knob: 22
  };
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
    boxShadow: checked ? '0 4px 12px rgba(230,47,154,0.30)' : 'inset 0 0 0 1px rgba(0,0,0,0.04)'
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
    transition: 'left var(--dur-base) var(--ease-out)'
  };
  const toggle = () => {
    if (!disabled) onChange?.(!checked);
  };
  const control = /*#__PURE__*/React.createElement("span", _extends({
    role: "switch",
    "aria-checked": checked,
    tabIndex: disabled ? -1 : 0,
    onClick: toggle,
    onKeyDown: e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    },
    style: track,
    id: sid
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: knob
  }));
  if (!label) return control;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: sid,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-jp)',
      fontSize: 15,
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, control, label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Switch = __ds_scope.Switch;

})();

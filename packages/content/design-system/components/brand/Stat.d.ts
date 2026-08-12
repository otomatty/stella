import * as React from 'react';

/**
 * Big headline metric: a gradient-clipped numeral with optional unit
 * and a label beneath. Mirrors the site's results figures
 * ("300+ / 導入企業数", "94点 / 顧客満足度").
 *
 * @startingPoint section="Brand" subtitle="Gradient numeral + unit + label" viewport="700x200"
 */
export interface StatProps {
  /** The number, e.g. "300+" or "94". */
  value: React.ReactNode;
  /** Small unit suffix in red, e.g. "点", "%". */
  unit?: string;
  /** Caption beneath, e.g. "導入企業数". */
  label?: string;
  align?: 'left' | 'center' | 'right';
  size?: 'md' | 'lg' | 'xl';
  style?: React.CSSProperties;
}

export function Stat(props: StatProps): JSX.Element;

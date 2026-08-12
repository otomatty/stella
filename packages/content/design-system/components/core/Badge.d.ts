import * as React from 'react';

/**
 * Compact label for status, category or count.
 *
 * @startingPoint section="Core" subtitle="Soft / solid / gradient / outline chips" viewport="700x140"
 */
export interface BadgeProps {
  variant?: 'soft' | 'solid' | 'gradient' | 'outline';
  tone?: 'accent' | 'ink' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;

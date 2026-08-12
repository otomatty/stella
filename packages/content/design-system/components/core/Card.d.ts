import * as React from 'react';

/**
 * Surface container for grouped content. Airy white, soft shadow,
 * 16px radius. `accentBar` adds the signature gradient top strip.
 *
 * @startingPoint section="Core" subtitle="White surface, soft shadow, optional gradient bar" viewport="700x260"
 */
export interface CardProps {
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  /** Signature gradient strip across the top edge. */
  accentBar?: boolean;
  /** Lift on hover. */
  interactive?: boolean;
  padding?: number | string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;

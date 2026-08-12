import * as React from 'react';

/**
 * Binary toggle. The on-state fills with the signature gradient.
 *
 * @startingPoint section="Forms" subtitle="Gradient-filled on-state toggle" viewport="700x120"
 */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  id?: string;
  style?: React.CSSProperties;
}

export function Switch(props: SwitchProps): JSX.Element;

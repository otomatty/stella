import * as React from 'react';

/**
 * The primary action element. The default `primary` variant renders
 * the signature blue→magenta→red gradient pill with a coloured glow.
 *
 * @startingPoint section="Core" subtitle="Gradient pill + ink/outline/ghost variants" viewport="700x200"
 */
export interface ButtonProps {
  /** Visual style. `primary` = signature gradient pill. */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Fully rounded pill (brand default) vs 12px radius. */
  pill?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;

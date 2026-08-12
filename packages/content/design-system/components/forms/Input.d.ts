import * as React from 'react';

/**
 * Single-line text field with optional label, hint, error and leading
 * icon. Magenta focus ring matches the brand accent.
 *
 * @startingPoint section="Forms" subtitle="Labelled text field with focus ring + error" viewport="700x180"
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Input(props: InputProps): JSX.Element;

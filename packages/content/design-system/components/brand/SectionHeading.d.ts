import * as React from 'react';

/**
 * The brand's signature section header: faint English eyebrow, heavy
 * Japanese title, and a short gradient underline. Use to open every
 * major content block.
 *
 * @startingPoint section="Brand" subtitle="Eyebrow + JP title + gradient underline" viewport="700x200"
 */
export interface SectionHeadingProps {
  /** Wide-tracked uppercase Latin label, e.g. "RESULTS & CASE STUDIES". */
  eyebrow?: string;
  /** Japanese title, e.g. "実績・事例". */
  title: string;
  align?: 'left' | 'center' | 'right';
  underline?: boolean;
  /** Light text for use over the dark hero/footer. */
  onDark?: boolean;
  style?: React.CSSProperties;
}

export function SectionHeading(props: SectionHeadingProps): JSX.Element;

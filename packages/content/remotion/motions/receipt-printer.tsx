import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  CodeCallout,
  Head,
  INK,
  LINE,
  Line,
  PINK,
  Stage,
  stageMotion,
  Text,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const TOTAL = "1,200";
const SOURCE = "return から";
const TYPE = ": number";
export const receiptPrinterText = `${TOTAL}${SOURCE}${TYPE}`;

export function ReceiptPrinter({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["receipt-printer"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#printer-register", at(0));
      t.to("#printer-button", { fill: PINK, duration: 0.18 }, at(1));
      t.to("#printer-button", { fill: BLUE, duration: 0.26 }, at(1, 0.7));
      t.fromTo(
        "#printer-feed",
        { y: 232 },
        { y: 0, duration: 0.7, ease: "power2.out" },
        at(1, 0.15),
      );
      show("#printer-paper", at(1, 0.15));
      show("#printer-total", at(2));
      draw("#printer-return .line", at(3));
      show("#printer-source", at(3));
      show("#printer-tip, #printer-type", at(3, 0.5));
      emphasize("printer-type", at(3, 0.9));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="printer-register">
        <g id="printer-feed">
          <g id="printer-paper" opacity={0}>
            <path
              d="M 539 244 H 871 V 424 L 846 411 L 818 424 L 790 411 L 762 424 L 734 411 L 706 424 L 678 411 L 650 424 L 622 411 L 594 424 L 566 411 L 539 424 Z"
              fill="#fff"
              stroke={LINE}
              strokeWidth={8}
              strokeLinejoin="round"
            />
            <Text id="printer-total" x={705} y={357} size={76} opacity={0}>
              {TOTAL}
            </Text>
          </g>
        </g>
        <rect
          x={415}
          y={458}
          width={580}
          height={305}
          rx={34}
          fill="#F1F5F9"
          stroke={INK}
          strokeWidth={10}
        />
        <path d="M 518 477 H 892" stroke={INK} strokeWidth={19} strokeLinecap="round" />
        <rect
          x={468}
          y={535}
          width={255}
          height={120}
          rx={17}
          fill="#EFF6FF"
          stroke={BLUE}
          strokeWidth={7}
        />
        <path
          d="M 507 612 H 561 M 576 612 H 630"
          stroke={BLUE}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d="M 780 553 H 814 M 868 553 H 902 M 780 597 H 814"
          stroke={LINE}
          strokeWidth={19}
          strokeLinecap="round"
        />
        <rect id="printer-button" x={847} y={580} width={85} height={70} rx={16} fill={BLUE} />
        <path d="M 420 705 H 990" stroke={LINE} strokeWidth={8} />
      </g>
      <CodeCallout id="printer-type" x={1390} y={334} text={TYPE} />
      <Line id="printer-return" d="M 903 334 H 1200" />
      <Head id="printer-tip" x={1200} y={334} angle={0} />
      <Text id="printer-source" x={1052} y={294} size={38} opacity={0}>
        {SOURCE}
      </Text>
    </Stage>
  );
}

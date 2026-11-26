import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Stage, stageMotion } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import {
  Desk,
  DrillDefs,
  drillPartsText,
  Paper,
  Pencil,
  ProtectedSheet,
  PURPLE,
} from "./drill-parts";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const drillOneFileText = drillPartsText;

export function DrillOneFile({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["drill-one-file"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw } = stageMotion(t);
      rise("#desk", at(0));
      [3, 2, 1].forEach((n, i) => {
        show(`#paper-${n}`, at(0, 0.1 + i * 0.35));
      });
      t.to(
        "#paper-2",
        { x: -480, y: 180, scale: 0.68, svgOrigin: "750 290", rotation: -8, duration: 0.7 },
        at(1),
      );
      t.to(
        "#paper-3",
        { x: -780, y: 200, scale: 0.68, svgOrigin: "1250 300", rotation: 5, duration: 0.7 },
        at(1),
      );
      t.to(
        "#paper-1",
        { x: 45, y: -10, scale: 1, svgOrigin: "280 290", duration: 0.8, ease: "power2.inOut" },
        at(1),
      );
      show("#write-glow", at(1, 0.7));
      show("#pencil", at(1, 0.9));
      draw("#writing", at(1, 1.2), 1.1);
      t.to("#pencil", { x: 180, y: 38, duration: 1.1, ease: "none" }, at(1, 1.2));
      t.to("#pencil", { x: 230, y: 20, rotation: 0, duration: 0.5 }, at(1, 2.4));
      ["tests", "config"].forEach((name, i) => {
        show(`#${name}`, at(i + 2));
        show(`#${name}-cover`, at(i + 2, 0.55));
        t.fromTo(
          `#${name}-cover`,
          { y: -70 },
          { y: 0, duration: 0.6, immediateRender: false },
          at(i + 2, 0.55),
        );
        show(`#${name}-lock`, at(i + 2, 1.15));
        t.fromTo(
          `#${name}-lock-shackle`,
          { y: -18 },
          { y: 0, duration: 0.4, immediateRender: false },
          at(i + 2, 1.4),
        );
      });
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <DrillDefs />
      <Desk />
      <g id="paper-3" opacity={0}>
        <g transform="translate(1250 300) scale(1.4) rotate(3 140 180)">
          <Paper number={3} />
        </g>
      </g>
      <g id="paper-2" opacity={0}>
        <g transform="translate(750 290) scale(1.4)">
          <Paper number={2} />
        </g>
      </g>
      <g id="paper-1" opacity={0}>
        <g transform="translate(250 280) scale(1.4)">
          <Paper ink="writing" />
          <rect
            id="write-glow"
            x={33}
            y={310}
            width={216}
            height={8}
            rx={4}
            fill={PURPLE}
            opacity={0}
          />
        </g>
      </g>
      <g id="pencil" opacity={0}>
        <g transform="translate(397 617) scale(1.2)">
          <Pencil />
        </g>
      </g>
      <g id="tests" opacity={0}>
        <g transform="translate(900 300) scale(1.35) rotate(-3 140 180)">
          <ProtectedSheet kind="tests" cover="tests-cover" lock="tests-lock" />
        </g>
      </g>
      <g id="config" opacity={0}>
        <g transform="translate(1360 300) scale(1.3) rotate(3 140 180)">
          <ProtectedSheet kind="config" cover="config-cover" lock="config-lock" />
        </g>
      </g>
    </Stage>
  );
}

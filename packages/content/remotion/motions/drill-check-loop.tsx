import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Head, INK, LINE, Line, Mark, RED, Stage, stageMotion } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import { Desk, DrillDefs, drillPartsText, Paper, Pencil, Scanner, Tick, Tray } from "./drill-parts";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const drillCheckLoopText = drillPartsText;

export function DrillCheckLoop({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["drill-check-loop"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw } = stageMotion(t);
      const move = (id: string, beat: number, start: number, end: number, vars: gsap.TweenVars) => {
        const duration = at(beat, end) - at(beat, start);
        if (id === "#sheet") {
          const { scale, svgOrigin: _origin, ...position } = vars;
          if (scale !== undefined)
            t.to(
              "#paper-size",
              { attr: { transform: `scale(${scale})` }, duration, ease: "power2.inOut" },
              at(beat, start),
            );
          return t.to(
            "#sheet-position",
            { ...position, duration, ease: "power2.inOut" },
            at(beat, start),
          );
        }
        return t.to(id, { ...vars, duration, ease: "power2.inOut" }, at(beat, start));
      };
      rise("#desk", at(0));
      show("#sheet, #pencil", at(0, 0.1));
      t.set("#sheet-position", { x: 500, y: -20 }, 0);
      t.set("#paper-size", { attr: { transform: "scale(1.6)" } }, 0);
      t.set("#pencil-position", { x: 500, y: -20 }, 0);
      draw("#writing", at(0, 0.5), 0.9);
      move("#pencil", 0, 0.5, 1.4, { x: 200, y: 45 });
      show("#tray, #tray-front", at(1));
      move("#pencil", 1, 0, 0.4, { opacity: 0 });
      move("#sheet", 1, 0.3, 1.5, {
        x: 620,
        y: -120,
        scale: 1.1,
        svgOrigin: "260 330",
        rotation: 0,
      });
      show("#saved", at(1, 1.6));
      show("#machine", at(2));
      move("#saved", 2, 0, 0.2, { opacity: 0 });
      move("#sheet", 2, 0.3, 1.6, { x: 1100, y: 50, scale: 0.86, svgOrigin: "260 330" });
      show("#scan", at(2, 1.6));
      move("#scan", 2, 1.6, 2.4, { y: 72 });
      move("#scan", 2, 2.4, 2.6, { opacity: 0 });
      t.to("#lamp", { fill: RED, duration: 0.2 }, at(3));
      show("#receipt, #receipt-mark", at(3, 0.15));
      t.set("#receipt-position", { x: 650, y: -350 }, 0);
      move("#receipt-position", 3, 0.15, 1.6, { x: 0 });
      move("#sheet", 3, 0.7, 1.8, { x: -120, y: 0, scale: 1.3, rotation: 0 });
      t.set("#pencil-position", { x: -120, y: 0 }, at(3, 1.8));
      t.set("#pencil", { x: 70, y: 0 }, at(3, 1.8));
      show("#pencil", at(3, 1.9));
      move("#pencil", 4, 0.1, 0.8, { x: 88, y: 48 });
      draw("#correction", at(4, 0.1), 0.6);
      move("#pencil", 4, 0.9, 1.1, { opacity: 0 });
      move("#sheet", 4, 1, 1.8, { x: 620, y: -120, scale: 1.1 });
      show("#saved", at(4, 1.8));
      move("#sheet", 4, 2.1, 3.1, { x: 1100, y: 50, scale: 0.86 });
      move("#saved", 4, 2.1, 2.3, { opacity: 0 });
      draw("#loop-line .line", at(4, 1), at(4, 3.1) - at(4, 1));
      show("#loop-head", at(4, 3.1));
      t.to("#lamp", { fill: "#E2BD63", duration: 0.2 }, at(4, 3.15));
      show("#scan", at(4, 3.15));
      move("#scan", 4, 3.2, 3.8, { y: 0 });
      move("#scan", 4, 3.8, 4, { opacity: 0 });
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <DrillDefs />
      <defs>
        <clipPath id="receipt-outlet">
          <rect x={530} y={100} width={710} height={310} />
        </clipPath>
      </defs>
      <Desk />
      <g id="tray" opacity={0}>
        <g transform="translate(820 610) scale(1.2)">
          <Tray />
        </g>
      </g>
      <g id="machine" opacity={0}>
        <g transform="translate(1250 270) scale(1.4)">
          <Scanner scan="scan-back" />
        </g>
        <rect x={1245} y={452} width={16} height={298} rx={8} fill={INK} />
      </g>
      <g id="sheet" opacity={0}>
        <g id="sheet-position">
          <g transform="translate(220 290)">
            <g id="paper-size" transform="scale(1.4)">
              <Paper ink="writing" />
              <path
                id="correction"
                d="M55 282 l15 -13 13 13 20 -16 h67"
                fill="none"
                stroke={BLUE}
                strokeWidth={5}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
            </g>
          </g>
        </g>
      </g>
      <rect id="scan" x={1326} y={508} width={406} height={9} rx={4} fill={BLUE} opacity={0} />
      <g id="tray-front" opacity={0}>
        <g transform="translate(820 610) scale(1.2)">
          <Tray front />
        </g>
      </g>
      <g id="saved" opacity={0}>
        <Tick x={1160} y={560} />
      </g>
      <g id="pencil" opacity={0}>
        <g id="pencil-position">
          <g transform="translate(330 690) scale(1.4)">
            <Pencil />
          </g>
        </g>
      </g>
      <g clipPath="url(#receipt-outlet)">
        <g id="receipt-position">
          <g id="receipt" opacity={0}>
            <g transform="translate(540 460) scale(1.15)">
              <path
                d="M0 0 H170 V246 l-17 -10 -17 10 -17 -10 -17 10 -17 -10 -17 10 -17 -10 -17 10 -17 -10 -17 10Z"
                fill="#fff"
                stroke={LINE}
                strokeWidth={3}
              />
              <Mark id="receipt-mark" x={85} y={58} ok={false} />
              {[112, 151, 190].map((y) => (
                <path key={y} d={`M25 ${y} H145`} stroke={LINE} strokeWidth={6} />
              ))}
            </g>
          </g>
        </g>
      </g>
      <Line id="loop-line" d="M1450 855 C1435 870 415 880 415 815" color={BLUE} />
      <Head id="loop-head" x={415} y={815} angle={-90} color={BLUE} />
    </Stage>
  );
}

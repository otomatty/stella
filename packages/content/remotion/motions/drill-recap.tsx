import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, GREEN, Head, LINE, Line, Stage, stageMotion } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import {
  Desk,
  DrillDefs,
  drillPartsText,
  Paper,
  Pencil,
  PURPLE,
  Scanner,
  SubmitBox,
  Tick,
} from "./drill-parts";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const drillRecapText = drillPartsText;

export function DrillRecap({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["drill-recap"].seconds), [beats]);
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
      show("#pad, #sheet, #pencil", at(0, 0.1));
      draw("#writing", at(0, 0.5), 1);
      move("#pencil", 0, 0.5, 1.5, { x: 180, y: 45 });
      show("#machine", at(1, 0.1));
      move("#pencil", 1, 0, 0.5, { x: 130, y: 0, rotation: 0 });
      move("#sheet", 1, 0.4, 1.4, { x: 670, y: 20, scale: 0.95, svgOrigin: "260 330" });
      show("#scan", at(1, 1.4));
      move("#scan", 1, 1.4, 2, { y: 70 });
      move("#scan", 1, 2, 2.2, { opacity: 0 });
      t.to("#lamp", { fill: GREEN, duration: 0.2 }, at(1, 2.2));
      show("#passed", at(1, 2.3));
      draw("#to-check .line", at(1, 0.5), 0.6);
      show("#check-head", at(1, 1.1));
      show("#box, #box-front", at(2));
      move("#sheet", 2, 0.2, 1.2, { x: 1225, y: -20, rotation: 0 });
      move("#sheet", 2, 1.2, 2.1, { y: 350 });
      move("#sheet", 2, 2.1, 2.2, { opacity: 0 });
      show("#received", at(2, 2.3));
      draw("#to-submit .line", at(2, 0.4), 0.6);
      show("#submit-head", at(2, 1));
      show("#next", at(2, 2.6));
      t.fromTo(
        "#next",
        { y: -50 },
        { y: 0, duration: at(2, 3.3) - at(2, 2.6), immediateRender: false },
        at(2, 2.6),
      );
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <DrillDefs />
      <defs>
        <clipPath id="insertion-clip">
          <path d="M0 0 H1920 V803 H1350 V960 H0Z" />
        </clipPath>
      </defs>
      <Desk />
      <g id="pad" opacity={0}>
        <rect x={180} y={250} width={500} height={620} rx={18} fill={PURPLE} />
        <rect x={200} y={270} width={460} height={580} rx={8} fill="#fff" />
        {[440, 490, 540, 590, 640, 690, 740].map((y) => (
          <path key={y} d={`M252 ${y} H594`} stroke={LINE} strokeWidth={3} />
        ))}
        <path
          d="M265 484 q18 -24 32 0 t32 0 h95 M265 534 h63 l12 -16 18 16 h106 M265 584 h94"
          fill="none"
          stroke={BLUE}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </g>
      <g id="machine" opacity={0}>
        <g transform="translate(750 260) scale(1.4)">
          <Scanner scan="scan-back" />
        </g>
      </g>
      <g id="box" opacity={0}>
        <g transform="translate(1380 310) scale(1.45)">
          <SubmitBox />
        </g>
      </g>
      <g clipPath="url(#insertion-clip)">
        <g id="sheet" opacity={0}>
          <g id="sheet-position">
            <g transform="translate(220 300)">
              <g id="paper-size" transform="scale(1.6)">
                <Paper ink="writing" stamp="passed" />
              </g>
            </g>
          </g>
        </g>
      </g>
      <rect id="scan" x={826} y={498} width={406} height={9} rx={4} fill={BLUE} opacity={0} />
      <g id="box-front" opacity={0}>
        <g transform="translate(1380 310) scale(1.45)">
          <SubmitBox front />
        </g>
      </g>
      <g id="received" opacity={0}>
        <Tick x={1765} y={745} />
      </g>
      <g id="next" opacity={0}>
        <g transform="translate(220 300) scale(1.6)">
          <Paper number={2} />
        </g>
      </g>
      <g id="pencil" opacity={0}>
        <g transform="translate(300 690) scale(1.3)">
          <Pencil />
        </g>
      </g>
      <Line id="to-check" d="M690 570 H735" color={BLUE} />
      <Head id="check-head" x={735} y={570} angle={0} color={BLUE} />
      <Line id="to-submit" d="M1325 570 H1365" color={BLUE} />
      <Head id="submit-head" x={1365} y={570} angle={0} color={BLUE} />
    </Stage>
  );
}

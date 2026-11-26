import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import {
  Desk,
  DrillDefs,
  drillPartsText,
  Paper,
  ProtectedSheet,
  PURPLE as VIOLET,
  SubmitBox,
} from "./drill-parts";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const drillFolderText = `${drillPartsText}src/ 問題tests/設定ファイル？`;

export function DrillFolder({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["drill-folder"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#desk", at(0));
      show("#folder, #folder-front", at(0, 0.1));
      t.to(
        "#folder-front",
        { scaleY: 0.43, svgOrigin: "0 813", duration: 0.8, ease: "power2.inOut" },
        at(0, 0.5),
      );
      [0, 1, 2].forEach((i) => {
        show(`#sheet-${i}`, at(0, 0.8 + i * 0.22));
        t.fromTo(
          `#sheet-${i}`,
          { x: 440 - i * 380, y: 290, rotation: 0 },
          { x: 0, y: 0, rotation: 0, duration: 0.9, ease: "power2.inOut", immediateRender: false },
          at(0, 0.8 + i * 0.22),
        );
        show(`#face-${i}`, at(1, 0.1));
        show(`#label-${i}`, at(1, 0.15));
        t.to(`#sheet-${i}`, { y: -35, duration: 0.3, ease: "power2.out" }, at(1, 0.35 + i * 0.65));
        t.to(`#sheet-${i}`, { y: 0, duration: 0.3, ease: "power2.inOut" }, at(1, 0.7 + i * 0.65));
      });
      show("#box", at(2, 0.1));
      show("#question", at(2, 0.7));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <DrillDefs />
      <Desk />
      <g id="folder" opacity={0}>
        <path
          d="M255 406 V250 Q255 230 278 230 H557 L601 280 H1375 Q1400 280 1400 305 V813 H255Z"
          fill={VIOLET}
        />
        <Text x={427} y={266} size={28} fill="#fff">
          課題フォルダー
        </Text>
      </g>
      {[0, 1, 2].map((i) => (
        <g key={i} id={`sheet-${i}`} opacity={0}>
          <g transform={`translate(${290 + i * 380} 286) rotate(${(i - 1) * 5} 140 180)`}>
            <Paper blank />
            <g id={`face-${i}`} opacity={0}>
              {i === 0 ? <Paper /> : <ProtectedSheet kind={i === 1 ? "tests" : "config"} />}
            </g>
          </g>
        </g>
      ))}
      <g id="folder-front" opacity={0}>
        <path d="M239 493 H1417 L1388 813 H265Z" fill={VIOLET} />
      </g>
      {["src/ 問題", "tests/", "設定ファイル"].map((label, i) => (
        <g key={label} id={`label-${i}`} opacity={0}>
          <Text x={430 + i * 380} y={735} size={34} fill="#fff">
            {label}
          </Text>
        </g>
      ))}
      <g id="box" opacity={0} transform="translate(1460 514) scale(.85)">
        <SubmitBox />
        <SubmitBox front />
      </g>
      <g id="question" opacity={0}>
        <path
          d="M1510 315 Q1620 280 1730 315 V422 Q1680 446 1628 430 L1600 473 L1593 433 Q1539 437 1510 422 Z"
          fill="#fff"
          stroke={LINE}
          strokeWidth={3}
        />
        <Text x={1620} y={407} size={85} fill={VIOLET}>
          ？
        </Text>
      </g>
    </Stage>
  );
}

import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const stackPlatesText = "abc上からresult = ch + result";
const PLATES = [
  { letter: "a", color: BLUE, edge: "#1D4ED8" },
  { letter: "b", color: "#8330C7", edge: "#6B21A8" },
  { letter: "c", color: "#E62F9A", edge: "#BE1879" },
];

/** 単色の楕円と浅い底だけで、重なった皿を見せる。 */
function Plate({ index }: { index: number }) {
  const { letter, color, edge } = PLATES[index];
  return (
    <g>
      <ellipse cy={14} rx={280} ry={123} fill={edge} />
      <ellipse rx={280} ry={123} fill={edge} />
      <ellipse rx={250} ry={99} fill={color} />
      <Text x={0} y={35} size={110} fill="#fff">
        {letter}
      </Text>
      <Text x={0} y={127} size={30} fill="#fff">
        {letter}
      </Text>
    </g>
  );
}

export function StackPlates({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["stack-plates"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#washing-station, #plate-0 .plate-face", at(0));
      PLATES.forEach((_, i) => {
        const offset = i * 1.15;
        const id = `#plate-${i}`;
        if (i > 0)
          show(`${id} .plate-face`, at(1, offset), {
            duration: at(1, offset + 0.2) - at(1, offset),
          });
        show(`#water-${i}`, at(1, offset), { duration: at(1, offset + 0.15) - at(1, offset) });
        t.to(
          `#water-${i}`,
          {
            y: 55,
            opacity: 0,
            duration: at(1, offset + 0.5) - at(1, offset + 0.15),
            ease: "power1.in",
          },
          at(1, offset + 0.15),
        );
        t.to(
          id,
          {
            x: 1100,
            y: 380 - i * 50,
            duration: at(1, offset + 0.65) - at(1, offset + 0.25),
            ease: "power2.inOut",
          },
          at(1, offset + 0.25),
        );
        t.to(
          id,
          {
            y: 650 - i * 50,
            duration: at(1, offset + 1.05) - at(1, offset + 0.65),
            ease: "power2.inOut",
          },
          at(1, offset + 0.65),
        );
      });
      // 少し上からの角度に変え、最後の c の面を広く見せる。
      t.to(
        "#plate-2 .ceramic",
        { scaleY: 1.16, svgOrigin: "0 123", duration: at(2, 0.8) - at(2), ease: "power2.inOut" },
        at(2),
      );
      show("#read-heading", at(3));
      [2, 1, 0].forEach((i, order) => {
        show(`#read-${i}, #read-tag-${i}`, at(3, 0.25 + order * 0.5));
      });
      show("#prepend-code", at(3, 2.0));
      emphasize("prepend-code", at(3, 2.5));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="washing-station">
        <rect x={170} y={805} width={1250} height={28} rx={14} fill={LINE} />
        <path
          d="M240 594 V320 Q240 226 330 226 Q419 226 419 312 V351 H381 V312 Q381 264 330 264 Q278 264 278 320 V594Z"
          fill={LINE}
        />
        <rect x={250} y={542} width={75} height={18} rx={9} fill={LINE} />
      </g>
      {PLATES.map(({ letter }, i) => (
        <g key={letter} id={`plate-${i}`} transform="translate(495 440)">
          <g className="plate-face" opacity={i === 0 ? 1 : 0}>
            <g className="ceramic">
              <Plate index={i} />
            </g>
          </g>
        </g>
      ))}
      {PLATES.map(({ letter }, i) => (
        <g key={letter} id={`water-${i}`} opacity={0} fill="#8DC8E8">
          <path d="M 362 487 q -17 30 0 33 q 17 -3 0 -33 M 608 480 q -14 25 0 28 q 14 -3 0 -28" />
          <circle cx={615} cy={383} r={14} fill="#fff" stroke={LINE} strokeWidth={3} />
          <circle cx={639} cy={393} r={8} fill="#fff" stroke={LINE} strokeWidth={3} />
        </g>
      ))}
      <Text id="read-heading" x={1690} y={235} size={37} opacity={0}>
        上から
      </Text>
      {[2, 1, 0].map((i, order) => (
        <g key={PLATES[i].letter} id={`read-${i}`} opacity={0}>
          <path
            d={`M 1390 ${450 + order * 50} L 1600 ${310 + order * 109} H 1630`}
            fill="none"
            stroke={PLATES[i].color}
            strokeWidth={4}
          />
          <Tag
            id={`read-tag-${i}`}
            x={1690}
            y={310 + order * 109}
            text={PLATES[i].letter}
            color={PLATES[i].color}
          />
        </g>
      ))}
      <CodeCallout id="prepend-code" x={1100} y={903} text="result = ch + result" />
    </Stage>
  );
}

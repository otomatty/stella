import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, INK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const DATE = "2026-03-15";
const CODE = '"2026-03-15".replaceAll("-", "/")';
export const dateReplaceText = `${DATE}${DATE.replaceAll("-", "/")}${CODE}`;

const ORANGE = "#E07A1F";
const NAVY = "#1E3A6E";
const NAVY_EDGE = "#122848";
const PAPER = "#FFFEFB";
const PAPER_BACK = "#E4DFD6";
const PAPER_BACK_2 = "#CFC8BC";
const SILVER = "#C5CCD4";
const SILVER_EDGE = "#8E98A4";
const SILVER_LIGHT = "#F7F9FB";

const YEAR_X = 632;
const MONTH_X = 1056;
const DAY_X = 1384;
const SEP_X = [892, 1220] as const;
const DATE_Y = 560;

function Ring({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 16} y={118} width={32} height={96} rx={16} fill={SILVER_EDGE} />
      <rect x={x - 12} y={122} width={24} height={84} rx={12} fill={SILVER} />
      <rect x={x - 6} y={130} width={8} height={52} rx={4} fill={SILVER_LIGHT} />
    </g>
  );
}

export function DateReplace({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["date-replace"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      const span = (beat: number, from: number, seconds: number) =>
        at(beat, from + seconds) - at(beat, from);
      rise("#date-calendar", at(0));
      ["#date-year", "#date-hyphen-0", "#date-month", "#date-hyphen-1", "#date-day"].forEach(
        (id, index) => {
          show(id, at(1, 0.2 + index * 0.55));
        },
      );
      SEP_X.forEach((_, index) => {
        const from = 0.25 + index * 1.15;
        t.to(
          `#date-hyphen-${index}`,
          { y: -120, opacity: 0, duration: span(2, from, 0.45), ease: "power2.in" },
          at(2, from),
        );
        t.fromTo(
          `#date-slash-${index}`,
          { y: -140, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: span(2, from + 0.28, 0.5),
            ease: "power2.out",
            immediateRender: false,
          },
          at(2, from + 0.28),
        );
      });
      show("#date-code", at(3, 0.35));
      emphasize("date-slash-0", at(3, 0.9));
      emphasize("date-slash-1", at(3, 0.9));
      emphasize("date-code", at(3, 1.15));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="date-calendar">
        <ellipse cx={960} cy={800} rx={540} ry={26} fill={INK} opacity={0.06} />
        <rect x={384} y={194} width={1192} height={586} rx={18} fill={PAPER_BACK_2} />
        <rect x={372} y={182} width={1196} height={584} rx={18} fill={PAPER_BACK} />
        <rect x={360} y={170} width={1200} height={590} rx={20} fill={PAPER} />
        <path
          d="M 360 300 V 190 Q 360 170 380 170 H 1540 Q 1560 170 1560 190 V 300 Z"
          fill={NAVY}
        />
        <path d="M 360 300 H 1560" stroke={NAVY_EDGE} strokeWidth={8} />
        {[480, 672, 864, 1056, 1248, 1440].map((x) => (
          <Ring key={x} x={x} />
        ))}
        <path d="M 1448 760 L 1560 648 V 740 Q 1560 760 1540 760 Z" fill="#E7E1D6" />
        <path d="M 1448 760 L 1560 648" stroke="#D2CBBE" strokeWidth={3} />
        <g id="date-year" opacity={0}>
          <Text x={YEAR_X} y={DATE_Y} size={160}>
            2026
          </Text>
        </g>
        <g id="date-month" opacity={0}>
          <Text x={MONTH_X} y={DATE_Y} size={160}>
            03
          </Text>
        </g>
        <g id="date-day" opacity={0}>
          <Text x={DAY_X} y={DATE_Y} size={160}>
            15
          </Text>
        </g>
        {SEP_X.map((x, index) => (
          <g key={x} id={`date-hyphen-${index}`} opacity={0}>
            <rect x={x - 36} y={DATE_Y - 78} width={72} height={22} rx={8} fill={ORANGE} />
          </g>
        ))}
        {SEP_X.map((x, index) => (
          <g key={`slash-${x}`} id={`date-slash-${index}`} opacity={0}>
            <path
              id={`date-slash-${index}-box`}
              d={`M ${x - 28} ${DATE_Y - 28} L ${x + 28} ${DATE_Y - 148}`}
              fill="none"
              stroke={BLUE}
              strokeWidth={6}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
      <CodeCallout id="date-code" x={960} y={900} text={CODE} />
    </Stage>
  );
}

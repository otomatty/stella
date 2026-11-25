import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, INK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const PATTERN = "[0-9]";
const CODE = '"A1B2C3".replace(/[0-9]/g, "") → "ABC"';
export const digitSieveText = `A1B2C3${PATTERN}${CODE}`;

const WOOD = "#D4A15A";
const WOOD_LIGHT = "#F0D7A4";
const WOOD_DARK = "#A56B32";
const MESH = "#5E676E";
const ORANGE = "#F08A24";
const ORANGE_DARK = "#C4620A";
const BLUE_DARK = "#1D4ED8";
const R = 58;
const REST_Y = 500;
const FALL = 228;
const XS = [510, 690, 870, 1050, 1230, 1410] as const;
const PACKED = [830, 960, 1090] as const;
const LANDED = [780, 960, 1140] as const;
const BEADS = [
  { id: "a", letter: "A", digit: false, x: XS[0] },
  { id: "1", letter: "1", digit: true, x: XS[1] },
  { id: "b", letter: "B", digit: false, x: XS[2] },
  { id: "2", letter: "2", digit: true, x: XS[3] },
  { id: "c", letter: "C", digit: false, x: XS[4] },
  { id: "3", letter: "3", digit: true, x: XS[5] },
] as const;
const MESH_LINES = Array.from({ length: 34 }, (_, i) => 320 + i * 42);

function Bead({ letter, digit }: { letter: string; digit: boolean }) {
  return (
    <>
      <circle r={R} cy={8} fill={digit ? ORANGE_DARK : BLUE_DARK} />
      <circle r={R} fill={digit ? ORANGE : BLUE} />
      <ellipse
        cx={-14}
        cy={24}
        rx={32}
        ry={14}
        fill={digit ? ORANGE_DARK : BLUE_DARK}
        opacity={0.45}
      />
      <ellipse cx={-20} cy={-22} rx={18} ry={11} fill="#fff" opacity={0.7} />
      <Text x={0} y={22} size={64} fill="#fff">
        {letter}
      </Text>
    </>
  );
}

export function DigitSieve({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["digit-sieve"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      const span = (beat: number, from: number, seconds: number) =>
        at(beat, from + seconds) - at(beat, from);
      rise("#sieve", at(0));
      for (const [i, bead] of BEADS.entries()) {
        const from = 0.15 + i * 0.62;
        t.fromTo(
          `#sieve-bead-${bead.id}`,
          { y: -460, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: span(1, from, 0.5),
            ease: "power2.out",
            immediateRender: false,
          },
          at(1, from),
        );
      }
      show("#sieve-tag", at(2, 0.2));
      show(".sieve-ring", at(2, 0.7));
      t.to(".sieve-ring", { opacity: 0, duration: 0.2 }, at(3, 0.05));
      let landed = 0;
      for (const bead of BEADS) {
        if (!bead.digit) continue;
        const landX = LANDED[landed] ?? bead.x;
        landed += 1;
        t.to(
          `#sieve-bead-${bead.id}`,
          {
            x: landX - bead.x,
            y: FALL,
            opacity: 0.85,
            duration: span(3, 0.2, 0.85),
            ease: "power2.in",
          },
          at(3, 0.2),
        );
      }
      let packedIndex = 0;
      for (const bead of BEADS) {
        if (bead.digit) continue;
        const packed = PACKED[packedIndex] ?? bead.x;
        packedIndex += 1;
        t.to(
          `#sieve-bead-${bead.id}`,
          { x: packed - bead.x, duration: span(3, 1.2, 0.7), ease: "power2.inOut" },
          at(3, 1.2),
        );
      }
      show("#sieve-code", at(3, 2.3));
      emphasize("sieve-code", at(3, 2.9));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <defs>
        <clipPath id="sieve-mesh-clip">
          <ellipse cx={960} cy={470} rx={548} ry={78} />
        </clipPath>
      </defs>
      <g id="sieve">
        <ellipse cx={960} cy={812} rx={500} ry={12} fill={INK} opacity={0.06} />
        <path
          d="M430 724 A530 40 0 0 0 1490 724 L1490 768 A510 30 0 0 1 430 768 Z"
          fill={WOOD_DARK}
        />
        <path d="M440 718 A520 36 0 0 0 1480 718 L1480 754 A500 26 0 0 1 440 754 Z" fill={WOOD} />
        <ellipse cx={960} cy={718} rx={490} ry={30} fill="#8A5A28" />
        <ellipse
          cx={960}
          cy={718}
          rx={530}
          ry={40}
          fill="none"
          stroke={WOOD_LIGHT}
          strokeWidth={12}
        />
        <path d="M360 470 A600 100 0 0 0 1560 470 L1560 600 A600 100 0 0 1 360 600 Z" fill={WOOD} />
        <path
          d="M378 488 A582 94 0 0 0 1542 488 L1542 512 A582 94 0 0 1 378 512 Z"
          fill={WOOD_LIGHT}
        />
        <ellipse cx={960} cy={470} rx={548} ry={78} fill="#F6E7C8" />
        <g clipPath="url(#sieve-mesh-clip)">
          {MESH_LINES.map((x) => (
            <g key={x}>
              <line x1={x - 240} y1={330} x2={x + 240} y2={620} stroke={MESH} strokeWidth={4.5} />
              <line x1={x + 240} y1={330} x2={x - 240} y2={620} stroke={MESH} strokeWidth={4.5} />
            </g>
          ))}
        </g>
        <ellipse
          cx={960}
          cy={470}
          rx={600}
          ry={100}
          fill="none"
          stroke={WOOD_DARK}
          strokeWidth={26}
        />
        <ellipse
          cx={960}
          cy={458}
          rx={586}
          ry={92}
          fill="none"
          stroke={WOOD_LIGHT}
          strokeWidth={10}
        />
        {BEADS.map((bead) => (
          <g key={bead.id} id={`sieve-bead-${bead.id}`} opacity={0}>
            <g transform={`translate(${bead.x} ${REST_Y})`}>
              <Bead letter={bead.letter} digit={bead.digit} />
            </g>
          </g>
        ))}
        <path d="M400 548 A560 86 0 0 0 1520 548 L1520 600 A560 90 0 0 1 400 600 Z" fill={WOOD} />
        <path d="M1340 575 L1340 655" stroke={WOOD_DARK} strokeWidth={7} />
        <path d="M460 742 A500 28 0 0 0 1460 742 L1460 778 A500 22 0 0 1 460 778 Z" fill={WOOD} />
        <path d="M480 778 A480 22 0 0 0 1440 778" fill="none" stroke={WOOD_DARK} strokeWidth={8} />
        <Tag id="sieve-tag" x={960} y={640} text={PATTERN} chars={5} />
      </g>
      {BEADS.filter((bead) => bead.digit).map((bead) => (
        <g key={bead.id} className="sieve-ring" opacity={0}>
          <circle cx={bead.x} cy={REST_Y} r={74} fill="none" stroke={ORANGE_DARK} strokeWidth={8} />
        </g>
      ))}
      <CodeCallout id="sieve-code" x={960} y={900} text={CODE} />
    </Stage>
  );
}

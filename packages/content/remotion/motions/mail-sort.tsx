import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, INK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const ADDRESSES = ["大阪市北区", "京都市中京区", "大阪市西区"] as const;
const CITY = "大阪";
const CODE = '"大阪市北区".startsWith("大阪") → true';
export const mailSortText = `${ADDRESSES.join("")}${CITY}${CODE}`;

const PAPER = "#F4E4C4";
const PAPER_EDGE = "#C4A574";
const FLAP = "#E7D3A4";
const WOOD = "#C4924A";
const WOOD_DARK = "#8A5A2B";
const WOOD_DEEP = "#6B4423";
const INK_SOFT = "#4A3424";
const STAMPS = ["#D4534A", "#2F8F6B", "#3A6EA5"] as const;

const ENV_W = 380;
const ENV_H = 220;
const START_X = [530, 960, 1390] as const;
const START_Y = 240;
const BOX_X = [240, 1040] as const;
const BOX_Y = 470;
const BOX_W = 640;
const BOX_H = 360;
/** 手前の板の上端。封筒の中心をここに置くと、下半分が板の後ろに隠れる。 */
const LIP = 200;
const SLOT_SCALE = 0.85;
/** 手前の板の上端（画面座標）。封筒の下 3 割がこの線より下に入る。 */
const LIP_Y = BOX_Y + LIP - 28;
const SLOT_Y = LIP_Y - (ENV_H / 2) * SLOT_SCALE + ENV_H * SLOT_SCALE * 0.3;
const SLOT_X = [402, 718] as const;
const CHAR = 48;
/** ふたの先端より下で、封筒の中心より下。 */
const ADDR_Y = 32;

function AddressLine({ address, index }: { address: string; index: number }) {
  const prefix = address.slice(0, 2);
  const rest = address.slice(2);
  const prefixW = prefix.length * CHAR;
  const restW = rest.length * CHAR;
  const total = prefixW + restW;
  const prefixX = -total / 2 + prefixW / 2;
  const restX = -total / 2 + prefixW + restW / 2;
  return (
    <g>
      <rect
        id={`mail-hit-${index}-box`}
        x={prefixX - prefixW / 2 + 4}
        y={ADDR_Y - CHAR + 4}
        width={prefixW - 8}
        height={CHAR + 4}
        rx={12}
        fill="none"
        stroke={PAPER_EDGE}
        strokeWidth={4}
        opacity={0}
      />
      <Text id={`mail-head-${index}`} x={prefixX} y={ADDR_Y} size={CHAR} fill={INK_SOFT}>
        {prefix}
      </Text>
      <Text x={restX} y={ADDR_Y} size={CHAR} fill={INK_SOFT}>
        {rest}
      </Text>
    </g>
  );
}

function Envelope({ address, index }: { address: string; index: number }) {
  return (
    <g id={`mail-envelope-${index}`} opacity={0}>
      <g transform={`translate(${START_X[index]} ${START_Y})`}>
        <ellipse cx={0} cy={ENV_H / 2 + 16} rx={150} ry={14} fill={INK} opacity={0.06} />
        <rect
          x={-ENV_W / 2}
          y={-ENV_H / 2}
          width={ENV_W}
          height={ENV_H}
          rx={12}
          fill={PAPER}
          stroke={PAPER_EDGE}
          strokeWidth={4}
        />
        <path
          d={`M ${-ENV_W / 2} ${-ENV_H / 2 + 6} L 0 -62 L ${ENV_W / 2} ${-ENV_H / 2 + 6}`}
          fill={FLAP}
        />
        <path
          d={`M ${-ENV_W / 2 + 6} ${-ENV_H / 2} L 0 -54 L ${ENV_W / 2 - 6} ${-ENV_H / 2}`}
          fill="none"
          stroke={PAPER_EDGE}
          strokeWidth={4}
        />
        <rect x={98} y={-104} width={80} height={52} rx={4} fill={STAMPS[index]} />
        <path
          d="M 106 -90 Q 130 -76 154 -90 T 172 -90"
          fill="none"
          stroke={INK_SOFT}
          strokeWidth={3}
          opacity={0.55}
        />
        <path
          d="M 106 -74 Q 130 -60 154 -74 T 172 -74"
          fill="none"
          stroke={INK_SOFT}
          strokeWidth={3}
          opacity={0.55}
        />
        <AddressLine address={address} index={index} />
      </g>
    </g>
  );
}

function BoxBack({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${BOX_Y})`}>
      <ellipse cx={BOX_W / 2} cy={BOX_H + 18} rx={250} ry={16} fill={INK} opacity={0.06} />
      <path
        d={`M 36 28 L 0 72 L 0 ${BOX_H - 36} L 36 ${BOX_H} L ${BOX_W - 36} ${BOX_H} L ${BOX_W} ${BOX_H - 36} L ${BOX_W} 72 L ${BOX_W - 36} 28 Z`}
        fill={WOOD}
      />
      <path
        d={`M 70 64 L 40 100 L 40 ${BOX_H - 70} L 78 ${BOX_H - 36} L ${BOX_W - 78} ${BOX_H - 36} L ${BOX_W - 40} ${BOX_H - 70} L ${BOX_W - 40} 100 L ${BOX_W - 70} 64 Z`}
        fill={WOOD_DEEP}
      />
    </g>
  );
}

function BoxFront({ x, label }: { x: number; label: string }) {
  return (
    <g transform={`translate(${x} ${BOX_Y})`}>
      <path
        d={`M 0 ${LIP} L 36 ${LIP - 28} L ${BOX_W - 36} ${LIP - 28} L ${BOX_W} ${LIP} L ${BOX_W} ${BOX_H - 28} L ${BOX_W - 36} ${BOX_H} L 36 ${BOX_H} L 0 ${BOX_H - 28} Z`}
        fill={WOOD}
        stroke={WOOD_DARK}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path
        d={`M 36 ${LIP - 28} L ${BOX_W - 36} ${LIP - 28} L ${BOX_W - 36} ${LIP - 8} L 36 ${LIP - 8} Z`}
        fill="#E2C08A"
      />
      <g transform={`translate(${BOX_W / 2} ${LIP + 78})`}>
        <rect
          x={-86}
          y={-40}
          width={172}
          height={80}
          rx={8}
          fill="#E6C98A"
          stroke={WOOD_DARK}
          strokeWidth={4}
        />
        {label ? (
          <Text x={0} y={18} size={48} fill={INK_SOFT}>
            {label}
          </Text>
        ) : null}
      </g>
    </g>
  );
}

export function MailSort({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["mail-sort"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      const span = (beat: number, from: number, seconds: number) =>
        at(beat, from + seconds) - at(beat, from);
      rise("#mail-backs", at(0));
      rise("#mail-fronts", at(0, 0.12));

      ADDRESSES.forEach((_, index) => {
        t.fromTo(
          `#mail-envelope-${index}`,
          {
            opacity: 0,
            scale: 0.94,
            transformOrigin: "center center",
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: "power3.out",
            immediateRender: false,
          },
          at(1, 0.2 + index * 0.85),
        );
      });

      const mark = (index: number, from: number, color: string) => {
        t.to(`#mail-hit-${index}-box`, { opacity: 1, stroke: color, duration: 0.25 }, at(2, from));
        t.to(`#mail-head-${index}`, { fill: color, duration: 0.25 }, at(2, from));
      };
      mark(0, 0.15, BLUE);
      t.to(
        "#mail-envelope-0",
        {
          x: SLOT_X[0] - START_X[0],
          y: SLOT_Y - START_Y,
          scale: SLOT_SCALE,
          duration: span(2, 0.45, 0.7),
          ease: "power2.inOut",
          transformOrigin: "center center",
        },
        at(2, 0.45),
      );
      mark(1, 1.3, GRAY);
      mark(2, 1.75, BLUE);
      const lift = 2.1;
      const cross = 2.5;
      t.to(
        "#mail-envelope-2",
        {
          y: 150 - START_Y,
          duration: span(2, lift, cross - lift),
          ease: "power2.out",
          transformOrigin: "center center",
        },
        at(2, lift),
      );
      t.to(
        "#mail-envelope-2",
        {
          x: SLOT_X[1] - START_X[2],
          duration: span(2, cross, 0.65),
          ease: "power2.inOut",
        },
        at(2, cross),
      );
      t.to(
        "#mail-envelope-2",
        {
          y: SLOT_Y - START_Y,
          scale: SLOT_SCALE,
          duration: span(2, 3.2, 0.6),
          ease: "power2.inOut",
        },
        at(2, 3.2),
      );

      emphasize("mail-hit-0", at(3, 0.25));
      emphasize("mail-hit-2", at(3, 0.25));
      show("#mail-code", at(3, 1.1));
      emphasize("mail-code", at(3, 1.7));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="mail-backs">
        {BOX_X.map((x) => (
          <BoxBack key={x} x={x} />
        ))}
      </g>
      {ADDRESSES.map((address, index) => (
        <Envelope key={address} address={address} index={index} />
      ))}
      <g id="mail-fronts">
        <BoxFront x={BOX_X[0]} label={CITY} />
        <BoxFront x={BOX_X[1]} label="" />
      </g>
      <CodeCallout id="mail-code" x={960} y={908} text={CODE} />
    </Stage>
  );
}

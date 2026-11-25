import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, CodeCallout, INK, Line, RED, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const EXPIRES = "3/31まで";
const EXPIRED = "期限切れ";
const REJECTED = "使えません";
const STOP = "止める";
const REASON = "理由";
const EXPRESSION = `throw new Error("${REJECTED}")`;
export const ticketGateStopText = EXPIRES + EXPIRED + REJECTED + STOP + REASON + EXPRESSION;

const FACE_Y = 300;
const FACE_H = 400;
const FACE_BOTTOM = FACE_Y + FACE_H;
const LIFT = 78;
const INSET = 34;
const LEFT = 404;
const BODY_W = 336;
const RIGHT = 1180;
const INNER_L = LEFT + BODY_W;
const INNER_R = RIGHT;
const TOP_Y = FACE_Y - LIFT;

const TOP = "#F4FAFD";
const FACE = "#D4E6F2";
const SIDE = "#8EADC0";
const EDGE = "#6C93A8";
const STRIPE = "#1E8B4E";
const STRIPE_DARK = "#166B3C";
const PAPER = "#FBF6E0";
const PAPER_EDGE = "#C4B07A";
const PAPER_INK = "#5C4530";
const FLAP = "#F06A28";
const FLAP_LIGHT = "#FFC7A6";
const FLAP_EDGE = "#C44B16";
const FLOOR = "#E4EEF3";
const FLOOR_LINE = "#A9C0CC";

const FLAP_Y = 438;
const FLAP_H = 176;
const FLAP_W = 220;
const FLAP_TRAVEL = 202;

const TICKET_X = 1228;
const TICKET_Y = 318;
const TICKET_W = 260;
const TICKET_H = 150;
/** 投入口のスリット。これより上は口の中。 */
const SLOT_CLIP_Y = 354;
/** 2 文めの終わり: 切符の上半分がスリットより上。 */
const TICKET_HALF = SLOT_CLIP_Y - TICKET_H / 2 - TICKET_Y;

function Cabinet({ x }: { x: number }) {
  const top = `M ${x} ${FACE_Y} L ${x + BODY_W} ${FACE_Y} L ${x + BODY_W - INSET} ${TOP_Y} L ${x + INSET} ${TOP_Y} Z`;
  return (
    <g>
      <rect x={x + 16} y={FACE_Y + 12} width={BODY_W} height={FACE_H} rx={18} fill={SIDE} />
      <path d={top} fill={TOP} stroke={EDGE} strokeWidth={4} strokeLinejoin="round" />
      <rect
        x={x}
        y={FACE_Y}
        width={BODY_W}
        height={FACE_H}
        rx={18}
        fill={FACE}
        stroke={EDGE}
        strokeWidth={4}
      />
      <rect x={x + 8} y={FACE_Y + 186} width={BODY_W - 16} height={36} fill={STRIPE} />
      <rect x={x + BODY_W - 2} y={FACE_Y + 194} width={16} height={36} fill={STRIPE_DARK} />
      <rect
        x={x + 22}
        y={FACE_Y + 40}
        width={14}
        height={FACE_H - 100}
        rx={7}
        fill="#fff"
        opacity={0.3}
      />
      <rect
        x={x + 16}
        y={FACE_Y + FACE_H - 26}
        width={BODY_W - 32}
        height={14}
        rx={6}
        fill="#B7D0DE"
      />
    </g>
  );
}

function Flap({ id, x }: { id: string; x: number }) {
  return (
    <g id={id}>
      <rect
        x={x}
        y={FLAP_Y}
        width={FLAP_W}
        height={FLAP_H}
        rx={12}
        fill={FLAP}
        stroke={FLAP_EDGE}
        strokeWidth={4}
      />
      <rect x={x + 12} y={FLAP_Y + 16} width={FLAP_W - 24} height={26} rx={8} fill={FLAP_LIGHT} />
    </g>
  );
}

function Paper({
  id,
  x,
  y,
  w,
  h,
  size,
  labelAt,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  /** 上端からの文字位置。省略時は下寄り。 */
  labelAt?: number;
}) {
  return (
    <g id={id} opacity={0}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill={PAPER}
        stroke={PAPER_EDGE}
        strokeWidth={4}
      />
      <rect x={x} y={y} width={28} height={h} rx={12} fill={STRIPE} />
      <rect x={x + 14} y={y} width={18} height={h} fill={STRIPE} />
      <path
        d={`M ${x + 48} ${y + 16} V ${y + h - 16}`}
        stroke={PAPER_EDGE}
        strokeWidth={3}
        strokeDasharray="7 8"
      />
      <Text x={x + (w + 48) / 2} y={y + (labelAt ?? h * 0.7)} size={size} fill={PAPER_INK}>
        {EXPIRES}
      </Text>
    </g>
  );
}

export function TicketGateStop({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["ticket-gate-stop"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      const span = (beat: number, from: number, seconds: number) =>
        at(beat, from + seconds) - at(beat, from);
      rise("#ticket-gate", at(0));

      t.fromTo(
        "#gate-ticket",
        { opacity: 0, y: 400, scale: 0.94, transformOrigin: "50% 50%" },
        {
          opacity: 1,
          y: 400,
          scale: 1,
          duration: span(1, 0.12, 0.4),
          ease: "power3.out",
          immediateRender: false,
        },
        at(1, 0.12),
      );
      show("#gate-expired", at(1, 0.58));
      t.to(
        "#gate-ticket",
        { y: TICKET_HALF, duration: span(1, 0.9, 2.15), ease: "power2.in" },
        at(1, 0.9),
      );
      t.to("#gate-expired", { opacity: 0, duration: 0.2 }, at(2, 0));

      t.to(
        "#gate-ticket",
        { y: -180, opacity: 0, duration: span(2, 0, 0.35), ease: "power2.in" },
        at(2, 0),
      );
      t.to(
        "#gate-flap-l",
        { x: FLAP_TRAVEL, duration: span(2, 0.2, 0.7), ease: "power2.inOut" },
        at(2, 0.2),
      );
      t.to(
        "#gate-flap-r",
        { x: -FLAP_TRAVEL, duration: span(2, 0.2, 0.7), ease: "power2.inOut" },
        at(2, 0.2),
      );
      t.to("#gate-screen", { attr: { fill: RED }, duration: span(2, 0.2, 0.35) }, at(2, 0.2));
      t.to("#gate-arrow", { opacity: 0, duration: span(2, 0.25, 0.2) }, at(2, 0.25));
      show("#gate-message", at(2, 0.5));
      t.fromTo(
        "#gate-return",
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: span(2, 1.05, 0.55),
          ease: "power2.out",
          immediateRender: false,
        },
        at(2, 1.05),
      );

      draw("#gate-line-stop .line", at(3, 0.3), span(3, 0.3, 0.5));
      show("#gate-stop", at(3, 0.8));
      draw("#gate-line-reason .line", at(3, 0.95), span(3, 0.95, 0.45));
      show("#gate-reason", at(3, 1.4));
      show("#gate-expression", at(3, 2.6));
      emphasize("gate-expression", at(3, 3.2));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <defs>
        <clipPath id="gate-aisle">
          <rect x={INNER_L} y={FLAP_Y - 6} width={INNER_R - INNER_L} height={FLAP_H + 12} />
        </clipPath>
        <clipPath id="gate-insert-clip">
          <rect x={1100} y={SLOT_CLIP_Y} width={520} height={760} />
        </clipPath>
        <clipPath id="gate-return-clip">
          <rect x={1180} y={36} width={420} height={176} />
        </clipPath>
      </defs>
      <g id="ticket-gate">
        <ellipse cx={960} cy={774} rx={570} ry={16} fill={INK} opacity={0.06} />
        <rect x={388} y={FACE_BOTTOM - 8} width={1144} height={30} rx={10} fill="#C9DBE6" />
        <path
          d={`M ${INNER_L} ${FACE_BOTTOM} L ${INNER_R} ${FACE_BOTTOM} L ${INNER_R + 64} ${FACE_BOTTOM + 56} L ${INNER_L - 64} ${FACE_BOTTOM + 56} Z`}
          fill={FLOOR}
        />
        <path
          d={`M ${INNER_L + 18} ${FACE_BOTTOM} L ${INNER_L - 40} ${FACE_BOTTOM + 52}`}
          stroke={FLOOR_LINE}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <path
          d={`M ${INNER_R - 18} ${FACE_BOTTOM} L ${INNER_R + 40} ${FACE_BOTTOM + 52}`}
          stroke={FLOOR_LINE}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <path
          d={`M 960 ${FACE_BOTTOM + 6} L 960 ${FACE_BOTTOM + 50}`}
          stroke={FLOOR_LINE}
          strokeWidth={4}
          strokeDasharray="10 12"
          strokeLinecap="round"
        />
        <Cabinet x={LEFT} />
        <Cabinet x={RIGHT} />
        <g>
          <rect x={1244} y={366} width={228} height={16} rx={8} fill="#D09A14" />
          <rect
            x={1244}
            y={322}
            width={228}
            height={52}
            rx={10}
            fill="#F6CC3D"
            stroke="#D09A14"
            strokeWidth={4}
          />
          <rect x={1270} y={340} width={176} height={14} rx={4} fill="#1A1C1E" />
        </g>
        <rect x={1276} y={230} width={200} height={64} rx={12} fill="#3E6274" />
        <rect id="gate-screen" x={1288} y={242} width={176} height={42} rx={8} fill="#142833" />
        <path
          id="gate-arrow"
          d="M 1376 250 L 1400 268 H 1386 V 278 H 1366 V 268 H 1352 Z"
          fill="#22C55E"
        />
        <g>
          <rect
            x={1238}
            y={204}
            width={220}
            height={24}
            rx={8}
            fill="#C5D8E4"
            stroke={EDGE}
            strokeWidth={3}
          />
          <rect x={1250} y={212} width={196} height={10} rx={3} fill="#1A1C1E" />
        </g>
        <g clipPath="url(#gate-aisle)">
          <Flap id="gate-flap-l" x={INNER_L - FLAP_TRAVEL} />
          <Flap id="gate-flap-r" x={INNER_R - (FLAP_W - FLAP_TRAVEL)} />
        </g>
      </g>
      <g clipPath="url(#gate-insert-clip)">
        <Paper id="gate-ticket" x={TICKET_X} y={TICKET_Y} w={TICKET_W} h={TICKET_H} size={40} />
      </g>
      <g clipPath="url(#gate-return-clip)">
        <Paper id="gate-return" x={1248} y={138} w={200} h={148} size={32} labelAt={52} />
      </g>
      <g id="gate-message" opacity={0}>
        <Text x={1376} y={272} size={28} fill="#fff">
          {REJECTED}
        </Text>
      </g>
      <Callout id="gate-expired" x={1688} y={400} text={EXPIRED} />
      <Line id="gate-line-stop" d="M 900 438 L 900 156 L 560 156" />
      <Callout id="gate-stop" x={460} y={156} text={STOP} />
      <Line id="gate-line-reason" d="M 1476 262 L 1672 262" />
      <Callout id="gate-reason" x={1752} y={262} text={REASON} />
      <CodeCallout id="gate-expression" x={960} y={900} text={EXPRESSION} />
    </Stage>
  );
}

import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, Tag, Mark, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

export const roomSignDigitText = "会議室305受付B2倉庫はいいいえ/\\d/.test(札)";

const ROOMS = [
  { id: "meeting", x: 230, text: "会議室", digit: -1, color: BLUE },
  { id: "305", x: 640, text: "305", digit: 0, color: VIOLET },
  { id: "reception", x: 1050, text: "受付", digit: -1, color: LINE },
  { id: "store", x: 1460, text: "B2倉庫", digit: 1, color: BLUE },
] as const;

function RoomDoor({ x, color }: { x: number; color: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x={-145} y={250} width={230} height={580} rx={16} fill={color} />
      <rect x={-115} y={286} width={170} height={190} rx={12} fill="#F1F1F4" />
      <circle cx={32} cy={565} r={17} fill={INK} />
    </g>
  );
}

export function RoomSignDigit({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["room-sign-digit"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#corridor", at(0));
      // 2 文めで札を一枚ずつ取り付ける。数字はまだ強調しない。
      ROOMS.forEach((room, i) => {
        show(`#label-${room.id}`, at(1, 0.2 + i * 0.65));
      });
      // 3 文めで虫めがねを左から動かし、数字が一文字見つかったところで止める。
      show("#scanner", at(2));
      ROOMS.forEach((room, i) => {
        const center = room.x + 182;
        const firstChar = center - (room.text.length - 1) * 20;
        const target =
          room.digit < 0 ? firstChar + (room.text.length - 1) * 40 : firstChar + room.digit * 40;
        t.set("#scanner", { x: firstChar - 35, y: 446 }, at(2, i * 1.05));
        t.to(
          "#scanner",
          { x: target, duration: at(2, i * 1.05 + 0.55) - at(2, i * 1.05), ease: "power1.inOut" },
          at(2, i * 1.05),
        );
        if (room.digit >= 0) show(`#found-${room.id}`, at(2, i * 1.05 + 0.55));
        show(`#answer-${room.id}, #answer-mark-${room.id}`, at(2, i * 1.05 + 0.72));
      });
      // 4 文めは札と判定を残し、書き方を一つだけ添える。
      t.to("#scanner", { opacity: 0, duration: 0.3 }, at(3));
      show("#test-call", at(3, 0.5));
      emphasize("test-call", at(3, 1.2));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="corridor" opacity={0}>
        <path d="M80 831 H1810" stroke={LINE} strokeWidth={3} strokeLinecap="round" />
        {ROOMS.map((room) => (
          <RoomDoor key={room.id} x={room.x} color={room.color} />
        ))}
        {/* 鉢植えも単色の形にまとめる。 */}
        <path
          d="M1740 731 V618 M1740 674 L1708 643 M1740 694 L1774 659"
          stroke="#527E4A"
          strokeWidth={7}
        />
        <path
          d="M1740 645 Q1697 614 1711 584 Q1744 593 1740 645 M1740 668 Q1779 623 1790 648 Q1782 681 1740 680 M1729 673 Q1692 674 1686 645 Q1717 638 1729 673"
          fill="#65985D"
        />
        <path d="M1705 728 H1774 L1762 804 H1719Z" fill={VIOLET} />
      </g>
      {ROOMS.map((room) => {
        const center = room.x + 182;
        const left = center - (room.text.length - 1) * 20;
        return (
          <g key={room.id}>
            <g id={`label-${room.id}`} opacity={0}>
              <rect
                x={center - 100}
                y={390}
                width={200}
                height={100}
                rx={12}
                fill="#fff"
                stroke={LINE}
                strokeWidth={3}
              />
              {Array.from(room.text).map((letter, i) => (
                <Text key={`${room.id}-${letter}`} x={left + i * 40} y={453} size={40} fill={INK}>
                  {letter}
                </Text>
              ))}
            </g>
            {room.digit >= 0 ? (
              <g id={`found-${room.id}`} opacity={0}>
                <rect
                  x={left + room.digit * 40 - 17}
                  y={468}
                  width={34}
                  height={6}
                  rx={3}
                  fill={BLUE}
                />
              </g>
            ) : null}
            <Tag
              id={`answer-${room.id}`}
              x={center}
              y={550}
              text={room.digit >= 0 ? "はい" : "いいえ"}
              color={room.digit >= 0 ? BLUE : VIOLET}
            />
            <Mark id={`answer-mark-${room.id}`} x={center} y={626} ok={room.digit >= 0} />
          </g>
        );
      })}
      {/* レンズは透明。探している文字を隠さず、柄だけを下に伸ばす。 */}
      <g id="scanner" opacity={0}>
        <path d="M24 35 L60 81 Q70 90 78 81 Q85 74 77 65 L41 22Z" fill={BLUE} />
        <path
          d="M-47 0 a47 47 0 1 0 94 0 a47 47 0 1 0-94 0 M-37 0 a37 37 0 1 0 74 0 a37 37 0 1 0-74 0"
          fill={BLUE}
          fillRule="evenodd"
        />
      </g>
      <CodeCallout id="test-call" x={960} y={910} text={String.raw`/\d/.test(札)`} />
    </Stage>
  );
}

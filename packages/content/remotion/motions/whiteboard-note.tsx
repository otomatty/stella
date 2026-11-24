import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const FIRST = "肥満";
const NEXT = "普通体重";
const DECLARATION = "let label: string";
export const whiteboardNoteText = `${FIRST}${NEXT}${DECLARATION}`;

export function WhiteboardNote({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["whiteboard-note"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#note-board", at(0));
      show("#note-first", at(1));
      t.to("#note-tray-eraser", { opacity: 0, duration: 0.24 }, at(2));
      show("#note-wiper", at(2), { duration: at(2, 0.22) - at(2) });
      const wipeStart = at(2, 0.22);
      const wipeEnd = at(2, 1.0);
      const wipe = { duration: wipeEnd - wipeStart, ease: "power2.inOut" };
      t.to("#note-wipe-mask", { attr: { x: 1350 }, ...wipe }, wipeStart);
      t.to("#note-wiper", { x: 800, ...wipe }, wipeStart);
      t.to("#note-wiper", { opacity: 0, duration: 0.2 }, wipeEnd);
      show("#note-tray-eraser, #note-next", at(2, 1.15));
      show("#note-declaration", at(3));
      emphasize("note-declaration", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <defs>
        <clipPath id="note-wipe">
          <rect id="note-wipe-mask" x={550} y={267} width={800} height={256} />
        </clipPath>
      </defs>
      <g id="note-board">
        <rect
          x={414}
          y={178}
          width={1092}
          height={477}
          rx={27}
          fill="#fff"
          stroke={GRAY}
          strokeWidth={12}
        />
        <rect
          x={445}
          y={209}
          width={1030}
          height={414}
          rx={12}
          fill="none"
          stroke={LINE}
          strokeWidth={4}
        />
        <rect
          x={526}
          y={665}
          width={868}
          height={40}
          rx={10}
          fill={LINE}
          stroke={GRAY}
          strokeWidth={6}
        />
        <g id="note-tray-eraser">
          <rect x={590} y={669} width={116} height={31} rx={8} fill={BLUE} />
          <path d="M 597 689 H 699" stroke={GRAY} strokeWidth={11} strokeLinecap="round" />
        </g>
        <g clipPath="url(#note-wipe)">
          <Text id="note-first" x={960} y={466} size={150} opacity={0}>
            {FIRST}
          </Text>
        </g>
        <Text id="note-next" x={960} y={466} size={150} fill={BLUE} opacity={0}>
          {NEXT}
        </Text>
        <g id="note-wiper" opacity={0}>
          <rect x={491} y={328} width={118} height={160} rx={18} fill={BLUE} />
          <path d="M 598 350 V 466" stroke={GRAY} strokeWidth={19} strokeLinecap="round" />
        </g>
      </g>
      <CodeCallout id="note-declaration" x={960} y={852} text={DECLARATION} />
    </Stage>
  );
}

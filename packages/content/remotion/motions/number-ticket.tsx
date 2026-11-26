import { useCallback, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, Tag, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

export const numberTicketText = '整理券次の番号受付42"42"43+1Number("42")';

function Ticket() {
  return (
    <g>
      <path
        d="M -128 -163 H 128 V -56 Q 107 -45 128 -34 V 163 H -128 V -34 Q -107 -45 -128 -56 Z"
        fill="#fff"
        stroke={LINE}
        strokeWidth={3}
      />
      <path d="M -128 -163 H 128 V -94 H -128 Z" fill={BLUE} />
      <Text x={0} y={-115} size={35} fill="#FFFFFF">
        受付
      </Text>
      <path d="M -108 -44 H 108" stroke={LINE} strokeWidth={4} strokeDasharray="9 8" />
      <Text x={0} y={8} size={34} fill={INK}>
        整理券
      </Text>
      <Text x={0} y={105} size={96} fill={INK}>
        42
      </Text>
      <path d="M -96 138 H 96" stroke={LINE} strokeWidth={3} />
    </g>
  );
}

/** 紙の印字が機械を通って数のブロックになり、次の番号を計算する。 */
export function NumberTicket({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["number-ticket"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const next = time >= at(2, 3.3) ? "43" : "";
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#nt-counter", at(0));
      show("#nt-paper", at(1));
      show("#nt-quote", at(1, 0.7));
      show("#nt-machine", at(2));
      t.to("#nt-quote", { opacity: 0, duration: 0.25 }, at(2));
      t.to(
        "#nt-paper",
        {
          x: 480,
          y: 54,
          scale: 0.45,
          transformOrigin: "50% 50%",
          duration: 1,
          ease: "power2.inOut",
        },
        at(2, 0.35),
      );
      t.to("#nt-paper", { opacity: 0, duration: 0.2 }, at(2, 1.25));
      show("#nt-block", at(2, 1.5));
      t.to("#nt-block", { x: 220, duration: 0.6, ease: "power2.out" }, at(2, 1.65));
      show("#nt-one", at(2, 2.1));
      t.to("#nt-one", { x: 1200, y: 752, duration: 0.65, ease: "power2.inOut" }, at(2, 2.45));
      show("#nt-number", at(2, 3.3));
      show("#nt-callout", at(3));
      emphasize("nt-callout", at(3, 0.7));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g transform="translate(-105 -80) scale(1.1)">
        <g id="nt-counter" opacity={0}>
          <rect x={1475} y={542} width={80} height={209} rx={12} fill={VIOLET} />
          <rect x={1360} y={748} width={310} height={30} rx={15} fill={VIOLET} />
          <rect x={1280} y={182} width={470} height={375} rx={32} fill={VIOLET} />
          <Text x={1515} y={265} size={44} fill="#fff">
            次の番号
          </Text>
          <rect x={1320} y={300} width={390} height={210} rx={16} fill={INK} />
        </g>
        <g id="nt-paper" opacity={0}>
          <g transform="translate(355 440)">
            <Ticket />
          </g>
        </g>
        <Tag id="nt-quote" x={355} y={641} text={'"42"'} />
        <g id="nt-machine" opacity={0}>
          <rect x={630} y={388} width={435} height={372} rx={28} fill={BLUE} />
          <rect x={655} y={488} width={145} height={32} rx={12} fill={INK} />
          <rect x={919} y={558} width={110} height={128} rx={12} fill={INK} />
          <rect x={916} y={686} width={166} height={20} rx={8} fill={LINE} />
          <circle cx={840} cy={574} r={29} fill="#fff" />
        </g>
        <g id="nt-block" opacity={0}>
          <g transform="translate(977 610)">
            <rect x={-63} y={-57} width={126} height={126} rx={14} fill={VIOLET} />
            <Text x={0} y={30} size={69} fill="#fff">
              42
            </Text>
          </g>
        </g>
        <Tag id="nt-one" x={1288} y={728} text="+1" color={BLUE} />
        <Text id="nt-number" x={1515} y={465} size={138} fill="#fff" opacity={0}>
          {next}
        </Text>
        <CodeCallout id="nt-callout" x={845} y={862} text={'Number("42")'} />
      </g>
    </Stage>
  );
}

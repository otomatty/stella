import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const scoreboardText = "あお組得点012letconst";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function Ball() {
  return (
    <g>
      <circle r={49} fill="#DE762F" />
      <path
        d="M-46-17 Q0-42 46-17 M-47 17 Q0-10 47 17 M-17-46 Q18 0-13 47"
        fill="none"
        stroke="#8C4829"
        strokeWidth={3}
      />
    </g>
  );
}

export function Scoreboard({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS.scoreboard.seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const time = useCurrentFrame() / useVideoConfig().fps;
  // ネットを抜けたあと、リングを軸に札がめくれて得点が変わる。
  const flips = [1.25, 3.25];
  const score = flips.filter((offset) => time >= at(1, offset + 0.28)).length;
  const fold = Math.min(
    ...flips.map((offset) =>
      interpolate(
        time,
        [at(1, offset), at(1, offset + 0.28), at(1, offset + 0.62)],
        [1, 0.03, 1],
        clamp,
      ),
    ),
  );
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#gym, #score-stand", at(0));
      [0, 1].forEach((i) => {
        const start = i * 2;
        const id = `#shot-${i}`;
        show(`${id} .ball-art`, at(1, start), { duration: at(1, start + 0.16) - at(1, start) });
        t.to(
          id,
          { x: 560, duration: at(1, start + 0.85) - at(1, start), ease: "none" },
          at(1, start),
        );
        t.to(
          id,
          { y: 145, duration: at(1, start + 0.42) - at(1, start), ease: "power1.out" },
          at(1, start),
        );
        t.to(
          id,
          { y: 335, duration: at(1, start + 0.85) - at(1, start + 0.42), ease: "power1.in" },
          at(1, start + 0.42),
        );
        t.to(
          id,
          {
            y: 750,
            x: 535 + i * 110,
            duration: at(1, start + 1.6) - at(1, start + 0.85),
            ease: "power1.in",
          },
          at(1, start + 0.85),
        );
      });
      // 名札は固定したまま、床を転がるボールで試合の続きを見せる。
      show("#team-plate", at(2), { duration: at(2, 0.4) - at(2) });
      t.to(
        "#shot-0",
        { x: 260, duration: at(2, 2.4) - at(2, 0.6), ease: "power1.out" },
        at(2, 0.6),
      );
      t.to(
        "#shot-0 .ball-art",
        {
          rotation: -240,
          transformOrigin: "50% 50%",
          duration: at(2, 2.4) - at(2, 0.6),
          ease: "power1.out",
        },
        at(2, 0.6),
      );
      show("#score-type", at(3, 0.5));
      emphasize("score-type", at(3, 1));
      show("#team-type", at(3, 1.5));
      emphasize("team-type", at(3, 2));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="gym">
        <rect x={696} y={290} width={28} height={470} rx={14} fill={LINE} />
        <rect x={649} y={746} width={122} height={22} rx={11} fill={LINE} />
        <rect x={355} y={152} width={410} height={225} rx={22} fill={BLUE} />
        <rect x={472} y={235} width={176} height={119} rx={10} fill="#fff" />
        {/* ネットはひもだけで描く。 */}
        <path
          d="M466 350 L499 477 Q560 500 621 477 L654 350 M479 401 Q560 423 643 401 M490 445 Q560 468 630 445"
          fill="none"
          stroke={LINE}
          strokeWidth={4}
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={"M " + (468 + i * 44) + " 354 L " + (514 + i * 23) + " 483"}
            fill="none"
            stroke={LINE}
            strokeWidth={3}
          />
        ))}
      </g>
      {[0, 1].map((i) => (
        <g key={i} id={"shot-" + i} transform="translate(200 600)">
          <g className="ball-art" opacity={0}>
            <Ball />
          </g>
        </g>
      ))}
      <g id="score-stand">
        <path
          d="M461 350 a99 19 0 1 0 198 0 a99 19 0 1 0-198 0 M473 350 a87 11 0 1 1 174 0 a87 11 0 1 1-174 0"
          fill={BLUE}
          fillRule="evenodd"
        />
        <rect x={934} y={680} width={30} height={150} rx={15} fill={LINE} />
        <rect x={1658} y={680} width={30} height={150} rx={15} fill={LINE} />
        <rect x={880} y={290} width={873} height={421} rx={30} fill={BLUE} />
        <Text x={1533} y={392} size={40} fill="#fff">
          得点
        </Text>
        <rect x={1400} y={441} width={268} height={218} rx={14} fill={LINE} />
        <g transform={"translate(1400 425) scale(1 " + fold + ")"}>
          <rect width={268} height={218} rx={14} fill="#fff" />
          <Text x={134} y={179} size={178} fill={INK}>
            {score}
          </Text>
        </g>
        {[1440, 1625].map((x) => (
          <rect key={x} x={x - 8} y={409} width={16} height={39} rx={8} fill={INK} />
        ))}
        <g id="team-plate" opacity={0}>
          <rect x={921} y={424} width={374} height={177} rx={16} fill="#fff" />
          <Text x={1108} y={544} size={80} fill={BLUE}>
            あお組
          </Text>
        </g>
      </g>
      <CodeCallout id="team-type" x={1108} y={909} text="const" />
      <CodeCallout id="score-type" x={1533} y={909} text="let" />
    </Stage>
  );
}

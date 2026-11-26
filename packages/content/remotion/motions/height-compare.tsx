import { useCallback, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { Callout, BLUE, INK, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

export const heightCompareText = "0123456789cmいまいちばん高い人最大値168を残す";
const PEOPLE = [
  { x: 790, height: 152, shirt: VIOLET, skin: "#EAC09C" },
  { x: 550, height: 168, shirt: BLUE, skin: "#DCA980" },
  { x: 310, height: 160, shirt: LINE, skin: "#F0C8A5" },
];
const FLOOR = 814;
const MEASURE_X = 1100;
const PODIUM_X = 1570;
const topOf = (height: number) => FLOOR - height * 3;

/** 頭の頂点までを身長と同じ比率で描く。 */
function Child({ index }: { index: number }) {
  const person = PEOPLE[index];
  return (
    <g transform={`scale(${person.height / 160})`}>
      <path
        d="M-61 -29H-20L-14 -5Q-22 5 -87 -2V-13Q-85 -26 -61 -29Z M20 -29H61Q84 -26 87 -13V-2Q22 5 14 -5Z"
        fill={INK}
      />
      <path d="M-65 -202H65L61 -29H20L0 -143L-20 -29H-61Z" fill={LINE} />
      <rect x={-20} y={-353} width={40} height={42} rx={12} fill={person.skin} />
      <path
        d="M-22 -330L-68 -322Q-84 -316 -91 -281L-82 -218Q-79 -208 -66 -216L-61 -239L-65 -202Q0 -186 65 -202L61 -239L66 -216Q79 -208 82 -218L91 -281Q84 -316 68 -322L22 -330Q0 -312 -22 -330Z"
        fill={person.shirt}
      />
      <ellipse cx={-60} cy={-393} rx={12} ry={20} fill={person.skin} />
      <ellipse cx={60} cy={-393} rx={12} ry={20} fill={person.skin} />
      <path
        d="M-60 -429Q-62 -465 0 -465Q62 -465 60 -429V-389Q55 -343 0 -340Q-55 -343 -60 -389Z"
        fill={person.skin}
      />
      <path
        d="M-62 -400Q-74 -450 -46 -464Q-38 -480 0 -480Q75 -480 62 -399L44 -434Q8 -427 -24 -454L-43 -425Z"
        fill={INK}
      />
      <ellipse cx={-23} cy={-397} rx={5} ry={7} fill={INK} />
      <ellipse cx={23} cy={-397} rx={5} ry={7} fill={INK} />
      <path d="M-17 -373Q0 -367 17 -373Q12 -355 0 -355Q-12 -355 -17 -373Z" fill="#fff" />
    </g>
  );
}

export function HeightCompare({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["height-compare"].seconds), [beats]);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const best = time >= at(2, 1.7) ? 168 : 152;
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#height-scene", at(0));
      const move = (i: number, x: number, y: number, beat: number, start: number, end: number) =>
        t.to(
          `#height-person-${i}`,
          {
            x: x - PEOPLE[i].x,
            y,
            duration: at(beat, end) - at(beat, start),
            ease: "power2.inOut",
          },
          at(beat, start),
        );
      const measure = (i: number, beat: number, start: number) => {
        move(i, MEASURE_X, 0, beat, start, start + 0.45);
        t.to(
          "#height-slider",
          {
            y: topOf(PEOPLE[i].height) - 204,
            duration: at(beat, start + 0.85) - at(beat, start + 0.45),
            ease: "power2.inOut",
          },
          at(beat, start + 0.45),
        );
        show(`#height-reading-${i}`, at(beat, start + 0.85), {
          duration: at(beat, start + 1.05) - at(beat, start + 0.85),
        });
      };
      // 最初の人を測って台へ。次の文まで比較の結果を先に出さない。
      measure(0, 1, 0);
      move(0, PODIUM_X, -54, 1, 1.4, 2.15);
      t.to("#height-reading-0", { opacity: 0, duration: at(1, 2.15) - at(1, 1.95) }, at(1, 1.95));
      show("#height-best", at(1, 2.15));
      t.to("#height-slider", { y: 0, duration: at(1, 2.6) - at(1, 2.2) }, at(1, 2.2));
      measure(1, 2, 0);
      // 高い人なら交代。元の人は手前を通って列へ戻る。
      move(0, 1280, 80, 2, 1.05, 1.35);
      move(0, PEOPLE[0].x, 0, 2, 1.35, 1.75);
      show("#height-reading-0", at(2, 1.75));
      move(1, PODIUM_X, -54, 2, 1.35, 1.95);
      t.to("#height-reading-1", { opacity: 0, duration: at(2, 1.95) - at(2, 1.75) }, at(2, 1.75));
      t.to("#height-slider", { y: 0, duration: at(2, 2.15) - at(2, 1.95) }, at(2, 1.95));
      measure(2, 2, 2.2);
      // 3 人めは低い。台の人を動かさず、測った人だけ列に戻す。
      move(2, PEOPLE[2].x, 0, 2, 3.55, 4.25);
      t.to("#height-slider", { y: 0, duration: at(2, 4.5) - at(2, 4.25) }, at(2, 4.25));
      show("#height-crown", at(3));
      show("#height-max", at(3, 0.7));
      emphasize("height-max", at(3, 1.2));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="height-scene">
        {/* 身長計と台は単色。目盛りだけを線で描く。 */}
        <rect x={903} y={814} width={347} height={28} rx={10} fill={LINE} />
        <rect x={963} y={142} width={77} height={684} rx={14} fill={LINE} />
        {Array.from({ length: 108 }, (_, i) => i + 1).map((i) => (
          <path
            key={i}
            d={`M${i % 5 === 0 ? 980 : 994} ${FLOOR - i * 6}H1024`}
            stroke={INK}
            strokeWidth={i % 5 === 0 ? 3 : 2}
          />
        ))}
        {[100, 120, 140, 160, 180].map((n) => (
          <Text key={n} x={947} y={topOf(n) + 8} size={24} anchor="end" fill={INK}>
            {n}
          </Text>
        ))}
        <g id="height-slider">
          <path d="M970 168H1047V190H1191V204H1015V222H970Z" fill={BLUE} />
        </g>
        <rect x={1370} y={760} width={400} height={82} rx={12} fill={VIOLET} />
        <Text x={1570} y={812} size={32} fill="#fff">
          いまいちばん高い人
        </Text>
        {PEOPLE.map((p, i) => (
          <g key={p.height} id={`height-person-${i}`}>
            <g transform={`translate(${p.x} ${FLOOR})`}>
              <Child index={i} />
            </g>
            <Tag
              id={`height-reading-${i}`}
              x={p.x + 15}
              y={topOf(p.height) - 47}
              text={`${p.height} cm`}
              chars={3.5}
              color={p.shirt === LINE ? BLUE : p.shirt}
            />
          </g>
        ))}
        <Tag id="height-best" x={1570} y={161} text={`${best} cm`} />
        <g id="height-crown" opacity={0} transform="translate(1570 225)">
          <path d="M-45 -17L-24 0L0 -27L24 0L45 -17L35 25H-35Z" fill={VIOLET} />
        </g>
      </g>
      <Callout id="height-max" x={1480} y={908} text="最大値 168 を残す" />
    </Stage>
  );
}

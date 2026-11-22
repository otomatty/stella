import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  Callout,
  GRAY,
  Head,
  INK,
  LINE,
  Line,
  PINK,
  Stage,
  stageMotion,
  Text,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const umbrellaChoiceText = "傘帽子なしifelse ifelse";

const CHOICES = [
  {
    weather: "rain",
    item: "傘",
    label: "if",
    y: 220,
    route: "M 750 505 H 860 Q 910 505 910 455 V 270 Q 910 220 960 220 H 1160",
  },
  { weather: "sun", item: "帽子", label: "else if", y: 505, route: "M 750 505 H 1160" },
  {
    weather: "cloud",
    item: "なし",
    label: "else",
    y: 790,
    route: "M 750 505 H 860 Q 910 505 910 555 V 740 Q 910 790 960 790 H 1160",
  },
] as const;

export function UmbrellaChoice({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["umbrella-choice"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw } = stageMotion(t);
      rise("#umbrella-scene", at(0));
      const weatherBeats = [
        [1, 0],
        [2, 0],
        [2, 2.1],
      ] as const;
      CHOICES.forEach(({ weather }, i) => {
        const [beat, offset] = weatherBeats[i];
        const start = at(beat, offset);
        const nextBeat = weatherBeats[i + 1];
        show(`#weather-${weather}`, start);
        draw(`#weather-route-${i} .line`, start, at(beat, offset + 0.5) - start);
        t.to(`#weather-head-${i}`, { opacity: 1, duration: 0.15 }, at(beat, offset + 0.43));
        t.to(`#weather-item-${i}`, { opacity: 1, duration: 0.3 }, start);
        t.to(`#weather-box-${i}`, { stroke: PINK, duration: 0.3 }, start);
        if (nextBeat) {
          const next = at(nextBeat[0], nextBeat[1]);
          t.to(`#weather-${weather}`, { opacity: 0, duration: 0.2 }, next);
          t.to(`#weather-item-${i}`, { opacity: 0.45, duration: 0.3 }, next);
          t.to(`#weather-box-${i}`, { stroke: LINE, duration: 0.3 }, next);
          t.to(`#weather-route-${i}, #weather-head-${i}`, { opacity: 0.28, duration: 0.3 }, next);
        }
        show(`#weather-code-${i}`, at(3));
      });
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="umbrella-scene">
        <rect
          x={278}
          y={318}
          width={443}
          height={395}
          rx={24}
          fill="#EFF6FF"
          stroke={INK}
          strokeWidth={9}
        />
        <path d="M 278 514 H 721 M 499 318 V 713" fill="none" stroke="#fff" strokeWidth={13} />
        <path d="M 252 732 H 747" stroke={GRAY} strokeWidth={26} strokeLinecap="round" />
        <g id="weather-rain" opacity={0}>
          <path
            d="M 384 483 Q 350 476 350 451 Q 350 418 391 418 Q 408 365 459 396 Q 506 370 528 425 Q 570 427 570 455 Q 570 483 536 483 Z"
            fill="#64748B"
          />
          <path
            d="M 405 525 L 385 573 M 471 525 L 451 573 M 537 525 L 517 573 M 451 601 L 431 649 M 517 601 L 497 649"
            stroke={BLUE}
            strokeWidth={10}
            strokeLinecap="round"
          />
        </g>
        <g id="weather-sun" opacity={0}>
          <circle cx={499} cy={512} r={71} fill="#FBBF24" />
          <path
            d="M 499 388 V 412 M 499 612 V 636 M 375 512 H 399 M 599 512 H 623 M 413 426 L 430 443 M 568 581 L 585 598 M 413 598 L 430 581 M 568 443 L 585 426"
            stroke="#D97706"
            strokeWidth={9}
            strokeLinecap="round"
          />
        </g>
        <g id="weather-cloud" opacity={0}>
          <path
            d="M 414 558 Q 375 558 375 523 Q 375 486 417 484 Q 427 424 488 432 Q 527 431 550 474 Q 616 473 616 518 Q 616 558 573 558 Z"
            fill="#CBD5E1"
            stroke="#64748B"
            strokeWidth={7}
          />
        </g>
        {CHOICES.map(({ y, item }, i) => (
          <g key={item}>
            <rect
              id={`weather-box-${i}`}
              x={1200}
              y={y - 96}
              width={412}
              height={192}
              rx={24}
              fill="#fff"
              stroke={LINE}
              strokeWidth={8}
            />
            <g id={`weather-item-${i}`} opacity={0.45}>
              <path
                d={`M 1310 ${y - 76} h 50 q 15 0 15 15 v 12`}
                fill="none"
                stroke={GRAY}
                strokeWidth={7}
                strokeLinecap="round"
              />
              {i === 0 && (
                <path
                  d="M 1339 240 Q 1349 179 1398 179 Q 1447 179 1457 240 Q 1428 225 1398 240 Q 1368 225 1339 240 Z M 1398 185 V 268 Q 1398 289 1377 281"
                  fill={VIOLET}
                  stroke={VIOLET}
                  strokeWidth={7}
                  strokeLinecap="round"
                />
              )}
              {i === 1 && (
                <path
                  d="M 1333 536 Q 1347 524 1369 523 L 1377 485 Q 1395 463 1421 485 L 1431 523 Q 1468 525 1473 537 Q 1456 558 1399 557 Q 1349 557 1333 536 Z"
                  fill="#B88754"
                  stroke="#865634"
                  strokeWidth={6}
                />
              )}
              <Text x={i === 2 ? 1406 : 1525} y={y + 17} size={44}>
                {item}
              </Text>
            </g>
          </g>
        ))}
      </g>
      {CHOICES.map(({ label, y, route }, i) => (
        <g key={label}>
          <Line id={`weather-route-${i}`} d={route} />
          <Head id={`weather-head-${i}`} x={1168} y={y} angle={0} />
          <Callout id={`weather-code-${i}`} x={1406} y={y - 142} text={label} />
        </g>
      ))}
    </Stage>
  );
}

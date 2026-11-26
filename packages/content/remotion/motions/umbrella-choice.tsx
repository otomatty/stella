import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const umbrellaChoiceText = "雨・晴れくもり傘帽子なしelse if / else";

function Weather({ kind }: { kind: "rain" | "sun" | "cloud" }) {
  return kind === "sun" ? (
    <g>
      <path
        d="M0-99 V-78 M0 78 V99 M-99 0 H-78 M78 0 H99 M-70-70 L-55-55 M55 55 L70 70 M-70 70 L-55 55 M55-55 L70-70"
        stroke="#F2BE48"
        strokeWidth={9}
        strokeLinecap="round"
      />
      <circle r={57} fill="#F2BE48" />
    </g>
  ) : (
    <g>
      <path
        d="M-92 26 C-136 17-127-37-86-39 C-83-88-20-100 7-63 C42-92 83-59 83-30 C133-28 132 28 94 32Z"
        fill={kind === "rain" ? "#8D9BA8" : "#C7CDD3"}
      />
      {kind === "rain" ? (
        <path
          d="M-77 62 L-90 89 M-24 62 L-37 89 M29 62 L16 89 M82 62 L69 89"
          stroke="#4089B4"
          strokeWidth={9}
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
}

/** 閉じた傘は赤い布と茶色の持ち手だけで表す。 */
function Umbrella() {
  return (
    <g>
      <path
        d="M-8-150 V-189 C-8-232 55-232 55-191 V-181 H39 V-191 C39-211 8-211 8-189 V-150Z"
        fill="#865837"
      />
      <rect x={-4} y={145} width={8} height={38} rx={4} fill={LINE} />
      <path d="M-7-153 C-27-99-33 53-18 126 L0 162 L24 128 C37 40 23-105 7-153Z" fill="#D6604E" />
      <rect x={-30} y={-10} width={61} height={18} rx={5} fill={INK} />
    </g>
  );
}

function Hat() {
  return (
    <g>
      <ellipse cy={43} rx={139} ry={41} fill="#E7BF77" />
      <path d="M-83 40 L-65-53 Q-59-84 0-81 Q59-84 65-53 L83 40Z" fill="#E7BF77" />
      <path d="M-77 15 Q0 43 77 15 L83 40 Q0 71-83 40Z" fill={BLUE} />
    </g>
  );
}

export function UmbrellaChoice({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["umbrella-choice"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#entryway", at(0));
      show("#outside-rain", at(1), { duration: at(1, 0.35) - at(1) });
      t.to(
        "#entry-umbrella",
        { y: -210, duration: at(1, 0.8) - at(1, 0.3), ease: "power2.inOut" },
        at(1, 0.3),
      );
      t.to(
        "#entry-umbrella",
        {
          x: -220,
          rotation: -18,
          svgOrigin: "725 600",
          duration: at(1, 1.45) - at(1, 0.8),
          ease: "power2.inOut",
        },
        at(1, 0.8),
      );
      // 晴れでは傘を戻し、帽子だけを取り出す。くもりでは両方とも置いたまま。
      t.to("#outside-rain", { opacity: 0, duration: at(2, 0.25) - at(2) }, at(2));
      show("#outside-sun", at(2), { duration: at(2, 0.35) - at(2) });
      t.to(
        "#entry-umbrella",
        { x: 0, rotation: 0, duration: at(2, 0.45) - at(2), ease: "power2.inOut" },
        at(2),
      );
      t.to(
        "#entry-umbrella",
        { y: 0, duration: at(2, 0.8) - at(2, 0.45), ease: "power2.inOut" },
        at(2, 0.45),
      );
      t.to(
        "#entry-hat",
        {
          x: -450,
          y: 245,
          rotation: -12,
          svgOrigin: "1570 340",
          duration: at(2, 1.2) - at(2, 0.35),
          ease: "power2.inOut",
        },
        at(2, 0.35),
      );
      t.to("#outside-sun", { opacity: 0, duration: at(2, 2.6) - at(2, 2.35) }, at(2, 2.35));
      show("#outside-cloud", at(2, 2.35), { duration: at(2, 2.7) - at(2, 2.35) });
      t.to(
        "#entry-hat",
        { x: 0, y: 0, rotation: 0, duration: at(2, 3.05) - at(2, 2.35), ease: "power2.inOut" },
        at(2, 2.35),
      );
      ["rain", "sun", "cloud"].forEach((kind, i) => {
        show(`#weather-pair-${kind}, #weather-label-${kind}`, at(3, i * 0.35));
      });
      show("#weather-code", at(3, 1.4));
      emphasize("weather-code", at(3, 1.9));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="entryway">
        <rect x={200} y={140} width={450} height={716} rx={22} fill={BLUE} />
        <rect x={542} y={470} width={64} height={15} rx={7} fill="#fff" />
        {/* 窓の内側は白。空や庭の面は敷かず、天気だけを置く。 */}
        <rect x={803} y={160} width={564} height={362} rx={18} fill={LINE} />
        <rect x={823} y={180} width={524} height={322} rx={10} fill="#fff" />
        <g id="outside-rain" opacity={0}>
          <g transform="translate(1085 325) scale(1.25)">
            <Weather kind="rain" />
          </g>
        </g>
        <g id="outside-sun" opacity={0}>
          <g transform="translate(1085 325) scale(1.25)">
            <Weather kind="sun" />
          </g>
        </g>
        <g id="outside-cloud" opacity={0}>
          <g transform="translate(1085 325) scale(1.25)">
            <Weather kind="cloud" />
          </g>
        </g>
        <rect x={1445} y={251} width={252} height={38} rx={12} fill="#8330C7" />
        <path
          d="M1564 275 V325 Q1564 358 1598 336 L1590 326 Q1576 339 1576 325 V275Z"
          fill={LINE}
        />
        {/* 靴箱も装飾のない箱と靴にする。 */}
        <rect x={1435} y={618} width={290} height={228} rx={16} fill={LINE} />
        <rect x={1569} y={634} width={16} height={196} rx={8} fill="#fff" />
        <circle cx={1550} cy={710} r={8} fill={INK} />
        <circle cx={1608} cy={710} r={8} fill={INK} />
        <path
          d="M1475 575 Q1450 573 1450 585 Q1450 598 1509 596 H1550 V580 L1522 560 Q1500 580 1475 575Z"
          fill={BLUE}
        />
        <g id="entry-umbrella">
          <g transform="translate(725 600)">
            <Umbrella />
          </g>
        </g>
        <path d="M662 701 H788 L777 842 Q725 867 673 842Z" fill="#8330C7" />
        <g id="entry-hat">
          <g transform="translate(1570 340)">
            <Hat />
          </g>
        </g>
        {(["rain", "sun", "cloud"] as const).map((kind, i) => (
          <g key={kind} id={`weather-pair-${kind}`} opacity={0}>
            <g transform={`translate(${868 + i * 216} 625) scale(.4)`}>
              <Weather kind={kind} />
            </g>
            <path
              d={`M${868 + i * 216} 675v27m-8 -8l8 8 8 -8`}
              fill="none"
              stroke={LINE}
              strokeWidth={4}
              strokeLinecap="round"
            />
            {i === 0 ? (
              <g transform="translate(868 758) scale(.24)">
                <Umbrella />
              </g>
            ) : i === 1 ? (
              <g transform="translate(1084 750) scale(.4)">
                <Hat />
              </g>
            ) : (
              <Text x={1300} y={771} size={34} fill={INK}>
                なし
              </Text>
            )}
            <Tag
              id={`weather-label-${kind}`}
              x={868 + i * 216}
              y={825}
              text={["雨・傘", "晴れ・帽子", "くもり"][i]}
            />
          </g>
        ))}
      </g>
      <CodeCallout id="weather-code" x={1084} y={910} text="else if / else" />
    </Stage>
  );
}

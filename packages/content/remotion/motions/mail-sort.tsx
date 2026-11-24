import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const ADDRESSES = ["大阪市北区", "京都市中京区", "大阪市西区"];
const CITY = "大阪";
const CODE = '"大阪市北区".startsWith("大阪") → true';
export const mailSortText = `${ADDRESSES.join("")}${CITY}${CODE}`;

const ENVELOPE_W = 280;
const ENVELOPE_H = 160;
const START_X = [560, 980, 1400] as const;
const START_Y = 300;
const SLOT_X = [316, 644] as const;
const SLOT_Y = 548;
const FLY_Y = 112;
const BOX_Y = 430;
const BOX_W = 760;
const BOX_H = 344;

export function MailSort({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["mail-sort"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#mail-sorting", at(0));
      show(".mail-address", at(1));
      t.to(".mail-selected", { fill: VIOLET, duration: 0.25 }, at(2));
      t.to(
        "#mail-envelope-0",
        {
          x: SLOT_X[0] - START_X[0],
          y: SLOT_Y - START_Y,
          duration: at(2, 0.85) - at(2),
          ease: "power2.inOut",
        },
        at(2),
      );
      const lift = at(2, 0.38);
      const crossing = at(2, 1.12);
      t.to(
        "#mail-envelope-2",
        { y: FLY_Y - START_Y, duration: lift - at(2), ease: "power2.out" },
        at(2),
      );
      t.to(
        "#mail-envelope-2",
        { x: SLOT_X[1] - START_X[2], duration: crossing - lift, ease: "power2.inOut" },
        lift,
      );
      t.to(
        "#mail-envelope-2",
        { y: SLOT_Y - START_Y, duration: at(2, 1.92) - crossing, ease: "power2.inOut" },
        crossing,
      );
      show("#mail-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="mail-sorting">
        {[
          { x: 100, label: CITY },
          { x: 1060, label: "" },
        ].map(({ x, label }) => (
          <g key={x} transform={`translate(${x} ${BOX_Y})`}>
            <rect width={BOX_W} height={BOX_H} rx={28} fill={LINE} stroke={GRAY} strokeWidth={6} />
            <rect x={22} y={22} width={BOX_W - 44} height={192} rx={16} fill="#fff" />
            <path d={`M 22 214 H ${BOX_W - 22}`} stroke={GRAY} strokeWidth={4} />
            {label ? (
              <g transform={`translate(${BOX_W / 2} 279)`}>
                <rect x={-120} y={-48} width={240} height={96} rx={18} fill={VIOLET} />
                <Text x={0} y={22} size={60} fill="#fff">
                  {label}
                </Text>
              </g>
            ) : null}
          </g>
        ))}
        {ADDRESSES.map((address, index) => (
          <g key={address} id={`mail-envelope-${index}`}>
            <g transform={`translate(${START_X[index]} ${START_Y})`}>
              <rect
                x={-ENVELOPE_W / 2}
                y={-ENVELOPE_H / 2}
                width={ENVELOPE_W}
                height={ENVELOPE_H}
                rx={14}
                fill="#fff"
                stroke={GRAY}
                strokeWidth={5}
              />
              <path
                d="M -126 -68 L -20 -8 Q 0 4 20 -8 L 126 -68"
                fill="none"
                stroke={LINE}
                strokeWidth={5}
              />
              <g className="mail-address" opacity={0}>
                <rect x={-128} y={8} width={256} height={64} rx={10} fill={LINE} />
                <Text x={0} y={56} size={40} fill={BLUE}>
                  {address.startsWith(CITY) ? (
                    <>
                      <tspan className="mail-selected">{CITY}</tspan>
                      {address.slice(CITY.length)}
                    </>
                  ) : (
                    address
                  )}
                </Text>
              </g>
            </g>
          </g>
        ))}
      </g>
      <CodeCallout id="mail-code" x={960} y={852} text={CODE} />
    </Stage>
  );
}

import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GRAY, INK, LINE, PINK, RED, Stage, stageMotion, Tag } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const OUTPUT = "出てくるもの: 飲み物";
const TYPE = "): number";
export const vendingOutputText = OUTPUT + TYPE;

export function VendingOutput({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["vending-output"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#output-machine", at(0));
      show("#output-label", at(1));
      t.to("#output-button", { fill: PINK, duration: at(2, 0.22) - at(2) }, at(2));
      const drop = at(2, 0.42);
      show("#output-can", drop, {
        duration: at(2, 1.18) - drop,
        ease: "power2.in",
      });
      t.fromTo(
        "#output-can-drop",
        { y: -220 },
        { y: 0, duration: at(2, 1.18) - drop, ease: "power2.in" },
        drop,
      );
      t.to("#output-button", { fill: LINE, duration: at(2, 1.6) - at(2, 1.18) }, at(2, 1.18));
      show("#output-type", at(3));
      emphasize("output-type", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <defs>
        <clipPath id="output-tray-clip">
          <rect x={643} y={565} width={460} height={245} rx={24} />
        </clipPath>
      </defs>
      <g id="output-machine">
        <rect x={594} y={141} width={558} height={725} rx={38} fill={BLUE} />
        <rect x={643} y={190} width={460} height={248} rx={24} fill="#EFF6FF" />
        <path d="M 674 392 H 1072" stroke={LINE} strokeWidth={12} strokeLinecap="round" />
        {[
          { x: 733, fill: RED },
          { x: 873, fill: "#F59E0B" },
          { x: 1013, fill: "#4D9F3C" },
        ].map(({ x, fill }) => (
          <g key={x}>
            <rect x={x - 33} y={244} width={66} height={141} rx={16} fill={fill} />
            <ellipse cx={x} cy={249} rx={30} ry={8} fill={LINE} />
            <rect x={x - 33} y={296} width={66} height={42} fill="#fff" opacity={0.75} />
          </g>
        ))}
        <circle cx={1073} cy={479} r={30} fill={INK} />
        <circle id="output-button" cx={1073} cy={479} r={22} fill={LINE} />
        <rect x={643} y={565} width={460} height={245} rx={24} fill={INK} />
        <rect x={660} y={780} width={426} height={11} rx={5} fill={GRAY} />
      </g>
      <Tag id="output-label" x={823} y={520} text={OUTPUT} chars={10} />
      <g clipPath="url(#output-tray-clip)">
        <g id="output-can-drop">
          <g id="output-can" opacity={0}>
            <rect x={831} y={623} width={84} height={129} rx={18} fill={RED} />
            <ellipse cx={873} cy={629} rx={38} ry={10} fill={LINE} />
            <rect x={831} y={665} width={84} height={47} fill="#fff" opacity={0.75} />
          </g>
        </g>
      </g>
      <Callout id="output-type" x={1411} y={520} text={TYPE} />
    </Stage>
  );
}

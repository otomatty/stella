import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, CodeCallout, GREEN, RED, Stage, stageMotion } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const FRUIT = "りんご";
const TYPE = `"${FRUIT}"`;
const DECLARATION = `const FRUIT = ${TYPE}`;
export const labelMakerText = `${FRUIT}${DECLARATION}${TYPE}`;

export function LabelMaker({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["label-maker"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#label-shelf", at(0));
      t.to("#label-lid", { rotation: -14, svgOrigin: "425 478", duration: 0.48 }, at(1));
      show("#label-apple", at(1, 0.16));
      t.fromTo("#label-drop", { y: -84 }, { y: 0, duration: 0.52, ease: "power3.out" }, at(2));
      show("#label-fruit", at(2), { duration: 0.52 });
      show("#label-declaration, #label-type", at(3));
      emphasize("label-type", at(3, 0.4));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="label-shelf">
        <path
          d="M 306 742 H 1002 V 786 H 306 Z M 350 786 H 397 V 860 H 350 Z M 911 786 H 958 V 860 H 911 Z"
          fill="#865634"
        />
        <path d="M 425 478 H 877 V 722 H 425 Z" fill="#865634" />
        <g id="label-apple" opacity={0}>
          <path
            d="M 660 448 C 616 411 567 438 577 492 C 585 538 626 555 660 535 C 691 555 731 539 741 493 C 752 438 705 410 660 448 Z"
            fill={RED}
          />
          <path
            d="M 660 449 Q 651 425 669 404"
            fill="none"
            stroke="#865634"
            strokeWidth={9}
            strokeLinecap="round"
          />
          <path d="M 667 425 Q 675 391 714 397 Q 706 429 667 425 Z" fill={GREEN} />
        </g>
        <rect x={425} y={518} width={452} height={224} rx={12} fill="#B88754" />
        <path d="M 425 526 H 877" stroke="#865634" strokeWidth={8} />
        <path
          id="label-lid"
          d="M 425 478 H 860 Q 877 478 877 492 V 519 H 425 Z"
          fill="#D6AA79"
          stroke="#865634"
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <g id="label-drop">
          <Callout id="label-fruit" x={651} y={628} text={FRUIT} />
        </g>
      </g>
      <CodeCallout id="label-declaration" x={1320} y={520} text={DECLARATION} />
      <CodeCallout id="label-type" x={1320} y={650} text={TYPE} />
    </Stage>
  );
}

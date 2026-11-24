import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, GREEN, LINE, Stage, stageMotion, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const FILES = ["sea.jpg", "memo.txt", "hill.jpg"];
const CODE = '"sea.jpg".endsWith(".jpg") → true';
export const fileIconsText = `${FILES.join("")}${CODE}`;

export function FileIcons({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["file-icons"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#files-folder", at(0));
      show("#files-contents", at(1));
      show(".files-photo", at(2));
      t.to(
        ".files-matching",
        { stroke: VIOLET, attr: { "stroke-width": 8 }, duration: 0.3 },
        at(2),
      );
      show("#files-code", at(3));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="files-folder">
        <path
          d="M 363 695 Q 331 695 331 663 V 225 Q 331 192 364 192 H 625 L 706 263 H 1556 Q 1589 263 1589 296 V 662 Q 1589 695 1556 695 Z"
          fill={LINE}
          stroke={GRAY}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <rect x={334} y={305} width={1252} height={387} rx={26} fill="#fff" />
        <path d="M 355 305 H 1565" stroke={GRAY} strokeWidth={4} />
        <g id="files-contents" opacity={0}>
          {FILES.map((file, index) => {
            const photo = file.endsWith(".jpg");
            const x = 610 + index * 350;
            return (
              <g key={file} transform={`translate(${x} 374)`}>
                <path
                  className={photo ? "files-matching" : undefined}
                  d="M -68 0 H 22 L 68 46 V 174 H -68 Z M 22 0 V 46 H 68"
                  fill="#fff"
                  stroke={GRAY}
                  strokeWidth={5}
                  strokeLinejoin="round"
                />
                {photo ? (
                  <g className="files-photo" opacity={0}>
                    <rect
                      x={-38}
                      y={74}
                      width={76}
                      height={67}
                      rx={8}
                      fill={BLUE}
                      fillOpacity={0.14}
                      stroke={BLUE}
                      strokeWidth={3}
                    />
                    <circle cx={-17} cy={94} r={7} fill={BLUE} />
                    <path d="M -33 135 L -16 115 L -2 126 L 16 105 L 33 135 Z" fill={GREEN} />
                  </g>
                ) : (
                  <path
                    d="M -34 88 H 32 M -34 110 H 32 M -34 132 H 14"
                    stroke={GRAY}
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                )}
                <Text x={0} y={237} size={47}>
                  {file}
                </Text>
              </g>
            );
          })}
        </g>
      </g>
      <CodeCallout id="files-code" x={960} y={852} text={CODE} />
    </Stage>
  );
}

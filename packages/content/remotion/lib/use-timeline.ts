import gsap from "gsap";
import { type RefObject, useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export function useTimeline(
  root: RefObject<SVGSVGElement | null>,
  build: (timeline: gsap.core.Timeline) => void,
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const paused = gsap.timeline({ paused: true, defaults: { lazy: false } });
      timeline.current = paused;
      build(paused);
    }, root);
    return () => {
      context.revert();
      timeline.current = null;
    };
  }, [root, build]);

  useLayoutEffect(() => {
    timeline.current?.seek(frame / fps, false);
  });
}

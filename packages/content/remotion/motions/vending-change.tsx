import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useCallback, useMemo, useRef } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { VIDEO_COLORS, VIDEO_FONT as FONT } from "../../src/scene-overlays";
import { beatClock } from "../lib/beat-clock";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

gsap.registerPlugin(MotionPathPlugin);

const { ink: INK, blue: BLUE, pink: PINK, violet: VIOLET } = VIDEO_COLORS;
const IN = { duration: 0.4, ease: "power3.out" } as const;
const callouts = ["受け取る", "処理する", "返す"] as const;
export const vendingText = `${callouts.join("")}円0123456789−`;

/** 飲み物 1 本 (缶かペットボトル)。色は自然な色にする。 */
function Drink({
  x,
  y,
  color,
  label,
  bottle,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
  bottle?: boolean;
}) {
  return bottle ? (
    <g transform={`translate(${x} ${y})`}>
      <rect x={22} y={0} width={20} height={14} rx={4} fill="#64748B" />
      <path d="M20 14h24l8 22v62a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10V36z" fill={color} />
      <rect x={12} y={52} width={40} height={30} fill={label} />
      <rect x={18} y={24} width={6} height={70} rx={3} fill="#fff" opacity={0.35} />
    </g>
  ) : (
    <g transform={`translate(${x} ${y})`}>
      <rect x={6} y={8} width={52} height={100} rx={12} fill={color} />
      <ellipse cx={32} cy={10} rx={24} ry={7} fill="#CBD5E1" />
      <rect x={6} y={44} width={52} height={30} fill={label} />
      <rect x={13} y={18} width={6} height={82} rx={3} fill="#fff" opacity={0.35} />
    </g>
  );
}

/** 硬貨。外側の g を動かし、内側の g (face) を回す・裏返す。 */
function Coin({
  id,
  x,
  y,
  r,
  fill,
  edge,
  text,
  ink,
  hole,
}: {
  id: string;
  x: number;
  y: number;
  r: number;
  fill: string;
  edge: string;
  text: string;
  ink: string;
  hole?: boolean;
}) {
  return (
    <g id={id} transform={`translate(${x} ${y})`}>
      <g id={`${id}-face`}>
        <circle r={r} fill={fill} stroke={edge} strokeWidth={r * 0.1} />
        <circle r={r * 0.78} fill="none" stroke={edge} strokeWidth={r * 0.04} opacity={0.7} />
        <path
          d={`M ${-r * 0.55} ${-r * 0.45} A ${r * 0.72} ${r * 0.72} 0 0 1 ${r * 0.1} ${-r * 0.71}`}
          fill="none"
          stroke="#fff"
          strokeWidth={r * 0.09}
          strokeLinecap="round"
          opacity={0.7}
        />
        {hole ? <circle r={r * 0.2} fill="#fff" stroke={edge} strokeWidth={r * 0.06} /> : null}
        <text
          y={hole ? r * 0.72 : r * 0.24}
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={700}
          fontSize={hole ? r * 0.42 : r * 0.62}
          fill={ink}
        >
          {text}
        </text>
      </g>
    </g>
  );
}

/** 注目させる札 (白地にピンクの枠)。 */
function Callout({ id, x, y, text }: { id: string; x: number; y: number; text: string }) {
  const w = text.length * 44 + 56;
  return (
    <g id={id} transform={`translate(${x} ${y})`}>
      <rect
        id={`${id}-box`}
        x={-w / 2}
        y={-36}
        width={w}
        height={72}
        rx={16}
        fill="#fff"
        stroke={PINK}
        strokeWidth={4}
      />
      <text y={15} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={42} fill={INK}>
        {text}
      </text>
    </g>
  );
}

/** 値の札 (紫の地に白い文字)。 */
function Tag({
  id,
  x,
  y,
  text,
  chars,
}: {
  id: string;
  x: number;
  y: number;
  text: string;
  chars?: number;
}) {
  const w = (chars ?? text.length) * 30 + 44;
  return (
    <g id={id} transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-28} width={w} height={56} rx={14} fill={VIOLET} />
      <text
        y={13}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={700}
        fontSize={36}
        fill="#fff"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {text}
      </text>
    </g>
  );
}

const CHANGE = [
  { x: 1480, y: 836, r: 38, fill: "#D9DDE3", edge: "#9CA3AF", text: "100", ink: "#4B5563" },
  { x: 1572, y: 836, r: 38, fill: "#D9DDE3", edge: "#9CA3AF", text: "100", ink: "#4B5563" },
  { x: 1664, y: 836, r: 38, fill: "#D9DDE3", edge: "#9CA3AF", text: "100", ink: "#4B5563" },
  {
    x: 1480,
    y: 924,
    r: 34,
    fill: "#D9DDE3",
    edge: "#9CA3AF",
    text: "50",
    ink: "#4B5563",
    hole: true,
  },
  { x: 1562, y: 924, r: 32, fill: "#D29A5B", edge: "#A9743B", text: "10", ink: "#5B3A16" },
  { x: 1640, y: 924, r: 32, fill: "#D29A5B", edge: "#A9743B", text: "10", ink: "#5B3A16" },
  { x: 1718, y: 924, r: 32, fill: "#D29A5B", edge: "#A9743B", text: "10", ink: "#5B3A16" },
];

const FLOW_1 = "M 545 425 Q 690 150 905 60";
const FLOW_2 = "M 1155 48 Q 1520 90 1590 655";

export function VendingChange({ beats }: MotionProps) {
  const atBeat = useMemo(() => beatClock(beats, MOTIONS["vending-change"].seconds), [beats]);
  const countDownStart = atBeat(2, 2.2);
  const countUpStart = atBeat(3, 0.5);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const root = useRef<SVGSVGElement>(null);

  // 数が変わる表示は、時刻から直接計算する (どの時刻へ飛んでも同じ絵になる)。
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  } as const;
  const lcd = Math.round(interpolate(time, [countDownStart, atBeat(2, 3.1)], [500, 380], clamp));
  const paid =
    Math.round(interpolate(time, [countUpStart, atBeat(3, 1.7)], [0, 380], clamp) / 10) * 10;

  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const show = (sel: string, at: number, extra: gsap.TweenVars = {}) =>
        t.fromTo(
          sel,
          { opacity: 0, scale: 0.94, transformOrigin: "50% 50%" },
          { opacity: 1, scale: 1, ...IN, ...extra },
          at,
        );
      gsap.set(
        "#call-in, #call-work, #call-out, #tag-out, #lcd, #lcd-minus, #can, #btn-on, #pick, #glow, #ring, #dot, #shine, #out-0, #out-1, #out-2, #out-3, #out-4, #out-5, #out-6",
        { opacity: 0 },
      );

      // ずっと続く小さな動き: ランプが明滅する
      t.fromTo(
        "#led",
        { opacity: 0.35 },
        { opacity: 1, duration: 0.7, ease: "sine.inOut", repeat: 40, yoyo: true },
        atBeat(0),
      );

      // 1 文め: 自動販売機が下から出てきて、ガラスに光が走る
      t.fromTo(
        "#machine",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "1030 540" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        atBeat(0, -0.5),
      );
      t.fromTo(
        "#shadow",
        { opacity: 0, scaleX: 0.94, transformOrigin: "50% 50%" },
        { opacity: 0.08, scaleX: 1, duration: 0.7, ease: "power3.out" },
        atBeat(0, -0.5),
      );
      t.fromTo(
        "#shine",
        { x: -260, opacity: 0.55 },
        { x: 560, immediateRender: false, duration: 1.0, ease: "power1.inOut" },
        atBeat(0, 0.5),
      );
      t.set("#shine", { opacity: 0 }, atBeat(0, 1.5));

      // 2 文め: 500 円玉が現れ、回りながら入口へ飛ぶ (受け取る)
      t.fromTo(
        "#coin-in, #tag-in",
        { x: 300, opacity: 0, scale: 0.94, transformOrigin: "50% 50%" },
        { x: 430, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" },
        atBeat(1),
      );
      show("#call-in", atBeat(1, 0.3));
      t.to("#coin-in", { x: 1175, duration: 1.3, ease: "power1.inOut" }, atBeat(1, 1.0));
      t.to("#coin-in", { y: 490, duration: 0.65, ease: "power1.out" }, atBeat(1, 1.0));
      t.to("#coin-in", { y: 622, duration: 0.65, ease: "power1.in" }, atBeat(1, 1.65));
      t.to(
        "#coin-in-face",
        {
          scaleX: 0.12,
          duration: 0.2,
          ease: "sine.inOut",
          repeat: 5,
          yoyo: true,
          transformOrigin: "50% 50%",
        },
        atBeat(1, 1.05),
      );
      t.to("#tag-in", { opacity: 0, duration: 0.25 }, atBeat(1, 1.0));
      t.to(
        "#coin-in",
        { scale: 0.3, opacity: 0, duration: 0.25, ease: "power2.in", transformOrigin: "50% 50%" },
        atBeat(1, 2.25),
      );
      t.fromTo(
        "#ring",
        { attr: { r: 46 }, opacity: 0.9 },
        { attr: { r: 96 }, opacity: 0, immediateRender: false, duration: 0.7, ease: "power2.out" },
        atBeat(1, 2.4),
      );
      t.to("#lcd", { opacity: 1, duration: 0.2 }, atBeat(1, 2.5));

      // 3 文め: 画面が操作パネルへ寄り、120 円が引かれて飲み物が落ちる (処理する)
      show("#call-work", atBeat(2));
      t.to(
        "#world",
        {
          scale: 1.42,
          x: -70,
          y: -150,
          duration: 0.9,
          ease: "power2.inOut",
          svgOrigin: "1010 640",
        },
        atBeat(2, 0.2),
      );
      // 寄っている間、札は操作パネルの右へ動かす (絵に重ねない)
      t.to("#call-work", { x: 1570, y: 464, duration: 0.9, ease: "power2.inOut" }, atBeat(2, 0.2));
      // 戻るときは絵の上を横切らせず、いったん消して元の場所に出し直す
      t.to("#call-work", { opacity: 0, duration: 0.2 }, atBeat(2, 3.2));
      t.set("#call-work", { x: 1030, y: 48 }, atBeat(2, 3.45));
      t.fromTo(
        "#call-work",
        { opacity: 0, scale: 0.94 },
        { opacity: 1, scale: 1, immediateRender: false, ...IN },
        atBeat(2, 4.1),
      );
      t.to("#glow", { opacity: 1, duration: 0.3 }, atBeat(2, 0.6));
      t.to("#pick", { opacity: 1, duration: 0.25 }, atBeat(2, 0.6));
      t.to("#btn-on", { opacity: 1, duration: 0.2 }, atBeat(2, 0.8));
      t.to("#lcd-num", { x: -62, duration: 0.3, ease: "power2.out" }, atBeat(2, 1.0));
      t.fromTo(
        "#lcd-minus",
        { opacity: 0, x: 36 },
        { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" },
        atBeat(2, 1.05),
      );
      t.to("#lcd-minus", { opacity: 0, x: -30, duration: 0.5, ease: "power2.in" }, countDownStart);
      t.to("#lcd-num", { x: 0, duration: 0.5, ease: "power2.inOut" }, atBeat(2, 2.5));
      t.fromTo(
        "#can",
        { opacity: 1, y: 600, scale: 0.94, rotation: -14, transformOrigin: "50% 50%" },
        {
          y: 772,
          scale: 1,
          rotation: 0,
          immediateRender: false,
          duration: 0.55,
          ease: "power2.in",
        },
        atBeat(2, 1.7),
      );
      t.to("#world", { scale: 1, x: 0, y: 0, duration: 0.9, ease: "power2.inOut" }, atBeat(2, 3.3));
      t.to("#glow, #pick", { opacity: 0, duration: 0.3 }, atBeat(2, 3.3));

      // 4 文め: お釣りの硬貨が 1 枚ずつ回りながら出てくる (返す)
      show("#call-out", atBeat(3));
      CHANGE.forEach((c, i) => {
        const at = atBeat(3, 0.5 + i * 0.14);
        t.fromTo(
          `#out-${i}`,
          { x: 1214, y: 850, scale: 0.94, opacity: 0, transformOrigin: "50% 50%" },
          { x: c.x, y: c.y, scale: 1, opacity: 1, duration: 0.55, ease: "power3.out" },
          at,
        );
        t.fromTo(
          `#out-${i}-face`,
          { rotation: -300, transformOrigin: "50% 50%" },
          { rotation: 0, duration: 0.55, ease: "power3.out" },
          at,
        );
      });
      show("#tag-out", countUpStart);

      // 5 文め: 受け取る → 処理する → 返す を線でつなぎ、点が流れる
      const draw = (sel: string, at: number) =>
        t.fromTo(
          sel,
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" },
          at,
        );
      const emphasize = (id: string, at: number) =>
        t.to(`#${id}-box`, { attr: { "stroke-width": 9 }, duration: 0.2 }, at);
      emphasize("call-in", atBeat(4));
      draw("#flow-1, #flow-1-halo", atBeat(4, 0.2));
      t.set("#dot", { opacity: 1 }, atBeat(4, 0.2));
      t.to(
        "#dot",
        { motionPath: { path: FLOW_1 }, duration: 0.8, ease: "power2.inOut" },
        atBeat(4, 0.2),
      );
      t.to("#head-1", { opacity: 1, duration: 0.15 }, atBeat(4, 0.95));
      emphasize("call-work", atBeat(4, 1.0));
      draw("#flow-2, #flow-2-halo", atBeat(4, 1.2));
      t.to(
        "#dot",
        { motionPath: { path: FLOW_2 }, duration: 0.8, ease: "power2.inOut" },
        atBeat(4, 1.2),
      );
      t.to("#head-2", { opacity: 1, duration: 0.15 }, atBeat(4, 1.95));
      t.to("#dot", { opacity: 0, duration: 0.2 }, atBeat(4, 2.0));
      emphasize("call-out", atBeat(4, 2.0));
    },
    [atBeat, countDownStart, countUpStart],
  );
  useTimeline(root, build);

  return (
    <svg ref={root} viewBox="0 0 1920 1080" width={1920} height={1080} aria-hidden="true">
      <defs>
        <clipPath id="art-clip">
          <rect width={1920} height={960} />
        </clipPath>
        <clipPath id="tray-clip">
          <rect x={846} y={748} width={268} height={144} rx={12} />
        </clipPath>
        <clipPath id="window-clip">
          <rect x={800} y={188} width={440} height={336} rx={20} />
        </clipPath>
      </defs>

      <g clipPath="url(#art-clip)">
        {/* カメラで寄る範囲 */}
        <g id="world">
          <ellipse id="shadow" cx={1030} cy={944} rx={340} ry={14} fill={INK} opacity={0.08} />
          <g id="machine">
            <rect x={792} y={918} width={70} height={30} rx={6} fill="#1E3A8A" />
            <rect x={1198} y={918} width={70} height={30} rx={6} fill="#1E3A8A" />
            <rect x={760} y={96} width={540} height={838} rx={34} fill={BLUE} />
            <rect x={1262} y={130} width={18} height={780} rx={9} fill="#1D4ED8" />
            <rect x={800} y={124} width={440} height={44} rx={14} fill="#1D4ED8" />

            {/* 見本の飲み物 */}
            <rect x={800} y={188} width={440} height={336} rx={20} fill="#F1F5FF" />
            <rect x={800} y={340} width={440} height={10} fill="#C7D2FE" />
            <rect x={800} y={500} width={440} height={10} fill="#C7D2FE" />
            <Drink x={832} y={222} color="#F59E0B" label="#FDE68A" />
            <Drink x={938} y={222} color="#4D9F3C" label="#D9F2C7" bottle />
            <Drink x={1044} y={222} color="#6B3F26" label="#DC2626" />
            <Drink x={1150} y={222} color="#7DD3FC" label="#E0F2FE" bottle />
            <Drink x={832} y={382} color="#8B5E3C" label="#F3E3CF" />
            <Drink x={938} y={382} color="#FACC15" label="#FEF9C3" bottle />
            <Drink x={1044} y={382} color="#B91C1C" label="#FECACA" />
            <Drink x={1150} y={382} color="#D6B38A" label="#F8ECDD" bottle />
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={`a${i}`}
                x={842 + i * 106}
                y={336}
                width={44}
                height={16}
                rx={8}
                fill="#94A3B8"
              />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={`b${i}`}
                x={842 + i * 106}
                y={496}
                width={44}
                height={16}
                rx={8}
                fill="#94A3B8"
              />
            ))}
            <rect id="btn-on" x={842} y={336} width={44} height={16} rx={8} fill={PINK} />
            <rect
              id="pick"
              x={824}
              y={214}
              width={80}
              height={122}
              rx={16}
              fill="none"
              stroke={PINK}
              strokeWidth={5}
            />
            <g clipPath="url(#window-clip)">
              <path id="shine" d="M 800 524 L 880 188 L 960 188 L 880 524 Z" fill="#fff" />
            </g>

            {/* 操作パネル (表示と硬貨の入口) */}
            <rect x={800} y={548} width={440} height={150} rx={20} fill="#1E40AF" />
            <rect
              id="glow"
              x={822}
              y={568}
              width={266}
              height={110}
              rx={16}
              fill="none"
              stroke={PINK}
              strokeWidth={6}
            />
            <rect x={830} y={576} width={250} height={94} rx={12} fill={INK} />
            <circle id="led" cx={1110} cy={588} r={7} fill="#34D399" />
            <circle cx={1175} cy={622} r={46} fill="#C7D2FE" />
            <rect x={1167} y={592} width={16} height={60} rx={8} fill={INK} />
            <circle id="ring" cx={1175} cy={622} r={46} fill="none" stroke={PINK} strokeWidth={6} />
            <g id="lcd">
              <g id="lcd-num">
                <text
                  x={955}
                  y={642}
                  textAnchor="middle"
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={54}
                  fill={lcd === 380 ? "#FDE68A" : "#A7F3D0"}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {lcd}
                </text>
              </g>
              <text
                id="lcd-minus"
                x={1012}
                y={642}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={700}
                fontSize={46}
                fill="#FCA5A5"
              >
                − 120
              </text>
            </g>

            {/* 取り出し口とお釣りの口 */}
            <rect x={830} y={732} width={300} height={176} rx={20} fill="#0F172A" />
            <rect x={846} y={748} width={268} height={144} rx={12} fill="#1E293B" />
            <rect x={1166} y={792} width={96} height={116} rx={16} fill="#0F172A" />
            <rect x={1178} y={804} width={72} height={92} rx={10} fill="#1E293B" />
            <g clipPath="url(#tray-clip)">
              <g id="can" transform="translate(948 772)">
                <rect x={6} y={8} width={52} height={100} rx={12} fill="#F59E0B" />
                <ellipse cx={32} cy={10} rx={24} ry={7} fill="#CBD5E1" />
                <rect x={6} y={44} width={52} height={30} fill="#FDE68A" />
                <rect x={13} y={18} width={6} height={82} rx={3} fill="#fff" opacity={0.35} />
              </g>
            </g>
          </g>

          <Coin
            id="coin-in"
            x={430}
            y={610}
            r={62}
            fill="#E8CB73"
            edge="#C3A03D"
            text="500"
            ink="#7A5B12"
          />
          <Tag id="tag-in" x={430} y={724} text="500円" />

          {CHANGE.map((c, i) => (
            <Coin
              key={`${c.text}-${c.x}`}
              id={`out-${i}`}
              x={0}
              y={0}
              r={c.r}
              fill={c.fill}
              edge={c.edge}
              text={c.text}
              ink={c.ink}
              hole={c.hole}
            />
          ))}
          <Tag id="tag-out" x={1790} y={716} text={`${paid}円`} chars={4} />
        </g>

        {/* 流れの線は、絵より上に描く (白いふちを付けて、青い本体の上でも読めるようにする) */}
        <path
          id="flow-1-halo"
          d={FLOW_1}
          fill="none"
          stroke="#fff"
          strokeWidth={16}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
        />
        <path
          id="flow-2-halo"
          d={FLOW_2}
          fill="none"
          stroke="#fff"
          strokeWidth={16}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
        />
        <path
          id="flow-1"
          d={FLOW_1}
          fill="none"
          stroke={PINK}
          strokeWidth={7}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
        />
        <path
          id="flow-2"
          d={FLOW_2}
          fill="none"
          stroke={PINK}
          strokeWidth={7}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
        />
        <path
          id="head-1"
          d="M 908 58 l -34 -3 l 16 30 z"
          fill={PINK}
          stroke="#fff"
          strokeWidth={3}
          opacity={0}
        />
        <path
          id="head-2"
          d="M 1591 672 l -17 -30 l 34 -3 z"
          fill={PINK}
          stroke="#fff"
          strokeWidth={3}
          opacity={0}
        />
        <circle id="dot" r={15} fill={PINK} stroke="#fff" strokeWidth={5} />

        <Callout id="call-in" x={430} y={468} text={callouts[0]} />
        <Callout id="call-work" x={1030} y={48} text={callouts[1]} />
        <Callout id="call-out" x={1590} y={716} text={callouts[2]} />
      </g>
    </svg>
  );
}

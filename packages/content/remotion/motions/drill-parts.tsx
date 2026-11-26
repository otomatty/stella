import { useId } from "react";
import { BLUE, GREEN, INK, LINE, Mark, PINK, Text } from "../lib/kit";

/** 00章の紙のドリルで共用する道具。文字は各 motion のフォント一覧にも渡す。 */
const VIOLET = "#8330C7";

export const drillPartsText =
  "課題フォルダー問123ここに書く答え合わせ設定そのまま保存課題を確認する提出合格";
// 既存の呼び出し側の名前を保ち、道具の配色を青・紫にそろえる。
export const TEAL = BLUE;
export const CORAL = VIOLET;
export const GOLD = BLUE;
export const PURPLE = VIOLET;

export function DrillDefs() {
  // drill-rules の旧金属色参照も、呼び出し側を変えず単色で表示する。
  return (
    <style>{'[fill="url(#drill-metal)"] { fill: #DDDDE2; } .drill-tick > g { opacity: 1; }'}</style>
  );
}

export function Desk() {
  return (
    <g id="desk" opacity={0}>
      <path d="M140 900 H1780" stroke={LINE} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/** 原点は紙の左上。編集欄だけを別の id で動かす。 */
export function Paper({
  number = 1,
  ink,
  stamp,
  blank = false,
}: {
  number?: number;
  ink?: string;
  stamp?: string;
  blank?: boolean;
}) {
  return (
    <g>
      <rect width={280} height={360} rx={12} fill="#fff" stroke={LINE} strokeWidth={3} />
      {!blank && (
        <>
          <rect x={34} y={27} width={84} height={45} rx={7} fill={BLUE} />
          <Text x={76} y={59} size={29} fill="#fff">
            問{number}
          </Text>
          {[100, 122, 144].map((y) => (
            <path
              key={y}
              d={`M36 ${y} H${y === 144 ? 187 : 244}`}
              stroke={LINE}
              strokeWidth={7}
              strokeLinecap="round"
            />
          ))}
          <rect x={33} y={183} width={216} height={130} rx={9} fill="#F1F1F4" />
          <Text x={141} y={215} size={26} fill={BLUE}>
            ここに書く
          </Text>
          <path d="M52 251 H229 M52 287 H229" stroke={LINE} strokeWidth={2} />
          {ink && (
            <path
              id={ink}
              d="M53 244 q12 -18 20 0 t20 0 l14 -9 13 9 h79 M53 280 h31 l9 -12 12 12 h105"
              fill="none"
              stroke={BLUE}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
            />
          )}
          {stamp && (
            <g id={stamp} opacity={0} transform="translate(209 150) rotate(-14)">
              <circle r={45} fill={GREEN} />
              <Text x={0} y={10} size={28} fill="#fff">
                合格
              </Text>
            </g>
          )}
        </>
      )}
    </g>
  );
}

export function Pencil() {
  return (
    <g transform="rotate(32)">
      <rect x={-15} y={-208} width={30} height={168} fill="#E9B842" />
      <path d="M-15-40 L0 0 L15-40Z" fill="#EAC898" />
      <path d="M-5-14 L0 0 L5-14Z" fill={INK} />
      <path d="M-15-223 V-244 Q0-257 15-244 V-223Z" fill={PINK} />
      <rect x={-15} y={-223} width={30} height={23} rx={4} fill={LINE} />
    </g>
  );
}

export function Lock({ id }: { id: string }) {
  return (
    <g id={id} opacity={0}>
      <g id={`${id}-shackle`}>
        <path d="M-29 0 V-28 A29 29 0 0 1 29-28 V0 H17 V-28 A17 17 0 0 0-17-28 V0Z" fill={LINE} />
      </g>
      <rect x={-38} y={-4} width={76} height={65} rx={12} fill={BLUE} />
      <circle cy={25} r={8} fill={INK} />
      <path d="M-3 26 L-6 43 H6 L3 26Z" fill={INK} />
    </g>
  );
}

export function ProtectedSheet({
  kind,
  cover,
  lock,
  width = 280,
  height = 360,
}: {
  kind: "tests" | "config";
  cover?: string;
  lock?: string;
  width?: number;
  height?: number;
}) {
  const color = kind === "tests" ? BLUE : VIOLET;
  return (
    <g>
      <rect width={width} height={height} rx={12} fill="#fff" stroke={LINE} strokeWidth={3} />
      <rect x={27} y={28} width={width - 54} height={49} rx={6} fill={color} />
      <Text x={width / 2} y={62} size={29} fill="#fff">
        {kind === "tests" ? "答え合わせ" : "設定"}
      </Text>
      {kind === "tests" ? (
        [116, 169, 222].map((y) => (
          <g key={y}>
            <rect x={37} y={y} width={27} height={27} rx={4} fill="#F1F1F4" />
            <path
              d={`M42 ${y + 13} l7 7 12-15`}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={`M83 ${y + 9} H232 M83 ${y + 24} H196`}
              stroke={LINE}
              strokeWidth={5}
              strokeLinecap="round"
            />
          </g>
        ))
      ) : (
        <g transform={`translate(${width / 2} ${height / 2 + 1})`}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <rect
              key={angle}
              x={-16}
              y={-81}
              width={32}
              height={39}
              rx={5}
              transform={`rotate(${angle})`}
              fill={VIOLET}
            />
          ))}
          <circle r={62} fill={VIOLET} />
          <circle r={27} fill="#fff" />
        </g>
      )}
      {cover && (
        <g id={cover} opacity={0}>
          {/* 透明なつやの代わりに、保護する紙の下端へ帯を付ける。 */}
          <rect x={27} y={height - 74} width={width - 54} height={48} rx={6} fill="#F1F1F4" />
          <Text x={width / 2} y={height - 40} size={29} fill={color}>
            そのまま
          </Text>
        </g>
      )}
      {lock && (
        <g transform={`translate(${width - 58} ${height - 150})`}>
          <Lock id={lock} />
        </g>
      )}
    </g>
  );
}

export function Tray({ front = false }: { front?: boolean }) {
  return front ? (
    <g>
      <path d="M0 75 H100 Q140 103 180 75 H280 V140 H12 Q0 140 0 128Z" fill={BLUE} />
      <path d="M280 75 L310 25 V100 L280 140Z" fill="#1D4ED8" />
      <Text x={155} y={188} size={30} fill={BLUE}>
        保存
      </Text>
    </g>
  ) : (
    <g>
      <path d="M0 75 L30 15 H310 V100 L280 140 H0Z" fill={BLUE} />
      <path d="M48 25 H285 L255 85 H18Z" fill="#fff" stroke={LINE} strokeWidth={2} />
      <path d="M65 43 H248 M55 60 H209" stroke={LINE} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

export function Scanner({ lamp = "lamp", scan = "scan" }: { lamp?: string; scan?: string }) {
  return (
    <g>
      <rect x={36} y={354} width={54} height={39} rx={5} fill={INK} />
      <rect x={310} y={354} width={54} height={39} rx={5} fill={INK} />
      <rect width={400} height={365} rx={24} fill={VIOLET} />
      <rect x={25} y={111} width={350} height={180} rx={20} fill={INK} />
      <rect x={42} y={130} width={316} height={143} rx={13} fill="#F1F1F4" />
      <rect x={54} y={146} width={293} height={18} rx={9} fill={LINE} />
      <rect x={54} y={239} width={293} height={18} rx={9} fill={LINE} />
      <rect id={scan} x={54} y={170} width={290} height={9} rx={4} fill={BLUE} opacity={0} />
      <rect x={30} y={314} width={278} height={38} rx={8} fill="#fff" />
      <Text x={169} y={341} size={25} fill={VIOLET}>
        課題を確認する
      </Text>
      <circle cx={345} cy={333} r={23} fill={INK} />
      <circle id={lamp} cx={345} cy={333} r={16} fill={LINE} />
    </g>
  );
}

export function SubmitBox({ front = false }: { front?: boolean }) {
  return front ? (
    <g>
      <path d="M0 102 H280 V340 H12 Q0 340 0 328Z" fill={BLUE} />
      <path d="M280 102 L310 60 V304 L280 340Z" fill="#1D4ED8" />
      <rect x={54} y={171} width={173} height={92} rx={9} fill="#fff" />
      <Text x={140} y={232} size={42} fill={BLUE}>
        提出
      </Text>
    </g>
  ) : (
    <g>
      <path d="M0 102 L32 20 H310 V60 L280 102Z" fill={BLUE} />
      <path d="M44 66 H264 L255 82 H35Z" fill={INK} />
    </g>
  );
}

export function Tick({ x = 0, y = 0 }: { x?: number; y?: number }) {
  const id = useId();
  return (
    <g className="drill-tick">
      <Mark id={id} x={x} y={y} ok />
    </g>
  );
}

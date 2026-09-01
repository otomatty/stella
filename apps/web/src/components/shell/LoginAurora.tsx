/**
 * ログイン画面のアート面に敷くオーロラ (WebGL)。
 *
 * ドメインワープした fbm ノイズをブランド 3 色 (青 / マゼンタ / レッド) に乗せて描く。
 * CSS のグラデーションでは出せない「流れて混ざる」動きを面の主役として置くための層。
 *
 * ## 進行的強化
 * この 1 コンポーネントが「アート面の背景」を丸ごと持つ。 土台は CSS の光の玉
 * (`.login-art-aurora`) で、 WebGL が使えたときだけその上に canvas を重ねてクロスフェードする。
 * WebGL 非対応 / コンテキスト消失 / `prefers-reduced-motion` のいずれでも canvas は出ず、
 * 土台がそのまま見える — 「動かない環境で真っ黒の面が残る」ことが無い。
 * canvas が不透明に乗り切ったら土台は外す (見えない層を animate させ続けない)。
 *
 * ## 負荷
 * 1 画素あたり fbm を 5 回叩くので、 素直に描くと DPR 次第で塗りつぶし量が跳ねる。
 * - **描画解像度を長辺 640px に固定**して CSS 側で引き伸ばす (元がぼやけた絵なので拡大が効く。
 *   むしろ双線形補間がバンディングを崩してくれる)。
 * - **30fps 上限**。 動きは十数秒スケールなので 60fps に意味が無い。
 * - タブが隠れている / 面が 0 サイズ (md 未満は `display:none`) のときはループを止める。
 */

import { useEffect, useRef, useState } from "react";

/** 描画解像度の長辺。 これ以上は増やさず CSS で引き伸ばす。 */
const MAX_RENDER_EDGE = 640;
/** 1 フレームの最小間隔 (ms)。 30fps。 */
const FRAME_INTERVAL = 1000 / 30;
/** CSS 版から canvas へのクロスフェード時間 (ms)。 */
const FADE_MS = 700;

const VERTEX_SHADER = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;

// --- value noise -------------------------------------------------------
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// オクターブごとに回してから 2 倍にする。 回さないと格子が縞になって見える。
float fbm(vec2 p) {
  const mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // アスペクト補正のうえ縦を潰す。 帯が横に流れて「オーロラ」に見える向きになる。
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;
  p = p * vec2(1.5, 2.6) + u_seed;

  float t = u_time * 0.05;

  // ドメインワープ 2 段。 q が大きな流れ、 r がその上のうねり、 f が帯の濃淡。
  vec2 q = vec2(
    fbm(p + vec2(0.0, t)),
    fbm(p + vec2(5.2, 1.3) - t * 0.7)
  );
  vec2 r = vec2(
    fbm(p + 3.2 * q + vec2(1.7, 9.2) + t * 1.1),
    fbm(p + 3.2 * q + vec2(8.3, 2.8) - t * 0.8)
  );
  float f = fbm(p + 3.6 * r);

  vec3 ink     = vec3(0.078, 0.078, 0.094); // #141418 — 面の地の色
  vec3 blue    = vec3(0.039, 0.200, 1.000); // #0A33FF
  vec3 magenta = vec3(0.902, 0.184, 0.604); // #E62F9A
  vec3 red     = vec3(1.000, 0.180, 0.051); // #FF2E0D

  // 色相はブランドの並び (青 → マゼンタ → レッド) をうねりに沿って渡り歩かせる。
  vec3 hue = mix(blue, magenta, smoothstep(0.28, 0.82, q.y));
  hue = mix(hue, red, smoothstep(0.60, 1.00, r.y) * 0.75);

  // 帯。 ink に「足す」ことで、 光っていない所は地の色のまま暗く残る
  // (mix で塗ると面全体が色で覆われて夜空に見えなくなる)。
  // pow で裾を締めると、 明るい筋と暗い空のコントラストが立つ。
  float band = pow(smoothstep(0.42, 0.98, f * 1.45), 1.9);
  vec3 col = ink + hue * band * 1.15;

  // 尾根だけの芯。 帯の中に一段明るい線が走って流れの向きが読める。
  float core = pow(smoothstep(0.72, 1.02, f * 1.5), 3.0);
  col += core * (hue * 0.5 + vec3(0.30, 0.16, 0.28));

  // 縁の減光。 面の端が明るいと隣のログイン面との境が濁る。
  float vignette = smoothstep(1.30, 0.30, length((uv - 0.5) * vec2(1.10, 1.30)) * 1.55);
  col *= mix(0.28, 1.0, vignette);

  // 8bit 出力のバンディング崩し。 動く粒にすると縞が目に留まらない。
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.014;

  gl_FragColor = vec4(max(col, ink * 0.75), 1.0);
}
`;

/** シェーダを 1 本コンパイルする。 失敗したら null (呼び出し側が CSS 版へ倒す)。 */
const compile = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext): WebGLProgram | null => {
  const vert = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vert || !frag) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  // リンク後は個々のシェーダは要らない。
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

export const LoginAurora = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 実際に 1 枚描けてから見せる。 初期化に失敗した面が一瞬黒く出るのを防ぐ。
  const [ready, setReady] = useState(false);
  const [fallbackMounted, setFallbackMounted] = useState(true);

  useEffect(() => {
    // モーション低減時は canvas を立てない (下の CSS 版が静止画として出る)。
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      // 統合 GPU で回してもらう。 この絵に離散 GPU を起こす価値は無い。
      powerPreference: "low-power",
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    // 画面いっぱいの三角形 1 枚。 クリップ空間の外まで伸ばして 2 枚張りの継ぎ目を無くす。
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL の API であって React の Hook ではない
    gl.useProgram(program);
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uSeed = gl.getUniformLocation(program, "u_seed");
    // 開くたびに違う絵から始める。 同じ人が何度ログインしても同じ模様にならない。
    gl.uniform1f(uSeed, Math.random() * 100);

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        width = 0;
        height = 0;
        return;
      }
      // 長辺を MAX_RENDER_EDGE に固定して CSS 側で引き伸ばす。
      const scale = Math.min(1, MAX_RENDER_EDGE / Math.max(rect.width, rect.height));
      const next = {
        w: Math.max(1, Math.round(rect.width * scale)),
        h: Math.max(1, Math.round(rect.height * scale)),
      };
      if (next.w === width && next.h === height) return;
      width = next.w;
      height = next.h;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, width, height);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let raf = 0;
    let lastDraw = 0;
    let firstFrameDone = false;
    const start = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // 面が畳まれている (md 未満) あいだは描かない。
      if (width === 0 || height === 0) return;
      if (now - lastDraw < FRAME_INTERVAL) return;
      lastDraw = now;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!firstFrameDone) {
        firstFrameDone = true;
        setReady(true);
      }
    };

    // タブが隠れているあいだは RAF 自体が止まる (ブラウザの仕様) ので、
    // ここで見るのは「戻ってきたときに時計を飛ばさない」ため。
    const onVisibility = () => {
      lastDraw = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    // コンテキストを失ったら復帰は狙わず CSS 版へ倒す。 背景の飾りに再初期化は要らない。
    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      setReady(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      // ここで WEBGL_lose_context を叩かないこと。 canvas の DOM ノードは残るので、
      // 一度失わせると次に getContext しても死んだコンテキストが返り、 再マウント
      // (StrictMode の二度がけ / ログイン画面へ戻る導線) 以降ずっと描けなくなる。
    };
  }, []);

  // canvas が不透明に乗り切ってから土台を外す。 即座に外すと、 フェード中の
  // 半透明な canvas の下に地の色だけが覗いて一瞬暗くなる。
  useEffect(() => {
    if (!ready) {
      setFallbackMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setFallbackMounted(false), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <>
      {fallbackMounted && (
        <div className="login-art-aurora" aria-hidden="true">
          <span className="login-art-blob login-art-blob-1" />
          <span className="login-art-blob login-art-blob-2" />
          <span className="login-art-blob login-art-blob-3" />
        </div>
      )}
      {/* 中身も accessible name も持たない飾りの canvas なので支援技術には何も伝わらない
          (aria-hidden は canvas がフォーカス可能な要素として扱われるため付けない)。 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: ready ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-out` }}
      />
    </>
  );
};

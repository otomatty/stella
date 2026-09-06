/**
 * ログイン画面のアート面に敷く天の川 (WebGL)。
 *
 * 左下から右上へ抜ける帯を 1 本引き、 その中に星を濃く、 中心線には暗黒帯
 * (グレートリフト) を走らせる。 帯の芯は暖色 (積分された星の光)、 縁はブランドの
 * 青、 むらの濃い所にマゼンタが差す。
 *
 * ## 構図
 * 帯の角度と位置は定数 (`BAND_ROT` / `BAND_CENTER`) で固定してある。 文字は面の
 * 左半分に載るので、 帯はそこを避けて右上へ抜ける。 座標は面の**高さ**で正規化して
 * いるので、 面の縦横比が変わっても帯の角度と星の密度は動かない。
 *
 * ## 進行的強化
 * この 1 コンポーネントが「アート面の背景」を丸ごと持つ。 土台は CSS の夜空
 * (`.login-art-sky`) で、 WebGL が使えたときだけその上に canvas を重ねてクロス
 * フェードする。 WebGL 非対応 / コンテキスト消失 / `prefers-reduced-motion` の
 * いずれでも canvas は出ず、 土台がそのまま見える — 「動かない環境で真っ黒の面が
 * 残る」ことが無い。 canvas が不透明に乗り切ったら土台は外す (見えない層を
 * animate させ続けない)。
 *
 * ## 負荷
 * 1 画素あたり fbm 2 回 + 星セル 18 個。 オーロラ版 (fbm 5 回) の 1.15 倍ほど。
 * - **描画解像度は長辺 1024px** まで。 オーロラは 640px 固定で足りたが、 星は点なので
 *   引き伸ばすと滲んで「にじんだ染み」になる。 一般的な画面 (面の長辺 900px 前後) では
 *   等倍で描くことになり、 画素数はオーロラ版の 2 倍、 総量で 2.3 倍ほどになる。
 *   ログイン画面にしか出ない飾りなので、 星の解像感と引き換えに許容している。
 * - **30fps 上限**。 空の流れは数分スケールなので 60fps に意味が無い。
 * - タブが隠れている / 面が 0 サイズ (md 未満は `display:none`) のときはループを止める。
 * - `exp` と `sin` は星のセルごとに効いてくる (1 画素 18 回) ので、 にじみは
 *   有理式、 瞬きは三角波で作って超越関数を避けている。
 */

import { useEffect, useRef, useState } from "react";

/** 描画解像度の長辺。 これ以上は増やさず CSS で引き伸ばす。 */
const MAX_RENDER_EDGE = 1024;
/** 1 フレームの最小間隔 (ms)。 30fps。 */
const FRAME_INTERVAL = 1000 / 30;
/** CSS 版から canvas へのクロスフェード時間 (ms)。 */
const FADE_MS = 700;
/** モーション低減の指定。 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

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

const vec3 INK     = vec3(0.078, 0.078, 0.094); // #141418 — 面の地の色
const vec3 BLUE    = vec3(0.263, 0.220, 0.792); // #4338ca — night indigo
const vec3 MAGENTA = vec3(0.655, 0.545, 0.980); // #a78bfa — star violet
const vec3 WARM    = vec3(0.992, 0.827, 0.302); // #fcd34d — star gold
const vec3 COOL    = vec3(0.863, 0.902, 1.000); // 帯の芯。 積分された星の光の色

// --- hash --------------------------------------------------------------
// sin を使う定番の hash は引数が大きくなると GPU (とくにモバイル) の sin 精度が
// 落ちて格子が出る。 雲なら気づかないが、 星は点なので「星が等間隔に並ぶ」形で
// 目に見えてしまう。 乗算と fract だけで組んで、 ノイズにも星にも同じものを使う。
float hash21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  float a = hash21(p);
  return vec2(a, hash21(p + a + 1.7));
}

// --- value noise -------------------------------------------------------
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
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

// --- 帯 ----------------------------------------------------------------
// 帯を横倒しにする回転。 角度 0.95rad (≒ 54°) ぶん逆回しして、 帯の中心線を
// b.y = 0 に、 帯に沿う向きを b.x に持ってくる。 cos/sin は定数なので直に書く。
const mat2 BAND_ROT = mat2(0.5817, -0.8134, 0.8134, 0.5817);
/** 帯の中心が通る点。 文字が載る左半分を避けて右上寄りに置く。 */
const vec2 BAND_CENTER = vec2(0.14, 0.12);
/** 大きいほど帯が細い。 面は縦長 (幅の 1.2 倍ほど) なので、 横長の面より絞らないと
    帯が面いっぱいに広がって「靄」になる。 文字の位置に明るさが残らない値でもある。 */
const float BAND_TIGHTNESS = 60.0;

// --- 星 ----------------------------------------------------------------
// どちらも「1 セルにつき星は 1 つ、 閾値を超えたセルだけ」。 セルをまたぐにじみが
// あるので 3x3 の近傍を見る。 セルを持たない側は分岐で飛ばさず 0 を掛ける
// (隣り合う画素で分岐が割れると、 発散分岐に弱い GPU で目に見えて遅くなる)。
//
// 「内側 1 / 外側 0」の減衰は 1.0 - smoothstep(内, 外, d) と書く。 直感的な
// smoothstep(外, 内, d) は edge0 >= edge1 になり、 GLSL ES 仕様では結果が
// **未定義** — 手元のドライバで意図どおりに見えても、 別の GPU で星が消えたり
// 輪郭が反転したりしうる。 2 つの式は数学的には同値なので、 見た目は変わらない。

const float BRIGHT_SCALE = 15.0;
const float BRIGHT_THRESHOLD = 0.78;
const float BRIGHT_RADIUS = 0.045;

/** 面の全体に散る明るい星。 芯とにじみを持ち、 1 つずつ違う周期で瞬く。 */
float brightStars(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float v = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      float b = hash21(i + o);
      float live = step(BRIGHT_THRESHOLD, b);
      float mag = max(b - BRIGHT_THRESHOLD, 0.0) / (1.0 - BRIGHT_THRESHOLD);
      vec2 h = hash22(i + o + 3.1);
      float d = length(o + 0.2 + h * 0.6 - f);
      float r = BRIGHT_RADIUS * (0.55 + mag * mag * 1.6);
      // 瞬き。 sin ではなく三角波を滑らかにしたもの (1 画素 9 個ぶん効くので)。
      float ph = fract(t * (0.10 + h.x * 0.30) + h.y);
      float tri = abs(ph - 0.5) * 2.0;
      float tw = 1.0 - 0.45 * tri * tri * (3.0 - 2.0 * tri);
      float core = 1.0 - smoothstep(r * 0.15, r, d);
      // にじみ。 exp のかわりの有理式。 裾の形は違うが、 減光の見た目は変わらない。
      float halo = BRIGHT_RADIUS * BRIGHT_RADIUS * 0.9 / (BRIGHT_RADIUS * BRIGHT_RADIUS * 0.9 + d * d * 26.0);
      v += live * (core + halo * 0.30 * mag) * (0.30 + 0.70 * mag) * tw;
    }
  }
  return v;
}

const float DUST_SCALE = 52.0;
const float DUST_THRESHOLD = 0.62;
const float DUST_RADIUS = 0.16;

/** 帯を埋める細かい星。 数が多いので、 にじみも瞬きも持たせず点だけを描く。 */
float dustStars(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float v = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      float b = hash21(i + o + 19.0);
      float live = step(DUST_THRESHOLD, b);
      float mag = max(b - DUST_THRESHOLD, 0.0) / (1.0 - DUST_THRESHOLD);
      // 位置は明るさと同じ乱数から取り出す。 星の散らばりに使うぶんには相関が
      // 見分けられないので、 セルあたりの hash を 1 回で済ませる。
      vec2 h = fract(vec2(b * 137.13, b * 311.70));
      float d = length(o + 0.15 + h * 0.7 - f);
      float core = 1.0 - smoothstep(DUST_RADIUS * 0.2, DUST_RADIUS, d);
      v += live * core * (0.25 + 0.75 * mag);
    }
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  // 高さで正規化した中心座標。 面の縦横比が変わっても帯の角度と星の密度が動かない。
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  // 帯の「形」は止めたまま、 中身 (雲と星) だけを帯に沿って流す。 空全体が同じ
  // 速さで動くので「ゆっくり流れる夜空」に見える。 面の高さを渡り切るのに約 4 分。
  vec2 bs = BAND_ROT * (p - BAND_CENTER);
  vec2 bf = bs + vec2(u_time * 0.004, 0.0);

  float band = exp(-bs.y * bs.y * BAND_TIGHTNESS);

  // 帯のむら。 帯に沿って引き伸ばすと、 塊が流れの向きに並ぶ。 fbm の出力は 0.5 の
  // まわりに集まるので、 そのまま明るさにすると濃淡の付かない一様な靄になる。
  // smoothstep で中央を引き伸ばし、 濃い所と抜けている所の差を作る。
  float clump = smoothstep(0.32, 0.70, fbm(vec2(bf.x * 1.1, bf.y * 3.0) + u_seed));

  // 暗黒帯 (グレートリフト)。 帯の中心付近だけ、 手前の塵が光も星も隠す。
  float rift = fbm(vec2(bf.x * 2.2, bf.y * 6.0) + u_seed * 1.7 + 11.0);
  float lane = smoothstep(0.44, 0.64, rift) * exp(-bs.y * bs.y * BAND_TIGHTNESS * 1.6);

  // 帯の光。 ink に「足す」ことで、 光っていない所は地の色のまま暗く残る
  // (mix で塗ると面全体が色で覆われて夜空に見えなくなる)。
  // 色は帯の縁から芯へ 青 → 白。 白へ渡す閾値を高めに取って、 帯の大半を
  // ブランドの青が占めるようにしてある (芯だけ白いと「星の集まり」に見える)。
  float glow = band * (0.14 + 1.15 * clump);
  vec3 hue = mix(BLUE * 0.90, COOL, smoothstep(0.15, 0.85, glow));
  hue = mix(hue, WARM, smoothstep(0.45, 0.95, clump) * 0.45);
  hue = mix(hue, MAGENTA, smoothstep(0.68, 1.00, clump) * 0.36);
  vec3 col = INK + hue * glow * 0.62;
  col = mix(col, INK, lane * 0.88);

  // 星。 細かい星は帯の中に寄せ、 明るい星は空全体に散らす。
  float bright = brightStars(bf * BRIGHT_SCALE + u_seed * 13.0, u_time);
  float dust = dustStars(bf * DUST_SCALE + u_seed * 29.0) * (0.12 + 0.88 * band);
  col += (bright * 1.10 + dust * 0.65) * vec3(0.94, 0.95, 1.00) * (1.0 - lane * 0.75);

  // 縁の減光。 面の端が明るいと隣のログイン面との境が濁る (星と同じく、 逆順の
  // smoothstep は使わない)。
  float vig = 1.0 - smoothstep(0.30, 1.30, length((uv - 0.5) * vec2(1.10, 1.30)) * 1.55);
  col *= mix(0.35, 1.0, vig);

  // 8bit 出力のバンディング崩し。 動く粒にすると縞が目に留まらない。
  col += (hash21(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.014;

  gl_FragColor = vec4(max(col, INK * 0.75), 1.0);
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

/**
 * `prefers-reduced-motion` を購読する。 マウント時に 1 度読むだけだと、 画面を開いた
 * まま OS 設定を変えた人に古い判断が残り続ける (動きを切ったのに canvas が回り続ける)。
 */
const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_MOTION_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    // 初回描画から購読までのあいだに変わっていることがあるので、 ここで読み直す。
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
};

export const LoginMilkyWay = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  // 実際に 1 枚描けてから見せる。 初期化に失敗した面が一瞬黒く出るのを防ぐ。
  const [ready, setReady] = useState(false);
  const [fallbackMounted, setFallbackMounted] = useState(true);

  useEffect(() => {
    // モーション低減時は canvas を立てない (下の CSS 版が静止画として出る)。
    // 設定を後から入れた場合はここへ戻ってくるので、 canvas を隠して土台へ返す。
    if (reducedMotion) {
      setReady(false);
      return;
    }

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
    // 開くたびに違う星の並びから始める。 帯の位置は構図なので動かさない。
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
      // 長辺を MAX_RENDER_EDGE に固定して CSS 側で引き伸ばす。 星を潰さないため
      // devicePixelRatio ではなく CSS 画素を上限にする (等倍を超えて描いても、
      // 星が 1 画素より小さくなるだけで解像感は上がらない)。
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
  }, [reducedMotion]);

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
        <div className="login-art-sky" aria-hidden="true">
          <span className="login-art-sky-band" />
          <span className="login-art-sky-stars login-art-sky-stars-dust" />
          <span className="login-art-sky-stars login-art-sky-stars-bright" />
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

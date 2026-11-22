"""標準入力の UTF-8 の文を Open JTalk で読み上げ、WAV を標準出力に書く。

pyopenjtalk-plus が提供する pyopenjtalk を使う。準備は bun run --filter=@stella/content video:tts:setup で行う。
"""

import io
import os
import sys
import wave


def main() -> None:
    speed = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
    text = sys.stdin.buffer.read().decode("utf-8").strip()
    if not text:
        sys.exit("読み上げる文がありません")

    # 辞書のダウンロードやネイティブライブラリの表示も WAV に混ぜない。
    # 終了時に遅れてフラッシュされる表示もあるので、fd 1 は標準エラーのままにする。
    with os.fdopen(os.dup(sys.stdout.fileno()), "wb") as output:
        os.dup2(sys.stderr.fileno(), sys.stdout.fileno())
        import numpy as np
        import pyopenjtalk

        samples, rate = pyopenjtalk.tts(text, speed=speed)
        # 合成結果が浮動小数点でも、16bit PCM の範囲に収めて書く。
        pcm = np.clip(np.asarray(samples), -32768, 32767).astype("<i2")
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(int(rate))
            w.writeframes(pcm.tobytes())
        output.write(buf.getvalue())


if __name__ == "__main__":
    main()

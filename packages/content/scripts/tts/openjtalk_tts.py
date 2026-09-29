"""標準入力の文を Open JTalk で読み上げ、WAV (48kHz / mono / 16bit) を標準出力に書く。

教材動画の PoC 用ローカル TTS (scripts/lib/tts.ts の openjtalk プロバイダ)。
鍵なしで本物の日本語音声を出して、同期・字幕・書き出しを確かめるためのもの。

  pip install pyopenjtalk-prebuilt "numpy<2"
  echo "こんにちは。" | python3 openjtalk_tts.py 1.1 > out.wav
"""

import io
import sys
import wave

import numpy as np
import pyopenjtalk


def main() -> None:
    speed = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
    text = sys.stdin.read().strip()
    if not text:
        sys.exit("empty text")
    samples, rate = pyopenjtalk.tts(text, speed=speed)
    pcm = np.clip(samples, -32768, 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(rate))
        w.writeframes(pcm.tobytes())
    sys.stdout.buffer.write(buf.getvalue())


if __name__ == "__main__":
    main()

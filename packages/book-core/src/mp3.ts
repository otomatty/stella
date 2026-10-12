// PCM(16ビット、モノラル)をMP3(64kbps)にする。検証S-3と同じライブラリ。
// 分割ごとにMP3にしてから、MP3のまま順につなぐ。1つの工程で章全体を変換すると、長い章でCPU時間の上限(5分)に近づくため。
// 分割の切れ目はもともと段落・文の切れ目で、そこに数十ミリ秒の無音が足されるだけになる。
import { Mp3Encoder } from "@breezystack/lamejs";

export const MP3_KBPS = 64;

export function pcmToMp3(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const aligned = pcm.byteOffset % 2 === 0 ? pcm : pcm.slice();
  const samples = new Int16Array(
    aligned.buffer,
    aligned.byteOffset,
    Math.floor(aligned.byteLength / 2),
  );
  const encoder = new Mp3Encoder(1, sampleRate, MP3_KBPS);
  const parts: Uint8Array[] = [];
  const block = 1152 * 20;
  for (let i = 0; i < samples.length; i += block) {
    const b = encoder.encodeBuffer(samples.subarray(i, i + block));
    if (b.length) parts.push(b);
  }
  const end = encoder.flush();
  if (end.length) parts.push(end);
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

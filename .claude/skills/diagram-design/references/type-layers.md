# Layer Stack

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**Best for:** OSI model, CSS cascade, context hierarchy, tech stack, abstraction layers, memory hierarchy。

## Layout conventions
- Horizontal bands stacked vertically。Each layer is a full-width rectangle (same x, same width)。4〜6層(ノード上限6)。
- Each row contains (left→right):
  1. **Index tag** on the far left(`L3`、`07` など) — eyebrow role(Figtree)。
  2. **Layer name** slightly right of center-left — node-name role(Noto Sans JP)。
  3. **Sublabel / note** on the far right — sublabel role(Geist Mono、muted)。
- Border between layers: rule の hairline。Outer silhouette は rule-solid。
- Fills: either alternating subtle shades(paper / paper-2)OR all paper with hairline dividers。Pick one and hold it。
- Direction indicator on the LEFT margin(外側): small up/down arrow + sublabel役のラベル(`abstraction ↑`、`packets ↓`)。
- accent は焦点となる層1つだけ(stroke + accent-tint の淡いfill)。

## Anti-patterns
- Layers that aren't actually hierarchical(別の図解タイプを使う)。
- Skipped numbering(L4を飛ばしてL3の次がL5、説明なし)。
- Every layer a different color — hierarchy invisible。
- Inconsistent layer heights without reason。

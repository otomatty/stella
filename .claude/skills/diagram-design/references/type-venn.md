# Venn / Set Overlap

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**Best for:** intersection of concepts/domains、shared attributes between categories、"where A meets B"。

## Layout conventions
- **2〜3個の円を優先する。** 4個以上は避ける(判読不能 — 表にする)。
- Circle stroke: rule-solid の1.5または2の hairline、色はセットごとに変える(ink、muted、soft)。
- Circle fill: very low-opacity tint — `rgba(14,14,16,0.04)` for ink set、`rgba(92,92,102,0.05)` for muted set。Tints compound naturally in overlap regions。
- Radii: equal when sets are comparable in size; proportional when sets are meaningfully different。Don't fake equal sizes for aesthetics。
- **Set labels** placed outside the circle、NEVER crossing the stroke。node-name role(Noto Sans JP)の集合名、optional sublabel role(Geist Mono)の補足。
- **Intersection labels** placed inside the overlap region、node-name role、centered。For small overlaps、use a leader line to a label in clear space。
- **accent** on the ONE focal intersection — the "sweet spot"。accentのstroke、または accent-tint(`rgba(230,47,154,0.08)`)のfill。
- Circle centers and radii divisible by 4。

## Anti-patterns
- Unlabeled regions — reader can't tell which set is which。
- Circles that don't overlap when overlap is the point。
- Equal-sized circles when sets are obviously different(dishonest)。
- accent on multiple overlap regions(焦点信号が死ぬ)。
- Labels sitting on top of circle strokes(illegible)。
- 4個以上の円を使う(2〜3個で足りるはず)。

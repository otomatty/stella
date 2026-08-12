# Nested Containment

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**Best for:** hierarchy through containment — scope boundaries、trust zones、folder nesting、blast radius。Outer = broader、inner = more specific。

## Layout conventions
- 2〜3個の角丸長方形(`rx=12`)を、一定の内側余白でネストする(階層上限3)。
- Each level labeled at the top-left in eyebrow role(Figtree)。Labels sit on a paper-colored mask rect over the ring's top border。
- Stroke hierarchy: outer rings は rule、progressing to muted、to ink、to accent at the innermost focal。
- Fills step up in opacity from outer to inner、innermost は accent-tint。

## Anti-patterns
- 階層3を超える(内側の情報が読めなくなる) — トピックを割る。
- Irregular padding between levels — unaligned nesting looks accidental。
- Content inside rings that isn't part of the hierarchy — use a sibling diagram。
- accent on multiple levels — hierarchy collapses。

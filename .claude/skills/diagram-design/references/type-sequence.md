# Sequence

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**Best for:** request/response flows、protocol exchanges、multi-actor interactions over time、API call traces、incident reconstructions。

## Layout conventions
- Actors as boxes in a horizontal row at the top。
- **Lifelines**: dashed vertical lines descending from each actor to the bottom。
- Messages: horizontal arrows between lifelines; time flows top→down。
- **Activation bar**: narrow rectangle(`w=8`、paper-2 fill、rule-solid stroke、線幅1.5)on a lifeline spanning the interval that actor holds control。Stack for nested calls。
- Self-messages: short U-shaped loop returning to the same lifeline; label right of the loop。
- Return messages: dashed line in the same color as the originating call。
- accent は主役となる成功レスポンスまたは見出しメッセージ1つ、多くても2つまで。

## Anti-patterns
- Message arrow pointing *upward*(時間が逆行する — 禁止)。
- Activation bars that never close。
- Labels sitting over another lifeline — shorten or shift y into a gap。
- Swimlane-style lanes instead of lifelines(別の図解タイプ)。

## Primitives
- **Lifeline**: rule-solid stroke、線幅1.5、`stroke-dasharray="4,4"` の縦線。
- **Activation bar**: 幅8のrect。paper-2 fill、rule-solid stroke、線幅1.5。

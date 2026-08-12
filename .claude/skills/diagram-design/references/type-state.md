# State Machine

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**Best for:** finite state logic — order status、auth state、connection lifecycle、form wizard、job queue status。

## Layout conventions
- States are rounded rectangles(`rx=12`)、node-name role(Noto Sans JP)でラベル。
- **Start**: filled ink dot(`r=8`)。**End**: ringed dot(outer `r=12` outline、inner filled `r=8`)。
- Transitions: curved arrows labeled in arrow-label role(Geist Mono)として `event [guard] / action`(不要な部分は省略)。
- Self-loops curve above the state。
- Orient along the dominant flow direction(left→right or top→down); rearrange before crossing transitions。
- accent は読者に気づかせたい状態1つだけ(典型的にはエラー状態、または完了状態)。

## Anti-patterns
- ノード6 / 矢印8(複雑度上限)を超える — 2つの状態機械に分けるサイン。
- "From any state" transitions drawn from every state — use a single annotation(`* → Error on timeout`)instead。
- Unlabeled transitions(何がこの遷移を引き起こすかが本質)。

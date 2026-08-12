# Tree / Hierarchy

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**Best for:** org charts、dependency trees、taxonomy、file trees、decision breakdowns、skill trees。

## Layout conventions
- Root at top、children fan out below(or root at left、children to right)。
- Nodes are small labeled rectangles(`rx=8`)、node-name role(Noto Sans JP)の名前 + optional sublabel role(Geist Mono)の補足。Width 120〜160、height 48〜56。
- **Connectors are orthogonal(elbow-style)、never diagonal。** Parent drops a short vertical line、then a horizontal bus connects siblings、then each child has a short vertical drop into its top edge。rule の線幅1.5 stroke。
- Leaf indicator: 細めのstroke、または異なるfill — OR let terminal position do the work。
- Max depth: 3(root + 2階層、複雑度上限の階層3に対応)。ノード総数はノード上限6に収める。
- accent は**1つ**のノードだけ(root OR critical leaf、両方には使わない)。
- Draw connectors before nodes。

## Anti-patterns
- 階層3を超える(illegible — split)。
- Nodes of wildly varying widths — pick 2 widths max。
- Diagonal connector lines。
- Skipped levels(parent connected to grandchild with no middle)。
- accent on root AND a leaf。

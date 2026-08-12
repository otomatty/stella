# Timeline

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**Best for:** release history、project milestones、incident timelines、roadmaps、changelog visualizations。

## Layout conventions
- Horizontal hairline baseline across the middle(rule-solid、stroke-width 2)。
- Tick marks at time boundaries(quarters、months、sprints)with date labels below in sublabel role(Geist Mono)。
- Events: small filled circles(`r=8`)on the baseline。Labels alternate above and below to prevent collision、connected to the circle with a hairline drop。
- Major milestones: accent circle(`r=12`)+ node-name role(Noto Sans JP、太字)label。
- Time scale must be honest: if intervals are non-equal、space the circles non-equally。Don't fake linear spacing for aesthetics。Break the axis visibly if a region is too dense。

## Anti-patterns
- Equal-spacing events that aren't equally spaced in time。
- Missing axis labels("what unit is this?")。
- Crowded labels without vertical offset — illegible。

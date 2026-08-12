# Flowchart

> 上流 cathrynlavery/diagram-design (MIT) を教材向けに改変。

**Best for:** decision logic, algorithms, user-facing branching flows ("Should I…?"), onboarding routing, support-triage trees。

## Layout conventions
- Shape carries type, not color:
  - **Oval** (`rx=20`) — start / end
  - **Rectangle** (`rx=8`) — step / action
  - **Diamond** — decision(3方向まで)
  - **Small filled ink dot** (`r=4`) — merge point where branches rejoin
- Flow runs top→down. From a diamond, conventional exits: Yes to the right, No below — but label every outgoing arrow regardless。
- accent は本線1本、または最も重要な1つの分岐にだけ使う。すべての分岐には使わない。
- If two arrows must cross, use a small arc jump on one so the crossing is readable。

## Anti-patterns
- Using fill color to signal node type (shape does that)。
- Decision diamond with 4+ exits — refactor into nested diamonds、またはトピックを割る。
- Unlabeled decision branches。

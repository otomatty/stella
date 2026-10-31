---
sourceRefs: [SRC-claude-code-sdk-permissions-20261031, SRC-claude-code-sdk-permission-rules-20261031, SRC-claude-docs-jailbreaks-20261031]
id: 7-1-3
title: 権限を絞る
takeaway: "エージェントが使えるツールと権限は、作業に要るものだけに絞ります。"
introduces: [最小権限, permissionMode, disallowedTools]
requires: [allowedTools, Agent SDK, プロンプトインジェクション]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 権限を絞る
<!-- ノート: 攻撃や間違いが起きても、被害を小さくする考え方です。 -->
---
# 読むだけのはずが
コードを読んで答えるだけのエージェントに、書き込みもコマンドも許していました。
<!-- ノート: 紛れ込んだ指示に従ったとき、できることが多いほど被害が大きくなります。 -->
---
# 要るものだけ
エージェントが使えるツールと権限は、作業に要るものだけに絞ります。
<!-- ノート: これを最小権限の考え方と呼びます。 -->
---
# 許可だけでは絞れない
```js
options: { allowedTools: ["Read", "Grep", "Glob"], permissionMode: "dontAsk" }
```
<!-- ノート: allowedTools は書いたツールを確認なしにするだけで、ほかのツールは消えません。dontAsk にすると、許可していない呼び出しは断られます。 -->
---
# 消す・使わない
- disallowedTools: ツールを定義ごと消す
- bypassPermissions: 確認を外すので、使うのは隔離した環境だけ
<!-- ノート: bypassPermissions では、allowedTools に書いていないツールも使えてしまいます。 -->
---
<!-- _class: summary -->
# まとめ
エージェントが使えるツールと権限は、作業に要るものだけに絞ります。
<!-- ノート: 秘密やネットワークも、同じ考え方で絞ります。 -->

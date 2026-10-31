---
sourceRefs: [SRC-claude-docs-prompting-20261031, SRC-anthropic-context-engineering-20261031]
id: 4-1-3
title: タグで区切る
takeaway: "指示・資料・例は、それぞれ XML のタグで包んで区切ります。"
introduces: [XML タグ]
requires: [指示, 例]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# タグで区切る
<!-- ノート: 種類の違う中身を、混ざらないように並べる方法です。 -->
---
# 資料が指示に見えた
手引きの本文に「次の手順で申請してください」とありました。Claude はそれを、自分への指示と取り違えました。
<!-- ノート: どこまでが指示で、どこからが資料かが分かりませんでした。 -->
---
# タグで包む
指示・資料・例は、それぞれ XML のタグで包んで区切ります。
<!-- ノート: タグの名前は中身が分かるものにし、プロンプトの間でそろえます。 -->
---
# 包み方
```js
const prompt = `<document>
${manual}
</document>
<instructions>手引きだけを根拠に答えてください</instructions>`;
```
<!-- ノート: 資料が複数あるときは、documents の中に document を並べるように入れ子にします。 -->
---
<!-- _class: summary -->
# まとめ
指示・資料・例は、それぞれ XML のタグで包んで区切ります。
<!-- ノート: 長い資料では、並べる順番も結果に効きます。 -->

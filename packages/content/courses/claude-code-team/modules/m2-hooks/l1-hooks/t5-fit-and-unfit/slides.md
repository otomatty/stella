---
id: 2-1-5
title: hookの型と置き分け
takeaway: "白黒の決まりはcommand hookに、文脈の判断はprompt/agent hookか指示・Skillに置き分けます"
introduces: [決まり, command hook]
requires: [hook, 指示, Skill, 判断, 止める]
header: "検証・hooks・MCP"
---

<!-- _class: lead -->

# 2-1-5
# hookの型と置き分け

検証・hooks・MCP — Module 2 / レッスン2-1

<!-- ノート: M2の締めです。hookの型と向き不向きを線引きします。 -->

---

## なぜ必要か

- hookは自動実行されるので、何でもhookにしたくなる
- 型を間違えると、誤って止めたり、形だけの検査になったりする

<!-- ノート: 強い道具ほど、使いどころの線引きが要ります。 -->

---

## 結論

**白黒の決まりはcommand hookに、文脈の判断はprompt/agent hookか指示・Skillに置き分けます**

- **command hook** — シェルコマンドなどで、条件に合うかを決定的に判定する型
- **prompt/agent hook** — 文脈の判断をLLMに任せる型(判定が揺れる・費用がかかる)
- 「良い設計か」のような問いは、指示・Skillの側が向きやすい

<!-- ノート: hookは機械的な検査だけではありません。型を選ぶことが線引きの中心です。 -->

---

## 最小の例

```text
command hook向き       整形されているか
                      危険な削除の形か

prompt/agent hookも可  この変更は意図どおりか
(ただし揺れ・費用あり)

指示・Skillに残す      この設計でよいか
                      この命名は分かりやすいか
```

<!-- ノート: 見分けの問いは「条件を文字で書き切れるか」です。書き切れないものは型を選ぶか、指示・Skillに残します。 -->

---

## 置き場の線引き

| 内容 | 置き先 |
| --- | --- |
| 白黒がつく検査・後始末 | command hook |
| 文脈の判断(揺れを許容できる) | prompt/agent hook |
| 文脈の判断(対話で進めたい) | 指示 / Skill |

<!-- ノート: 厳密に毎回同じ操作にしたい部分はスクリプト、破られては困る決まりの強制はhookとCIで重ねます。 -->

---

<!-- _class: summary -->

## まとめ

**白黒の決まりはcommand hookに、文脈の判断はprompt/agent hookか指示・Skillに置き分けます**

<!-- ノート: 結論の再掲だけです。白黒はcommand hook、灰色は型を選ぶか指示・Skill。これでhooksの本編はおしまいです。 -->

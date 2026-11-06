---
id: 4-2-1
title: トリガは保存に割り込む
takeaway: "トリガは、レコードの保存の前後に自動で割り込む Apex である"
introduces: [トリガ, before, after, Trigger.new]
requires: [Apex, レコード, DML, insert, update, オブジェクト, クラス, 項目]
header: "Salesforce開発入門"
---

<!-- _class: lead -->

# 4-2-1
# トリガは保存に割り込む

Salesforce開発入門 — Module 4 / レッスン4-2

<!-- ノート: レッスン4-2の始まりです。Salesforce案件で書くApexの多くはトリガなので、ここが実務の中心になります。 -->

---

## なぜ必要か

- 「商談を保存したら、必ず担当者を埋めておきたい」と頼まれる
- 画面から入る経路も、取り込みから入る経路もある

<!-- ノート: つかみ。入口が複数ある要件。どの入口にも効かせるには、保存そのものに割り込む必要がある。 -->

---

## 結論

**トリガは、レコードの保存の前後に自動で割り込む Apex である**

- **トリガ** — 保存のタイミングで自動的に呼ばれるコード
- **before** — 保存される直前。値を書き換えられる
- **after** — 保存された直後。ID が確定している

<!-- ノート: 結論を言い切る。呼び出す側は誰もいない。DMLが起きれば必ず動く、という点が普通のクラスと違う。 -->

---

## 最小のトリガ

```apex
trigger OpportunityTrigger on Opportunity (before insert) {
  for (Opportunity opp : Trigger.new) {
    if (opp.OwnerId == null) { opp.OwnerId = UserInfo.getUserId(); }
  }
}
```

- **Trigger.new** — これから保存されるレコードのリスト

<!-- ノート: 最小のコード。before insertなので、値を書き換えるだけで保存される。ここでupdateを呼ぶ必要はない、と強調する。 -->

---

## before と after の使い分け

| やりたいこと | 使う側 |
| --- | --- |
| 自分の項目を埋める | before |
| 子レコードを作る | after |

- before で自分の項目を直すときは、DML を呼ばない

<!-- ノート: 対比枠。before で update を呼ぶと同じトリガが再び走る。beforeは「保存される前の値を触っている」だけ、という感覚を渡す。 -->

---

<!-- _class: summary -->

## まとめ

**トリガは、レコードの保存の前後に自動で割り込む Apex である**

<!-- ノート: 結論の再掲だけ。Trigger.newがリストである理由が次に来る、と引いて締める。 -->

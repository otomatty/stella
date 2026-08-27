---
id: 7-2-3
title: 脅威を見つけるサービス
takeaway: "GuardDutyは脅威検出、Inspectorは脆弱性診断、Security Hubはその結果の一元管理を担う"
introduces: [GuardDuty, Inspector, Security Hub, 脅威検出, 脆弱性]
requires: [EC2, WAF, 機械学習]
header: "AWS Cloud Practitioner 入門"
---

<!-- _class: lead -->

# 7-2-3
# 脅威を見つけるサービス

AWS Cloud Practitioner 入門 — Module 7 / レッスン7-2

<!-- ノート: 検知系3兄弟を役割の1語で区別するトピックです。 -->

---

## なぜ必要か

- 防いでいても、侵入の兆候や設定の穴は生まれる
- 「怪しい動き」「攻められる前の弱点」「全体の見通し」は別の仕事
- 3つの係を名前で区別できれば、この分野は取れる

<!-- ノート: つかみ。警備員・健康診断・司令室、の3役を予告。 -->

---

## 結論

**GuardDutyは脅威検出、Inspectorは脆弱性診断、Security Hubはその結果の一元管理を担う**

- **脅威検出** = 攻撃や不正アクセスの兆候を見つけること
- **脆弱性** = 攻撃に使われうる弱点

<!-- ノート: 結論。1語対応: GuardDuty=見張る、Inspector=検診、Security Hub=集約。 -->

---

## 最小の例

| サービス | 一言 | 例え |
| --- | --- | --- |
| **GuardDuty** | 怪しい動きを検出(機械学習を活用) | 警備員 |
| **Inspector** | EC2などの弱点を診断 | 健康診断 |
| **Security Hub** | 各サービスの検出結果を集約 | 司令室 |

<!-- ノート: 例えの1語で固定する。名前は英単語の意味どおり(guard/inspect/hub)。 -->

---

## 試験での聞かれ方

- 「不正アクセスの兆候をログから自動検出」→ GuardDuty
- 「インスタンスの脆弱性を継続的にスキャン」→ Inspector
- 「セキュリティの状態を1画面に集約」→ Security Hub

<!-- ノート: 補強枠。動詞(検出・診断・集約)で選ぶ、を徹底。 -->

---

<!-- _class: summary -->

## まとめ

**GuardDutyは脅威検出、Inspectorは脆弱性診断、Security Hubはその結果の一元管理を担う**

<!-- ノート: 再掲のみ。次は「うちは基準を満たしてるの?」の証明の話、と口頭で引き。 -->

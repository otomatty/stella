---
id: 4-2-4
title: Global Acceleratorは経路を速くする
takeaway: "CloudFrontはHTTPのコンテンツ配信を速くし、Global AcceleratorはTCP/UDP全般を固定IPと最適経路で速くする"
introduces: [Global Accelerator]
requires: [CloudFront, エッジロケーション, キャッシュ, ELB, レイテンシー]
header: "AWS Cloud Practitioner 入門"
---

<!-- _class: lead -->

# 4-2-4
# Global Acceleratorは経路を速くする

AWS Cloud Practitioner 入門 — Module 4 / レッスン4-2

<!-- ノート: M4の締め。CloudFrontと必ず対で出る、もう1つの「速くする」サービスです。 -->

---

## なぜ必要か

- ゲームやIP電話が使うのは、HTTPではないTCP/UDPの通信
- 世界中のどこからでも、同じ固定IPアドレスで受けたいこともある
- CloudFrontはHTTPの配信サービスなので、この要件には届かない

<!-- ノート: つかみ。CloudFrontの守備範囲はHTTP/HTTPSです。その外側の要件がある、という穴を先に見せます。 -->

---

## 結論

**CloudFrontはHTTPのコンテンツ配信を速くし、Global AcceleratorはTCP/UDP全般を固定IPと最適経路で速くする**

- **Global Accelerator** = 利用者の通信を最寄りのエッジで受け、AWSの内部ネットワーク経由で目的地まで運ぶサービス
- 受け口は世界共通の固定IPで、障害時のリージョン切り替えも速い

<!-- ノート: 結論。混雑するインターネットを早めに降りて、AWSの高速道路に乗せ替えるイメージです。CloudFrontも動的コンテンツを速くしますが、扱えるのはHTTP/HTTPSだけ、という線引きが要点です。 -->

---

## 最小の例

| | CloudFront | Global Accelerator |
| --- | --- | --- |
| 扱う通信 | HTTP/HTTPS(静的も動的も) | TCP/UDP全般 |
| 速くする方法 | エッジからの配信とキャッシュ | 固定IPで受けて最適経路で運ぶ |
| 典型例 | Webサイト・動画配信 | オンラインゲーム、IP電話 |

<!-- ノート: どちらもエッジロケーションを入口に使います。CloudFrontは動的なHTTPも速くするので、「動的かどうか」ではなく「HTTPかどうか」で切ります。 -->

---

## 試験での聞かれ方

- 「Webコンテンツを世界中に低遅延で配信」→ CloudFront
- 「HTTP以外のTCP/UDP通信の性能を改善したい」→ Global Accelerator
- 「固定IPで受けたい」「リージョン障害で素早く切り替えたい」→ Global Accelerator

<!-- ノート: 補強枠。プロトコル(HTTPか否か)・固定IP・フェイルオーバーの3語が分かれ目です。 -->

---

<!-- _class: summary -->

## まとめ

**CloudFrontはHTTPのコンテンツ配信を速くし、Global AcceleratorはTCP/UDP全般を固定IPと最適経路で速くする**

<!-- ノート: 再掲のみ。明日はデータの置き場所、ストレージとデータベースです、と口頭で引き。 -->

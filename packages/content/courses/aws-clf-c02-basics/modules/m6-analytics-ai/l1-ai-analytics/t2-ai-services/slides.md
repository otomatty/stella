---
id: 6-1-2
title: 用途別AIサービス
takeaway: "画像はRekognition、文字起こしはTranscribe、読み上げはPolly、翻訳はTranslateと用途名で選ぶ"
introduces: [Rekognition, Transcribe, Polly, Translate]
requires: [機械学習, SageMaker]
header: "AWS Cloud Practitioner 入門"
---

<!-- _class: lead -->

# 6-1-2
# 用途別AIサービス

AWS Cloud Practitioner 入門 — Module 6 / レッスン6-1

<!-- ノート: AIサービス層の代表4つを「用途→名前」の対応で覚えるトピックです。 -->

---

## なぜ必要か

- AIサービス層には10を超えるサービスが並ぶ
- 全部の機能説明を読むより、「用途→名前」の対応表が速い
- 試験もその対応を選ばせるだけ

<!-- ノート: つかみ。ここは素直な暗記回。ただし覚え方に型がある、と宣言。 -->

---

## 結論

**画像はRekognition、文字起こしはTranscribe、読み上げはPolly、翻訳はTranslateと用途名で選ぶ**

- どれも機械学習の専門知識なしで、呼ぶだけで使える
- モデルを作る作業(SageMaker)は要らない

<!-- ノート: 結論。「呼ぶだけ」が層の判定。名前は次の表で。 -->

---

## 最小の例

| 用途 | サービス |
| --- | --- |
| 画像・動画の認識 | **Rekognition** |
| 音声 → 文字(文字起こし) | **Transcribe** |
| 文字 → 音声(読み上げ) | **Polly** |
| 翻訳 | **Translate** |

<!-- ノート: TranscribeとPollyは向きが逆の対。recognition=認識、という英単語の意味で覚える。 -->

---

## 覚え方のコツ

- 名前は英単語の意味そのまま(translate=翻訳する)
- 文章の意味の分析はComprehend、チャットボットはLex、文書の読み取りはTextract
- 出会ったら「用途の一言」に追記していけばよい

<!-- ノート: 補強枠。4つ以外は列挙だけ。全部を今日覚える必要はない。 -->

---

<!-- _class: summary -->

## まとめ

**画像はRekognition、文字起こしはTranscribe、読み上げはPolly、翻訳はTranslateと用途名で選ぶ**

<!-- ノート: 再掲のみ。次はためたデータを「調べる」道具、と口頭で引き。 -->

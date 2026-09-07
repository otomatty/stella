# @stella/content — TypeScript入門 教材

社内の未経験エンジニア向けTypeScript研修教材の正本です。ショート動画の講義用スライドと、LMS掲載用のドキュメント(Markdown)・演習で構成されています。ここで書いた教材が `falcon-informal` の LMS に配信されます。

教材は講座 (`courses/<slug>/`) 単位で、**モジュール / レッスン / トピック**の3層です。TypeScript 入門は全10モジュール(M0〜M9)/ 42レッスン / 162トピックです。新しい講座を足すのが既定の手順です。

## 執筆・編集するときは

| 読むもの | 内容 |
| --- | --- |
| [THEME_TO_COURSE.md](THEME_TO_COURSE.md) | 外部で見つけたテーマを教材にするかの判定と、教材要件(目標・範囲・規模・評価)の決め方 |
| [ADDING_COURSE.md](ADDING_COURSE.md) | 教材の導入手順。既存講座への追加と、新しい講座の足し方 |
| [CLAUDE.md](CLAUDE.md) | 作業指針。粒度の定義、語彙台帳、コマンド、絶対に守るルール |
| [STYLE_GUIDE.md](STYLE_GUIDE.md) | 執筆ルール。文体・コード例・図解・構成 |
| [courses/typescript-basics/CURRICULUM.md](courses/typescript-basics/CURRICULUM.md) | TypeScript 入門の全体構成 |
| [courses/typescript-basics/IMAGE_PLAN.md](courses/typescript-basics/IMAGE_PLAN.md) | TypeScript 入門の画像配置計画 |

新規トピックは `templates/topic-slides-template.md` の雛形から作成してください。図解の作図規約はリポジトリルートの `.claude/skills/diagram-design/` にあります。

## 原典について

本教材は [サバイバルTypeScript](https://typescriptbook.jp/)(CC BY-SA 4.0)を参考に、未経験者向けにカリキュラムを再設計したものです。教材本体にはクレジット表記を入れず、このREADMEに集約しています。

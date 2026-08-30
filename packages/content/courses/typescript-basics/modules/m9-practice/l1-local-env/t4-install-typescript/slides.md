---
id: 9-1-4
title: TypeScriptを入れる
takeaway: "TypeScriptは、プロジェクトごとにnpmで入れて使う"
introduces: [npx]
requires: [npm, ターミナル, TypeScript, Node.js]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 9-1-4
# TypeScriptを入れる

TypeScript入門 — Module 9 / レッスン9-1

<!-- ノート: Node.jsとエディターが揃いました。次は、このフォルダでTypeScriptを使えるようにします。 -->

---

## なぜ必要か

- PC全体に1つ入れるやり方もあるが、プロジェクトごとに版が違う
- 実務では「このフォルダ用」に入れるのが普通

<!-- ノート: つかみ。グローバルインストールは紹介しない。自習でも迷わないよう、プロジェクト単位だけを教える。 -->

---

## 結論

**TypeScriptは、プロジェクトごとにnpmで入れて使う**

<!-- ノート: 結論を先に言い切る。次のスライドで2コマンドを見せる。 -->

---

## 入れるコマンド

```bash
npm init -y
npm install --save-dev typescript
```

- 作業用フォルダで実行する
- `--save-dev` = 開発のときだけ使う部品として記録する

<!-- ノート: npm init -y は「このフォルダをプロジェクトにする」合図。WindowsのVS Codeでは先にCommand Promptを選ぶ。作られるファイル名の詳細はレッスン9-2。いまは手順として覚える。 -->
---

## 入れた道具の呼び方

- **`npx`** = このフォルダに入れたコマンドを実行する道具
- 次のトピックで、`npx tsc`を使う

<!-- ノート: 対比枠。グローバルに入れなくても、npx経由で呼べる、がポイント。 -->

---

<!-- _class: summary -->

## まとめ

**TypeScriptは、プロジェクトごとにnpmで入れて使う**

<!-- ノート: 結論の再掲だけ。次は変換して動かす、とナレーションで締める。 -->

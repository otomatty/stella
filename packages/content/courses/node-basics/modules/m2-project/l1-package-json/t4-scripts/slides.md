---
id: 2-1-4
title: npm scriptsで手順に名前を付ける
takeaway: "package.jsonのscriptsに書いた手順は、npm run 名前 で誰でも同じように実行できる"
introduces: [npm scripts]
requires: [package.json, npm, スクリプトファイル, プロジェクト]
header: "Node.js 入門"
---

<!-- _class: lead -->

# 2-1-4
# npm scriptsで手順に名前を付ける

Node.js 入門 — Module 2 / レッスン2-1

<!-- ノート: シェルスクリプトで学んだ「手順を残す」考え方の、プロジェクト版です。 -->

---

## なぜ必要か

- 起動コマンドが長く、毎回READMEを見に行っている
- 新しく入った人が、正しい手順を探すところから始めている

<!-- ノート: つかみ。手順が人の頭とチャットにしかない状態を問題として示します。 -->

---

## 結論

**package.jsonのscriptsに書いた手順は、npm run 名前 で誰でも同じように実行できる**

- **npm scripts** — `package.json` の `scripts` に書く、名前つきの実行手順

<!-- ノート: 結論を先に言い切ります。手順書がコードと同じ場所に置かれる価値を伝えます。 -->

---

## 長い手順に短い名前を付ける

```json
{
  "scripts": {
    "start": "node app.js",
    "check": "node --check app.js"
  }
}
```

```bash
npm run check     # 名前で呼ぶ
npm start         # start は run を省略できる
```

<!-- ノート: start と test だけは run を省略できます。それ以外は run が要ると添えます。 -->

---

<!-- _class: summary -->

## まとめ

**package.jsonのscriptsに書いた手順は、npm run 名前 で誰でも同じように実行できる**

<!-- ノート: 結論の再掲だけ。次は道具の入れ分けです。 -->

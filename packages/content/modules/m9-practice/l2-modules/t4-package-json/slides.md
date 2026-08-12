---
id: 9-2-4
title: package.json
takeaway: "package.jsonはプロジェクトの設計図。これがあれば環境を再現できる"
introduces: [package.json, dependencies]
requires: [npm, パッケージ, node_modules]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 9-2-4
# package.json

TypeScript入門研修 — Module 9 / レッスン9-2

<!-- ノート: レッスン9-2の最後です。プロジェクトの身分証明書にあたるファイルを扱います。 -->

---

## なぜ必要か

- チームで開発するとき、全員が同じパッケージを使う必要がある
- `node_modules`は巨大なので、そのまま配るわけにいかない

<!-- ノート: つかみ。9-2-3でnode_modulesはgit管理しないと話した。では他の人はどうやって同じ環境を作るのか、という素朴な疑問。 -->

---

## 結論

**`package.json`はプロジェクトの設計図。これがあれば環境を再現できる**

- 何を導入したかが記録されている
- `npm install` だけで、同じ環境が復元される

<!-- ノート: 結論を先に言い切る。実体を配るのではなく、リストを配る。install時に自動で書き込まれるので、手で書くことは少ない。 -->

---

## 中身

```json
{
  "name": "my-app",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

<!-- ノート: dependenciesは本番でも必要なもの、devDependenciesは開発中だけ必要なもの。9-1-3でtypescriptを --save-dev で入れたのは、変換が終われば本番では不要だから。scriptsに書いた名前は npm run build で実行できる。 -->

---

## 定番のトラブル対処

```bash
rm -rf node_modules
npm install
```

- 動かなくなったら、`node_modules`を消して入れ直す
- `package.json`があるので、いつでも復元できる

<!-- ノート: 対比枠。実務で本当によく使う手順。node_modulesは使い捨ててよいフォルダだと理解していると、恐れずに消せる。設計図さえあれば何度でも作り直せる。 -->

---

<!-- _class: summary -->

## まとめ

**`package.json`はプロジェクトの設計図。これがあれば環境を再現できる**

<!-- ノート: 結論の再掲だけ。レッスン9-2はここまで。次はTypeScript自体の設定ファイルに進むと予告して締める。 -->

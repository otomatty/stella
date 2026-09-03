---
id: 1-1-2
title: tsconfig.jsonが変換の設定を持つ
takeaway: "tsconfig.jsonは、どのファイルをどう変換し、どこまで厳しく検査するかを決める"
introduces: [tsconfig.json, strict]
requires: [コンパイル, tsc, TypeScript]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 1-1-2
# tsconfig.jsonが変換の設定を持つ

TypeScript 入門（サーバー） — Module 1 / レッスン1-1

<!-- ノート: 設定は最小限だけ扱います。全項目を説明しないことがこの回の設計です。 -->

---

## なぜ必要か

- 変換のたびに長いオプションを打つのは現実的でない
- チーム全員が同じ厳しさで検査していないと、意味が薄れる

<!-- ノート: つかみ。設定をファイルに置く理由は、package.json のときと同じです。 -->

---

## 結論

**tsconfig.jsonは、どのファイルをどう変換し、どこまで厳しく検査するかを決める**

- **tsconfig.json** — TypeScriptの設定ファイル
- **strict** — 検査を厳しくする設定。新規プロジェクトでは必ず有効にする

<!-- ノート: 結論を先に言い切ります。strict を切る選択肢を最初から持たせないのが方針です。 -->

---

## 最小の設定

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "es2022",
    "module": "node16",
    "outDir": "dist",
    "types": ["node"]
  }
}
```

- `outDir` は変換後のJavaScriptの置き場所、`types` は読み込む型定義

<!-- ノート: 4項目だけ扱います。他の項目は必要になったときに調べればよいと伝えます。 -->

---

<!-- _class: summary -->

## まとめ

**tsconfig.jsonは、どのファイルをどう変換し、どこまで厳しく検査するかを決める**

<!-- ノート: 結論の再掲だけ。次は Node.js の機能に型を付けます。 -->

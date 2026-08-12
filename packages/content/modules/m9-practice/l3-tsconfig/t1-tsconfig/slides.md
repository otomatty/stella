---
id: 9-3-1
title: tsconfig.jsonとは
takeaway: "tsconfig.jsonは、コンパイラーへの指示をまとめた設定ファイル"
introduces: [tsconfig.json]
requires: [tsc, コンパイラー, コンパイル, package.json]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 9-3-1
# tsconfig.jsonとは

TypeScript入門研修 — Module 9 / レッスン9-3

<!-- ノート: レッスン9-3はtsconfigです。これまで何度か「Module 9で扱う」と予告してきた設定の話を、ここで回収します。 -->

---

## なぜ必要か

- 9-1-5では`npx tsc index.ts`とファイル名を毎回指定していた
- 変換先や厳しさの設定も、コマンドに書くのは現実的でない

<!-- ノート: つかみ。ファイルが100個になったら指定しきれない。設定をファイルにまとめておけば、コマンドは tsc だけで済む。 -->

---

## 結論

**`tsconfig.json`は、コンパイラーへの指示をまとめた設定ファイル**

- プロジェクトの根元に置く
- `npx tsc --init` で雛形を作れる

<!-- ノート: 結論を先に言い切る。9-2-4のpackage.jsonがプロジェクトの設計図なら、こちらはコンパイラー専用の設定。役割が違うので両方置く。 -->

---

## 最小の設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "outDir": "./dist",
    "strict": true
  }
}
```

- これがあれば `npx tsc` だけで全ファイルが変換される

<!-- ノート: 実際の tsc --init はコメント付きで数十行出るが、有効なのは数個。中身の意味は次のトピック以降で扱う。いまは「ここに指示を書く」という位置づけだけ押さえる。 -->

---

## 3つのブロックでできている

![w:950](assets/tsconfig-structure.svg)

<!-- ノート: compilerOptionsが本体で、その中に個別の設定が並ぶ。他にincludeやexcludeで対象ファイルを絞る項目もある。現場のtsconfigは長いが、読むべきは数項目だけだと安心させる。 -->

---

<!-- _class: summary -->

## まとめ

**`tsconfig.json`は、コンパイラーへの指示をまとめた設定ファイル**

<!-- ノート: 結論の再掲だけ。では中の項目を1つずつ見ると予告して締める。 -->

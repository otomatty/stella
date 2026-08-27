---
id: 2-2-2
title: includesで含むか調べる
takeaway: "includesは、その文字列が含まれているかをtrueかfalseで返す"
introduces: [includes, startsWith]
requires: [メソッド, 文字列, 真偽値, const]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 2-2-2
# includesで含むか調べる

JavaScript入門研修 — Module 2 / レッスン2-2

<!-- ノート: 最初の具体的なメソッドです。戻りが真偽値である点が条件分岐の布石になります。 -->

---

## なぜ必要か

- 「件名に『緊急』が入っていたら目立たせたい」
- 「メールアドレスに@が入っているか確かめたい」
- 目視ではなく、コードで機械的に調べたい

<!-- ノート: つかみ。含む/含まないの判定は検索・チェックの基本部品です。 -->

---

## 結論

**includesは、その文字列が含まれているかをtrueかfalseで返す**

- `文字列.includes(探す文字列)` の形で使う
- 結果は真偽値。含めば `true`、含まなければ `false`

<!-- ノート: 結論。1-2-3の「判定の結果は真偽値」がメソッドでも同じ、とつなげます。 -->

---

## 最小のコード

```js
const subject = "【緊急】サーバー障害の報告";
console.log(subject.includes("緊急"));  // => true
console.log(subject.includes("完了"));  // => false
```

<!-- ノート: 大文字小文字や全角半角は区別される点に触れます(後のトピックの布石)。 -->

---

## 先頭だけ調べるstartsWith

```js
const fileName = "report_2026.txt";
console.log(fileName.startsWith("report"));  // => true
```

- **startsWith** は「その文字列で始まるか」を返す
- 「reportで始まるファイルだけ処理する」のような絞り込みに使う

<!-- ノート: 関連枠。仲間としてendsWith(で終わるか)も口頭で紹介します。 -->

---

<!-- _class: summary -->

## まとめ

**includesは、その文字列が含まれているかをtrueかfalseで返す**

<!-- ノート: 再掲のみ。「含むか」の次は「一部を取り出す」だと口頭で。 -->

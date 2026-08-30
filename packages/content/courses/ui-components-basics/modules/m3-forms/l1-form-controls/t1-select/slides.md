---
id: 3-1-1
title: selectは選択肢から選ばせる
takeaway: "selectは、optionで並べた選択肢から1つ選ばせる入力部品"
introduces: [select]
requires: [HTML骨格]
header: "UI部品入門"
---

<!-- _class: lead -->

# 3-1-1
# selectは選択肢から選ばせる

UI部品入門 — Module 3 / レッスン3-1

<!-- ノート: Module 3 はフォームです。まず、まだ扱っていない入力部品を骨格から見ていきます。 -->

---

## なぜ必要か

- 「部署」を自由入力にすると、表記ゆれで集計できない
- 選択肢が 10 個あると、ラジオボタンでは縦に長くなりすぎる

<!-- ノート: つかみ。入力させるか選ばせるかは、集計のしやすさで決まります。 -->

---

## 結論

**`select`は、`option`で並べた選択肢から1つ選ばせる入力部品**

- 選択肢は `option` を並べる
- `label` と結び付けて何を選ぶのかを示す

<!-- ノート: 結論。selectは畳まれているので、選択肢が多くても場所を取りません。 -->

---

## 最小のコード

```html
<label for="dept">部署</label>
<select id="dept" name="dept">
  <option value="dev">開発</option>
  <option value="sales">営業</option>
</select>
```

<!-- ノート: value は送信される値、間のテキストは画面に出る文字です。両方書きます。 -->

---

## 選択肢が多いときの整理

```html
<optgroup label="技術">
  <option value="dev">開発</option>
</optgroup>
```

- `optgroup` で見出しを付けて束ねられる
- 束ねた見出し自体は選べない

<!-- ノート: 関連情報の枠。選択肢が20を超えたら、グループに分けると探しやすくなります。 -->

---

<!-- _class: summary -->

## まとめ

**`select`は、`option`で並べた選択肢から1つ選ばせる入力部品**

<!-- ノート: 結論の再掲だけ。次は複数行の入力欄です。 -->

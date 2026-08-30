---
id: 4-2-2
title: commandでモーダルに開く
takeaway: 'command="show-modal"のボタンは、commandforで指すdialogをモーダルで開く'
introduces: [command, commandfor, モーダル]
requires: [ダイアログ]
header: "UI部品入門"
---

<!-- _class: lead -->

# 4-2-2
# commandでモーダルに開く

UI部品入門 — Module 4 / レッスン4-2

<!-- ノート: ダイアログの開き方です。ここでもJavaScriptは書きません。 -->

---

## なぜ必要か

- ダイアログを開くには、これまで JavaScript が必要だった
- たった 1 行のために、スクリプトを読み込むのは重い

<!-- ノート: つかみ。開くだけのためにJavaScriptを持ち込まずに済むようになりました。 -->

---

## 結論

**`command="show-modal"`のボタンは、`commandfor`で指す`dialog`をモーダルで開く**

- `command` … 何をするか
- `commandfor` … 相手の `id`
- **モーダル** = 背面を触れなくして前面に出す開き方

<!-- ノート: 結論。ポップオーバーの popovertarget と同じ形の、汎用版だと考えてください。 -->

---

## 最小のコード

```html
<button command="show-modal" commandfor="confirm">
  受講を取り消す
</button>

<dialog id="confirm">
  <p>この講座の受講を取り消しますか?</p>
</dialog>
```

<!-- ノート: ボタンの commandfor と dialog の id を一致させます。これで開きます。 -->

---

## commandの主な値

| 値 | 何が起きるか |
| --- | --- |
| `show-modal` | モーダルで開く |
| `close` | 閉じる |
| `toggle-popover` | ポップオーバーを開閉する |

<!-- ノート: 関連情報の枠。同じ書き方でポップオーバーも操作できます。 -->

---

<!-- _class: summary -->

## まとめ

**`command="show-modal"`のボタンは、`commandfor`で指す`dialog`をモーダルで開く**

<!-- ノート: 結論の再掲だけ。次は閉じ方です。 -->

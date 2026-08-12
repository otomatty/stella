**Input** — single-line text field, used across the contact form (お問い合わせ).

```jsx
<Input label="会社名" placeholder="株式会社サンプル" required />
<Input label="メールアドレス" type="email" hint="ご返信先のアドレス" />
<Input label="電話番号" error="数字で入力してください" />
```

Magenta focus ring, hairline border thickens on focus. `size`: sm · md · lg. Pass `leadingIcon` for search/email affordances. Pair labels in bold 13px.

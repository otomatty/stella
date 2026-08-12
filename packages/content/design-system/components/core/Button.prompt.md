**Button** — the primary call-to-action. Use `variant="primary"` for the signature gradient pill (the brand's hero action); reserve it for the single most important action on a view.

```jsx
<Button variant="primary" size="lg" leadingIcon={<ChatIcon/>}>お問い合わせはこちら</Button>
<Button variant="outline">資料ダウンロード</Button>
<Button variant="secondary" size="sm">詳しく見る</Button>
```

Variants: `primary` (gradient pill + glow), `secondary` (solid ink), `outline` (hairline), `ghost` (text-only). Sizes `sm | md | lg`. Set `pill={false}` for a 12px-radius rectangle. Don't place two primary gradient buttons side by side — pair gradient with outline/ghost.

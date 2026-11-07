# 解説

学習フォルダーで git init を行い、名前とメールをローカルに設定します。
学習フォルダー直下の .gitignore は次の3行です。

```text
node_modules/
**/.stella/last-run.json
**/.stella/dotnet/
```

その後、学習フォルダーで git add . と git commit を別々に実行します。
課題フォルダーには index.html だけを解答例として重ねます。
教材の検査は一時の学習フォルダーで Git の設定と記録を用意してから、同じランナーで照合します。

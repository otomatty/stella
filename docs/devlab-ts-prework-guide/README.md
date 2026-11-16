# TypeScript 事前課題の書き方ガイド

選考の事前課題に取り組む応募者向けのページです。
章ごとに、問題の説明を載せています。
初めて出てくる書き方とサンプルも載せています。
日本語の骨組みをヒントにできます。
解答例は載せません。

## フォルダーの中身

| パス | 内容 |
| --- | --- |
| `src/template.html` | ページの土台です。CSS、冒頭、01章の前提と q01、出典の欄があります。 |
| `src/fragments/frag-*.html` | 章と番号ごとの断片です。ハイライトを焼き込む前の HTML です。 |
| `scripts/build.py` | 全章の組み立てとハイライトを実行します。 |
| `scripts/assemble.py` | 本文、目次、出典、章のリンクを組み立てます。 |
| `scripts/bake.mjs` | コードと番号付きの部品図にハイライトを焼き込みます。 |
| `scripts/check_page.mjs` | HTML の構造と画面幅ごとのはみ出しを調べます。 |
| `pages/guide-01.html` 〜 `pages/guide-09.html` | 公開する完成済みのページです。Git で管理します。 |
| `WRITING_GUIDE.md` | 断片を書くときのルールです。 |
| `package.json`・`package-lock.json` | このフォルダー専用の実行手順と依存関係です。ワークスペースには含めません。 |

## 必要なもの

python3 と Node.js が必要です。
このフォルダーで依存関係をインストールします。

```bash
cd docs/devlab-ts-prework-guide
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
```

検査には Playwright の Chromium も使います。
実行ファイルを指定する場合は `PLAYWRIGHT_CHROMIUM_PATH` を使います。
指定しない場合は Playwright が管理する Chromium を使います。
必要なら `npx playwright install chromium` で用意します。
`node_modules/` はルートの `.gitignore` で除外しています。

## 直し方

1. `src/fragments/` の該当する断片を直します。
2. このフォルダーで `npm run build` を実行します。
3. `npm run check` を実行します。
4. `pages/` のページを claude.ai の Artifact に手作業で公開し直します。

この環境での検査コマンドは次のとおりです。

```bash
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run check
```

検査は全9ページを対象にします。
id の重複、内部リンク、タグの対応を調べます。
ハイライトの焼き込み漏れや script、解答例の語も調べます。
画面幅は 400、600、1000px で確かめます。
問題があれば終了コードが 1 になります。
一時ファイルはリポジトリの外に作り、検査後に削除します。

`pages/` は手で直しません。
新しい章や番号の断片を書くときは、先に [WRITING_GUIDE.md](WRITING_GUIDE.md) を読んでください。
章を追加するときは、組み立てと検査の章数、章のリンクの表も更新します。
課題の問題やテストを直したら、ガイドの該当する断片も直してください。
出典は `packages/content/stages/devlab-ts-prework/` の課題の README から読み取ります。

## 公開先

| 章 | 問題の数 | Artifact |
| --- | ---: | --- |
| 01章 | 170 | [01章のガイド](https://claude.ai/artifact/7ZJi5iYUv8931w41FMt4jy) |
| 02章 | 170 | [02章のガイド](https://claude.ai/artifact/4wjk432sjZaGyASSenuS8X) |
| 03章 | 170 | [03章のガイド](https://claude.ai/artifact/JGMp5nvpXxY3RPCKwWJwzS) |
| 04章 | 170 | [04章のガイド](https://claude.ai/artifact/Ad8VaUe4rDUu25FMyB56Ur) |
| 05章 | 212 | [05章のガイド](https://claude.ai/artifact/Nbk1traThMM7bKy3Q4pjtV) |
| 06章 | 12 | [06章のガイド](https://claude.ai/artifact/1uw2AmJc5nri6JL3HzPnVz) |
| 07章 | 170 | [07章のガイド](https://claude.ai/artifact/Vjo1wZMtdrH9UM4RzJerYH) |
| 08章 | 107 | [08章のガイド](https://claude.ai/artifact/Jx9b63d3U6exjjNcGr5GFi) |
| 09章 | 110 | [09章のガイド](https://claude.ai/artifact/NbwTkaPZFmUV8fBN13aucz) |

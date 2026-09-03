# レッスン2-1 プロジェクトとパッケージ

## このレッスンの目標

- [ ] `npm init` で `package.json` を作れる
- [ ] `npm install` でパッケージを追加し、何が変わるかを説明できる
- [ ] `npm scripts` に手順を書いて実行できる

## 2-1-1 package.jsonはプロジェクトの説明書

> **package.jsonは、そのプロジェクトの名前・使う道具・実行手順を書いたファイル**

誰かのプロジェクトを渡されたとき、何が必要でどう動かすのかが分からないと手が止まります。口頭やチャットで手順を伝えると必ず抜けが出ます。

- **npm** — Node.jsに付いてくる、道具(パッケージ)を集めて管理する仕組み
- **package.json** — npmが読む、プロジェクトの説明書

```bash
npm init -y
```

```json
{
  "name": "node-practice",
  "version": "1.0.0",
  "scripts": { "start": "node app.js" }
}
```

`-y` は質問をすべて既定値で答えるオプションです。中身はJSONという書き方で、レッスン0-1で見たオブジェクト(名前と値の組)と同じ形をしています。

このファイルの価値は、**人間もツールも同じ情報を読む** ことです。人は「何を使っているか」を読み、npmは「何を入れればよいか」を読みます。

## 2-1-2 npm installで道具を持ってくる

> **npm installは、必要なパッケージを取り寄せてnode_modulesに置く**

日付の整形やHTTP通信を毎回自分で書くのは無駄が多く、間違いも増えます。世界中で使われている部品を持ってきて使えます。

- **パッケージ** — 公開されている、再利用できるプログラムのかたまり
- **node_modules** — 取り寄せたパッケージが置かれるディレクトリ

```bash
npm install dayjs
```

実行すると、2か所が変わります。

```text
package.json   → dependencies に "dayjs" が追記される(依存関係)
node_modules/  → 実体がここに置かれる(コミットしない)
```

プロジェクトが使っているパッケージのことを **依存関係** と呼びます。何を使っているかは `package.json` を見れば分かります。

`node_modules` はGitにコミットしません。数万ファイルに膨れることがあり、しかも `package.json` があれば `npm install` でいつでも復元できるからです。**復元できるものは記録しない**、というのが基本の考え方です。

## 2-1-3 package-lock.jsonが版を固定する

> **package-lock.jsonは実際に入れた版を記録し、誰の環境でも同じ組み合わせを再現する**

同じプロジェクトなのに人によって動いたり動かなかったりする、少し前まで動いていたのに入れ直したら壊れた。こうした問題の原因は、自分のコードではなくパッケージの版であることがあります。

```text
package.json        "dayjs": "^1.11.0"   ← 希望(1.11以上ならよい)
package-lock.json   dayjs 1.11.13        ← 実績(実際に入れた版)
```

`package.json` に書かれているのは **希望** です。`^1.11.0` は「1.11.0以上で、大きな変更が入る前まで」という幅を持った指定なので、入れる時期によって実際の版が変わります。

**package-lock.json** は、実際に入った版をすべて記録した **実績** のファイルです。これがあると、`npm install` は記録どおりの組み合わせを再現します。

整理すると次のようになります。

- `package.json` — コミットする(希望を共有する)
- `package-lock.json` — **コミットする**(実績を共有し、再現できるようにする)
- `node_modules/` — コミットしない(復元できる)

lockファイルをコミットし忘れると、チーム内で版がばらつき、「自分の環境では動く」が起きます。

## 2-1-4 npm scriptsで手順に名前を付ける

> **package.jsonのscriptsに書いた手順は、npm run 名前 で誰でも同じように実行できる**

起動コマンドが長いと、毎回READMEを見に行くことになります。新しく入った人は、正しい手順を探すところから始めなければなりません。

```json
{
  "scripts": {
    "start": "node app.js",
    "check": "node --check app.js"
  }
}
```

```bash
npm run check     # 名前で呼ぶ
npm start         # start は run を省略できる
```

**npm scripts** は、`package.json` の `scripts` に書く名前つきの実行手順です。コマンドライン入門で学んだシェルスクリプトと同じ考え方で、**手順を人の頭ではなくファイルに残します**。違うのは、置き場所がプロジェクトの説明書の中だという点です。

`start` と `test` だけは `npm start` のように `run` を省略できます。それ以外は `npm run 名前` と書きます。

## 2-1-5 開発だけで使う道具は分けて入れる

> **本番でも要るものはdependencies、開発中だけ要るものはdevDependenciesに入れる**

テスト用や変換用の道具まで本番のサーバーに配ると、無駄に重くなります。また、どれが本番で必要な部品なのかが後から見分けられなくなります。

```bash
npm install dayjs          # dependencies へ(本番でも使う)
npm install -D typescript  # devDependencies へ(開発中だけ)
```

**devDependencies** は、開発中だけ使うパッケージを書く場所です。判断基準は1つで、**本番で動かすときに要るかどうか** です。

- 本番で動くコードが使う → `dependencies`
- テスト・型チェック・変換など、開発中だけ使う → `devDependencies`

本番環境に配るときは、開発用を除いて入れられます。

```bash
npm install --omit=dev     # 本番用に、開発用を除いて入れる
```

いまは書き方を覚えるより、**2つに分ける理由** を理解しておけば十分です。

## もっと知りたい人へ

- [npm Docs — package.json](https://docs.npmjs.com/cli/configuring-npm/package-json) — 各フィールドの公式リファレンス
- [npm Docs — npm install](https://docs.npmjs.com/cli/commands/npm-install) — インストールの挙動

---

演習は [practice.md](practice.md) にあります。

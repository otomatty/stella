# 情報源の選定と教材への参照元の記載

作成日 2026年10月4日  
版 2.2  
状態 設計案  
[全体設計へ戻る](00-overall-design.md)

教材は、公式ドキュメント、標準仕様、公的機関の資料、著者と版が確認できる書籍を根拠に制作する。すべての単元に参照元を載せ、解説、参考コード、図、演習の仕様のどこに使ったかを追えるようにする。教材パックの末尾に参考サイトをまとめるだけでは、記載要件を満たさない。

本書は、18教材パックで使う情報源の選定と、LXPでの表示・管理・公開条件を定める。LXPの実装は未確認であり、参照元の管理や公開制御を実装済みとは扱わない。以下の参照先は2026年10月4日に入口または該当ページを確認した選定案である。各サイトの全内容を通読したことや、転載条件を一括確認したことを意味しない。

## 1 情報源の役割

初学者には、その日の実装に必要な短い解説と、公式資料の読む箇所を渡す。仕様書の全読を課さず、学習が進むにつれて自分でAPIや根拠を探す練習を増やす。

| 役割 | 主に使う資料 | 教材での使い方 |
| --- | --- | --- |
| 学習用の説明 | MDN、公式の入門・Learn・Handbook、確認済みの書籍本文 | 日本語で説明し直し、読むページと節を指定する |
| 仕様の確認 | WHATWG、W3C、Ecma、IETFのRFC | 教材制作者が挙動や用語を確認する。必要な箇所だけ学習者にも示す |
| 実装方法とAPI | 採用する製品・ライブラリの公式リファレンス | 引数、返値、制約、実行環境、版を確認する |
| UIの設計例 | デジタル庁、GOV.UK等の公開デザインシステム | 余白、文字、色、状態、部品の仕様を比較する |
| 品質と開発の判断 | 指定書籍、Google Engineering Practices、DORA、OWASP | 実際の変更・レビュー・テストへ結び付ける |
| 技術史 | 開発元の発表、当時の文書、標準化の記録 | 日付や出来事と、教材側の解釈を区別する |
| 独自の課題と観察 | 教材の設計記録、再現可能な実験記録 | 「教材独自の課題」「教材環境での観察」と明示する |

MDNはWeb技術の学習・参照用資料として使う。HTMLやJavaScriptの規範的な仕様は、それぞれの標準化団体の文書で確認する。公式資料同士で説明が異なる場合も、対象バージョン、実行環境、説明の目的を先に確かめる。

ブログ、Qiita、Zenn、動画、検索結果、AIの出力は、調べる入口や補助説明として使える。ただし、教材の技術的な主張は公式資料や再現確認で裏付ける。記事を参考にした場合はその記事も記載し、実際には読んでいない原典を読んだことにしない。AIの回答や検索の要約を、元資料の代わりに根拠として登録しない。

## 2 言語とWebの基本で使う情報源

以下の一覧は制作時の入口である。実教材の参照元には、使った個別ページ・節・仕様項目を登録する。

| 技術 | 学習者向けの主な情報源 | 制作者が確認する仕様・資料 | 主に確認すること |
| --- | --- | --- | --- |
| Web全体 | [MDN Curriculum](https://developer.mozilla.org/en-US/curriculum/core/)、[MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web) | 各技術の標準仕様 | 学習範囲、ブラウザとサーバ、Webの基本用語 |
| VS Codeの導入・操作 | [公式Editor tutorial](https://code.visualstudio.com/docs/editing/getting-started/editor-tutorial)、[MDNのソフトウェア準備](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Installing_software) | [公式Windows setup](https://code.visualstudio.com/docs/setup/windows)、[Workspaces](https://code.visualstudio.com/docs/editing/workspaces/workspaces)、[Terminal Basics](https://code.visualstudio.com/docs/terminal/basics)等 | 導入、作業フォルダー、保存、表示、ターミナル。OSと手順の対象版を記録する |
| HTML | [MDN HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) | [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/) | 文書構造、要素の意味、フォーム、標準の操作 |
| CSS | [MDN CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) | [W3C CSSの仕様一覧](https://www.w3.org/Style/CSS/)から該当モジュール | カスケード、ボックス、Flexbox、Grid、画面幅、対応状況 |
| JavaScript | [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)と各APIのリファレンス | [EcmaのECMA-262](https://ecma-international.org/publications-and-standards/standards/ecma-262/) | 値、型、制御、関数、配列、例外、Promise、言語の挙動 |
| DOM・イベント | MDNの該当するWeb APIのページ | [WHATWG DOM Standard](https://dom.spec.whatwg.org/) | 要素の取得、変更、イベント、伝播、ブラウザの機能 |
| fetch・HTTP | MDNの該当API・HTTP解説 | [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/)、[RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) | 非同期通信、応答、メソッド、状態コード、オリジン |
| TypeScript | [公式Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | [公式Docs](https://www.typescriptlang.org/docs/)のReference、TSConfig、リリース情報 | 型、絞り込み、関数、オブジェクト、コンパイラ設定 |
| C#との比較・既存教材 | [Microsoft Learn C#ガイド](https://learn.microsoft.com/ja-jp/dotnet/csharp/) | 同サイトの言語リファレンス・仕様と採用版の.NET API | 型、条件、配列、関数等の共通点と違い |

JavaScriptの言語機能と、DOM・fetch等の実行環境が提供する機能を分けて説明する。TypeScriptの型確認と、実行時の入力検証も別の仕組みとして扱う。CSSは単一の「CSS3」の資料で済ませず、該当するモジュールの文書とブラウザ対応を確認する。

日本語の公式資料・MDNがある場合は学習者の入口に使う。翻訳の更新が遅れている箇所は英語版と照合し、教材の説明は制作者が確認した内容を日本語で書く。日本語版と英語版を両方利用した場合は、両方のURLを残す。

## 3 フロントエンドとUIで使う情報源

| 技術・領域 | 主な情報源 | 教材での用途と注意 |
| --- | --- | --- |
| Reactの考え方 | [React Learn](https://react.dev/learn)、[Thinking in React](https://react.dev/learn/thinking-in-react)、[状態の共有](https://react.dev/learn/sharing-state-between-components) | 部品分割、props、状態の配置、親子のデータの流れ |
| Reactの部品API | [Reactのinputリファレンス](https://react.dev/reference/react-dom/components/input)等、該当するAPIページ | 制御された入力、イベント、値と状態、部品の契約 |
| Next.js | [公式App RouterのDocs](https://nextjs.org/docs/app)、[Server・Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) | ルーティング、実行場所、データ取得、公開。採用版とRouterを記載する |
| Vite | [公式Guide](https://vite.dev/guide/) | HTML・JS・Reactの開発環境、ビルド、環境変数。教材の構成に合わせて必要箇所を指定する |
| デザインの基本と日本語の部品仕様 | [デジタル庁デザインシステム](https://design.digital.go.jp/dads/) | 基本デザイン、トークン、入力やボタン等の仕様、状態、使い方を参照する |
| 別のデザイン規則との比較 | [GOV.UK Design SystemのStyles](https://design-system.service.gov.uk/styles/)とComponents・Patterns | 余白、文字、色、部品、画面の組合せを比較する。自分のアプリの規則を説明する材料にする |
| アクセシビリティの基準 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/)、[Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)とUnderstanding | ラベル、コントラスト、キーボード、フォーカス、エラー、状態の伝達。達成基準番号を残す |
| 複合UI部品の操作 | [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)、[Dialogパターン](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | キーボード操作、フォーカス、roleと状態を確認する。APGは実装ガイドであり、WCAGの規範本文とは区別する |
| 部品の見本と状態の確認 | [StorybookのStories](https://storybook.js.org/docs/writing-stories)、[アクセシビリティテスト](https://storybook.js.org/docs/writing-tests/accessibility-testing) | 通常、入力、無効、エラー、長文等を見比べる。自動検査に加えて操作を確認する |

デザインシステムは、具体的な規則と部品仕様が公開されているため教材に向く。ただし、行政サービス等の前提を持つ設計例であり、すべてのWebアプリに同じ配色・余白・操作を要求する根拠にはしない。教材では「この課題で採用する規則」と「別の規則でも成立する理由」を区別する。

HTMLの標準要素で実装できる入力やボタンから始める。複雑なMenu、Combobox、DatePicker等にライブラリを採用する場合は、採用時点でそのライブラリの公式Docs、該当部品、導入版、ライセンスを追加登録する。UIライブラリのAPIと、操作設計の根拠であるHTML・WAI資料の両方を参照する。現段階で複数のUIライブラリを必修に追加しない。

## 4 バックエンド・テスト・公開で使う情報源

| 技術・領域 | 主な情報源 | 教材での用途と注意 |
| --- | --- | --- |
| Node.js | [公式Learnの入門](https://nodejs.org/learn/getting-started/introduction-to-nodejs)、[公式API](https://nodejs.org/api/) | ブラウザとの違い、モジュール、非同期、ファイル、HTTP、実行環境。APIは教材のNode.js版を選ぶ |
| npm | [npm公式Docs](https://docs.npmjs.com/) | package.json、scripts、依存関係、lockfile、再現するインストール |
| Express | [公式Routing](https://expressjs.com/en/guide/routing/)、[Middleware](https://expressjs.com/en/guide/using-middleware/)、[Security](https://expressjs.com/en/advanced/best-practice-security/) | HTTPの受け口、処理の順序、エラー、入力、セキュリティ。メジャー版を確認する |
| Hono | [公式Docs](https://hono.dev/docs)、[Node.js向け導入](https://hono.dev/docs/getting-started/nodejs) | ルート、Context、Middleware、Web標準、Node.js用アダプター。実行環境と採用版を固定する |
| SQL・PostgreSQL | [公式Tutorial](https://www.postgresql.org/docs/current/tutorial.html)、[版別Docs](https://www.postgresql.org/docs/) | 表、キー、JOIN、制約、トランザクション、索引、権限。最終登録は採用メジャー版のURLにする |
| 認証・認可・Webセキュリティ | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)、[ASVS](https://owasp.org/projects/asvs)、[Next.jsの認証ガイド](https://nextjs.org/docs/app/guides/authentication) | 入力、セッション、認可、XSS・CSRF等の確認。利用する認証ライブラリの公式資料も採用後に追加する |
| 単体テスト | [Vitest公式Guide](https://vitest.dev/guide/) | 検証関数、境界値、例外、非同期、テスト環境と設定 |
| Reactの操作テスト | [React Testing Library公式Docs](https://testing-library.com/docs/react-testing-library/intro/) | 利用者の操作と結果で部品を確認する。導入した関連パッケージの版も残す |
| E2Eテスト | [Playwright公式Docs](https://playwright.dev/docs/intro)、[Best practices](https://playwright.dev/docs/best-practices) | ブラウザ操作、画面とAPIの連携、待機、分離、失敗の調査 |
| Git | [Git公式Reference](https://git-scm.com/docs) | 差分、コミット、ブランチ、マージ、履歴、誤った変更の復旧 |
| CI | [GitHub ActionsのNode.jsビルド・テスト](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs) | インストール、チェック、成果物、実行環境。サンプル内の版をそのまま採用せず確認する |
| コンテナ | [Docker公式Get started](https://docs.docker.com/get-started/) | イメージ、コンテナ、ネットワーク、永続化、再現する環境 |
| 公開環境・運用 | 採用するホスティング・クラウドの公式Docs | ビルド、環境変数、秘密情報、ログ、監視、バックアップ、復旧。採用先が決まった時点で登録する |
| VS Code拡張・WebView | [VS Code公式Webview API](https://code.visualstudio.com/api/extension-guides/webview) | LXP側の教材表示、通信、状態復元、CSP、ローカル資源、拡張の役割 |

ExpressとHonoは、APIの考え方を比較する資料として扱える。すべての課題を両方で二重に実装する計画にはしない。主教材の実装を一つに決め、M17で別の実装へ移す際に共通点と差分を確かめる。

ORM、入力検証、認証、状態管理等の追加パッケージは、実際に採用するものだけ公式資料を登録する。教材の採用技術が増えるたびに、この一覧と単元の参照元を更新する。

## 5 基礎知識・品質・技術史で使う情報源

| 領域 | 情報源 | 使い方 |
| --- | --- | --- |
| 基本情報技術者レベルの範囲 | [IPAの試験要綱・シラバス](https://www.ipa.go.jp/shiken/syllabus/gaiyou.html)、[基本情報技術者シラバスVer.9.2](https://www.ipa.go.jp/shiken/syllabus/omgdg50000005kpe-att/syllabus_fe_ver9_2.pdf) | 知識の対応表を作る。シラバスは範囲の根拠として使い、各概念の詳しい説明は別の資料で確認する |
| データ構造・アルゴリズム | [MIT OpenCourseWareのIntroduction to Algorithms](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)等の大学公式資料 | 制作者が定義や計算量を確認する補助資料。講座全体や高度な課題を初学者の必修にしない |
| ネットワーク | [HTTPのRFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)、[DNSのRFC 1034](https://www.rfc-editor.org/rfc/rfc1034.html)、[TLS 1.3のRFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html) | 標準の用語と目的を確認し、ブラウザ・API・公開の操作に結び付ける。RFCの更新・廃止や関連文書も確認する |
| 指定書籍 | [O'Reilly Japanの『ソフトウェアエンジニアリングの基礎』](https://www.oreilly.co.jp/books/9784814401789/)と購入した書籍本文 | 読書と実装・設計・品質の振り返りを結び付ける。本文を参照した箇所は版、章・節、ページを記録する |
| コードレビュー | [Google Engineering PracticesのCode Review](https://google.github.io/eng-practices/review/) | 変更の説明、設計、読みやすさ、テスト、レビューへの応答を練習する |
| 品質と継続的な公開 | [DORAのContinuous delivery](https://dora.dev/capabilities/continuous-delivery/) | 小さな変更、テスト、公開、フィードバックの関係を考える。特定の開発手法の万能性や研修効果の保証に使わない |
| Webの誕生 | [CERNのA short history of the Web](https://home.cern/science/computing/the-birth-of-the-web/short-history-web/) | 当時の情報共有の課題、文書・リンク・サーバの成立を学ぶ |
| TypeScriptの成立と変遷 | [開発元のTen Years of TypeScript](https://devblogs.microsoft.com/typescript/ten-years-of-typescript/) | JavaScriptで規模が大きくなる際の課題と、型を使う理由を考える |
| 各技術の変遷 | 採用技術の公式発表、リリースノート、移行ガイド、提案記録 | 「何が変わったか」と「教材側がどう評価するか」を分けて記載する |

OS、メモリ、プロセス、ファイル、文字コードは、実際に扱うOS・ランタイムの公式資料と確認済みの基礎書を対応付ける。採用OSや基礎書が未確定の項目は、情報源未確定として制作台帳に残し、根拠を確認してから公開する。IPAの項目名だけで解説の正しさを確認したとは扱わない。

指定書籍の書誌は、Nathaniel Schutta・Dan Vega著、村上列訳、O'Reilly Japan、2026年、ISBN 978-4-8144-0178-9とする。本設計で確認したのは出版社の紹介と公開目次であり、書籍本文を読んだことにはしない。教材制作時に本文を読み、利用する章・節・ページを確定する。販売ページは書誌情報の根拠、本文は学習内容の根拠として別に管理する。

技術史は「以前の技術が全面的に悪かったので新技術に置き換わった」という説明にしない。当時の制約、解決した問題、増えた複雑さ、現在も適する用途を扱う。日付や発表内容には一次資料を付け、「この理由で学習順序をこうした」は教材設計上の判断として書く。

## 6 18教材パックとの対応

| 教材 | 主に使う情報源 | 参照を調べる練習 |
| --- | --- | --- |
| M01 開発環境とWebの入口 | VS Codeの導入・操作、MDN、採用環境の公式Docs、Git、CERN | 指定ページを開き、見出しと用語を探す |
| M02 HTML・CSSとデザイン基礎 | MDN HTML・CSS、デジタル庁、WCAG | 要素の意味と、課題のデザイン規則の根拠を確かめる |
| M03 JavaScriptの値と制御 | MDN JavaScript Guide、ECMA-262 | 値・型・比較の説明と実行結果を対応付ける |
| M04 JavaScriptのデータ・関数・状態 | MDN Guide・API、アルゴリズムの基礎資料 | 配列APIの引数、返値、元の値の変更を調べる |
| M05 DOMと画面操作 | MDN Web API、DOM Standard | DOM・イベントが言語の機能と異なることを確認する |
| M06 HTMLとJavaScriptのUI部品 | MDN HTML・DOM、デジタル庁、WAI | 入力・開閉・フォーカスの仕様を探す |
| M07 HTTP・非同期・TypeScript | MDN、Fetch、RFC 9110、TypeScript Handbook | 型の確認と通信・実行時の失敗を分けて調べる |
| M08 Reactの基礎と状態 | React Learn・Reference | 自分の実装で誰が状態を持つかを説明する |
| M09 ReactのUI部品とデザイン規則 | React、WAI、デザインシステム、Storybook | 部品の仕様・状態・操作の参照を結び付ける |
| M10 UIと既存機能の連携 | React、通信の資料、Testing Library、Playwright | 保存・失敗・再表示を既存のAPI契約と照合する |
| M11 Node.jsとAPI | Node.js、npm、主教材のExpressまたはHono | API、Middleware、実行環境の対象版を確認する |
| M12 SQLとデータベース | PostgreSQL公式Docs、確認済みの基礎書 | 制約・トランザクションの節を根拠に仕様を説明する |
| M13 認証・認可・セキュリティ | OWASP、採用認証ライブラリ、フレームワーク公式Docs | 利用者と権限のチェック箇所を確認する |
| M14 Next.jsとWebアプリ構成 | 採用版のNext.js App Router Docs、React | サーバ・クライアントの境界と版の差を調べる |
| M15 要件・設計・品質と改善 | 指定書籍、Google Engineering Practices、既習のテスト資料 | 設計判断の理由と参照元を短く記録する |
| M16 公開・CIと運用 | GitHub Actions、Docker、採用公開先、DORA | サンプルの版と自分の環境の違いを確かめる |
| M17 未知のコードと技術の比較 | 比較する技術の公式Docs・リリースノート | 複数資料、最小再現、既存コードを照合する |
| M18 個人でのフルスタック開発 | 採用技術すべての公式資料、書籍、設計記録 | 調査、採用理由、参照、再現環境を自分で残す |

IPAの知識対応と、指定書籍の読書はコース全体に分散する。上表は中心となる資料の対応であり、当該教材だけで読むことを意味しない。未見確認で資料を許可する場合も、参照ページの存在を示すことと、完成解答を渡すことを区別する。

M01のOS別導入、基本操作、配布・実行環境の資料と確認箇所は[M01の詳細設計](06-m01-beginner-setup-and-basic-operations.md)に具体化する。公式ページの転送先が教材の目的と一致することも確認する。

VS Code拡張は、正確な拡張ID、配布元の説明、公式の連携資料を登録する。Prettier・ESLint・Vitest・Playwright等では、エディタ拡張の使い方と、プロジェクト内の実行パッケージの使い方を別々の参照として扱う。選定先、段階、参照元はM01の詳細設計の「VS Code拡張の選定と段階的な導入」に記載する。

## 7 教材に必ず記載する内容

単元ごとに参照元の一覧を持ち、各解説・参考例・図・課題から該当する参照元を指定する。参照元の登録を必須項目とし、資料を利用した範囲を講師が確認してから公開する。

| 登録する情報 | 記載する内容 |
| --- | --- |
| 識別子 | 改訂を区別できるsourceRef。公開済みの記録を上書きしない |
| 資料名と作成者 | ページ・書籍のタイトル、著者または発行・運営主体 |
| 参照する場所 | 該当ページのURLと見出し・節・仕様番号。書籍はISBN、版、章・節、ページ |
| 資料の版 | 文書の版・発行日・改訂番号・commit等。更新型の資料はその旨と確認日 |
| 教材への対応 | どの解説・コード・図・課題の、どの説明や受入条件に使ったか |
| 適用する環境 | 教材の環境定義への参照。ライブラリ、ランタイム、Router、OS等の対象 |
| 利用方法 | 要約、引用、転載、コードの改変、図の改変、独自課題等 |
| 再利用の条件 | コピー・引用・改変した資料の条件、必要な表示、確認したURLと日付 |
| 確認記録 | 内容確認日、確認者、確認範囲、リンク確認、レビュー状態 |

学習者の画面では、まず「何を確認する資料か」「読む場所」を見せ、詳細な管理項目は参照元の詳細に置く。WebViewでも通常のWeb画面でも同じ参照元を表示し、配布・印刷した教材にも一覧を含める。

### 本文と課題への記載例

以下は表示形式の例である。

> 入力値を親の状態として持ち、値と変更イベントを入力部品へ渡します。  
> 参照元: React公式「Sharing State Between Components」。親へ状態を集める説明を参考に、教材用の例を作成。確認日 2026-10-04。  
> 詳しく読む: [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)

> 基礎課題Q01: ラベルをクリックしても、対応する入力へフォーカスが移るようにしてください。  
> 課題は教材独自に作成。要素の関連付けの参照元: MDN「label」のラベルと入力を関連付ける節。  
> 詳しく読む: [MDN label](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label)

独自の演習に架空の「原作」を付けない。題材・数値・問題文は教材独自と明記し、用いる言語・API・操作の背景資料を示す。前の単元を再利用した課題は、その単元の版と参照元を引き継ぐ。基礎課題を繰り返す際は、共通の参照元を各問からたどれるようにし、同じ長い一覧を毎回表示する必要はない。

制作者が独自に決めた余白や配色等は「この教材で採用する規則」と記載する。資料から要約した説明、直接引用、改変したコードや図、独自制作を混同しない。自作の図にも、元の概念を参考にした場合は参照元を付ける。

参照元を記載することと、文章・コード・図を再利用できることは別に確認する。コピー・引用・改変する場合は該当資料の条件を確認し、必要な表示を教材に残す。例えばMDNにも[帰属表示とライセンスの案内](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license)がある。単にリンクを載せればすべて転載できる、とは扱わない。

## 8 LXPでのデータ管理

コース共通のsource-registry.jsonで資料を管理し、単元のreferences.jsonで使用箇所を管理する。重複入力を避けても、公開された単元の参照先は固定する。

```text
web-fullstack/
  source-registry.json
  environments/
    frontend-01.json
  materials/
    M09-react-ui/
      units/
        text-field/
          unit.json
          references.json
          tasks.json
          01-解説と参考例.md
```

次のJSONは登録形式の例であり、実際の承認記録ではない。確認日を入れたことと、内容・版・再利用条件のレビューが済んだことを分ける。

```json
{
  "schemaVersion": "2.1",
  "sources": [
    {
      "id": "SRC-mdn-label-20261004",
      "title": "label HTML element",
      "publisher": "MDN Web Docs",
      "url": "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label",
      "section": "Associating a label with a form control",
      "kind": "explanation",
      "language": "en",
      "documentVersion": { "kind": "rolling", "revision": null },
      "checkedAt": "2026-10-04",
      "review": { "status": "draft", "reviewer": null, "reviewedAt": null }
    }
  ]
}
```

```json
{
  "schemaVersion": "2.1",
  "unitId": "web-fullstack/M09/text-field@1.0.0",
  "environmentRef": "frontend-01@1.0.0",
  "uses": [
    {
      "contentId": "basic/Q01",
      "sourceRefs": ["SRC-mdn-label-20261004"],
      "usedFor": "ラベルと入力の関連付けという受入条件",
      "authorship": "original-exercise",
      "reuse": "concept-reference",
      "reviewStatus": "draft"
    }
  ]
}
```

上例は資料と課題の対応を示す最小例である。Reactの状態や参考コードを説明する実単元では、その参照も追加する。environmentRefの参照先には、package.json・lockfile・Node.js・Router・OS・ブラウザ等の対象と確認環境を登録する。環境レコードのない参照は公開できない。

引用、転載、改変のレコードには、対象範囲、原作者、条件のURL、確認日、必要な帰属表示と教材上の表示位置を追加する。書籍レコードにはISBN、刊行年、版、章・節、ページ、本文を確認した記録を追加する。独自の実験を根拠にする場合は実験ID、コード、入力、結果、環境、日時を記録し、結果を一般仕様と断定しない。

学習者へ渡す公開データと教材の出力には、資料名、作成者、参照箇所、URL、確認日、対象環境、利用方法、必要な帰属表示を含める。講師の内部レビュー記録と、学習者に必要な出典を分ける。講師用解答や非公開の評価素材が参照元のリンクから漏れないようにする。

## 9 公開前の確認と更新

LXPの公開操作と教材ビルドに、次の検証を追加する。

| 確認 | 公開条件 |
| --- | --- |
| 参照元の有無 | 各単元に参照一覧があり、解説・参考例・図・各課題に参照または独自制作の記録がある |
| 参照先の解決 | sourceRef、単元の使用箇所、環境、内部教材の版が存在する |
| 参照の具体性 | 外部資料は該当ページ・節を指定する。技術のトップページだけでは内容の根拠として受け付けない |
| 対象版 | 教材の技術・実行環境・Routerと資料が整合し、スターターと確認用コードがその環境で動く |
| 利用方法 | コピー・引用・改変の範囲と条件、必要な表示を確認し、未確認の素材を含めない |
| 講師レビュー | 資料が該当する説明・受入条件を支えることを確認し、draftからapprovedへ変更する |
| リンク | 明確な削除・404や参照箇所の消失を解消する。タイムアウト・アクセス制限は別に扱い、手動確認とその記録を求める |
| 配信・出力 | 学習画面、WebView、配布・印刷用出力で参照元と必要な表示を確認できる |

JSONの検査やリンクの応答確認だけでは、資料が説明の根拠になっているかは判断できない。自動検査と講師による内容確認を併用する。学習者が必ず読む資料はアクセス条件も確認し、有料書籍を使う場合は必要部数や閲覧方法を研修側で用意する。

更新型の公式Docsは、内容や既定の対象版が変わる。Node.jsとPostgreSQLは版別Docsを選び、Next.jsは版とRouter、Honoはランタイムとアダプターを残す。版固定のURLがない資料は確認日・見出し・利用した主張を記録し、公式リポジトリの改訂番号等を使える場合は併記する。確認日だけで当時の内容を完全に保存できるとは扱わない。

教材を公開する前、次の受講期を開始する前、技術を更新する時に、対象版、参照先、コード、受入条件を再確認する。受講途中の参照元や問題を上書きせず、変更した単元を新しい版として公開する。重大な誤りを修正する場合は、影響を受ける課題・評価と受講者を特定して訂正を案内する。

既存のC#教材にも同じ記載方針を適用する。ただし、現在の教材すべての出典を確認済みとは扱わない。単元ごとにMicrosoft Learn等と照合し、独自課題の表示、参照元、対象のC#・.NET版を順次整える。

## 10 学習者自身が調べられるようにする

参照元は制作者の管理情報として閉じず、学習者が調べる練習に使う。

1. M01〜M06では、指定した見出しから要素・関数の意味と使い方を探す。
2. M07〜M10では、引数・返値・制約を読み、自分の実装と関連付ける。
3. M11〜M14では、対象版、実行環境、成功・失敗、セキュリティ上の前提を確認する。
4. M15〜M18では、公式資料と最小の再現コードを照合し、採用理由、判断の限界、参照元を短く記録する。

提出には、使用した資料、読む箇所、そこから判断したことを残す欄を用意する。URLの数で評価せず、必要な根拠を見付け、自分のコードや設計へ適用できたかを確認する。講師側の教材にも同じ形式を使い、調査と参照の具体例を見せる。

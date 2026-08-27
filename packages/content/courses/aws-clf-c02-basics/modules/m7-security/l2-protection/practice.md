# レッスン7-2 演習 — 防御と情報源

対象トピック: 7-2-1 〜 7-2-4

## 手元で試す

セキュリティサービスを「守る・見つける・証明する」の3段に整理するワークです。

1. 紙を横に3分割し、見出しを「守る(防御)」「見つける(検知)」「証明する(準拠)」とする
2. 次のサービスをどの段に置くか仕分けする: WAF / Shield / KMS / GuardDuty / Inspector / Security Hub / Artifact
3. 各サービスの右に「用途の一言」を書く(例: WAF=不正なリクエストを弾く、GuardDuty=怪しい動きを検出)
4. 「守る」の段に、M4で学んだセキュリティグループも書き足し、WAFとの違いを1行で書く(通信の許可制御 vs 攻撃パターンの検査)
5. 最後に、余白へ「暗号化の2場面」(保存時 at rest / 転送時 in transit)と鍵の管理係(KMS)を書く

仕分けに迷ったサービスは、動詞(防ぐ? 見つける? 証明する?)を自問すると決まります。

## 演習問題

### 問1(基本)

保存時の暗号化と転送時の暗号化の違いを、それぞれ具体例を1つ挙げて説明してください。

### 問2(基本)

WAFとShieldが防ぐ攻撃を、それぞれ攻撃の性質(中身/量)が分かるように1文ずつで書いてください。

### 問3(応用)

GuardDuty・Inspector・Security Hubの役割を1語ずつ(検出/診断/集約)で区別し、次のシナリオにどれが合うか答えてください。「複数のセキュリティサービスの警告がばらばらの画面に出ていて、全体の状態を把握できない」

### 問4(応用)

監査人から「利用しているクラウド基盤が国際的なセキュリティ基準を満たしている証明」を求められました。どのサービスで何を入手しますか。また、それだけでは自社システム全体の証明にならない理由も書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

保存時の暗号化(at rest)は、ストレージに置かれた状態のデータを暗号化することで、S3バケットやEBSボリュームの暗号化設定が例です。転送時の暗号化(in transit)は、ネットワークを流れる間のデータを暗号化することで、ブラウザーとのHTTPS通信が例です。両方そろって初めてデータが守られます。

</details>

<details>
<summary>問2の解答例</summary>

WAFは、SQLインジェクションのような「中身に悪意のあるリクエスト」を検査して弾きます。Shieldは、大量の通信でサービスを押し潰すDDoS攻撃、つまり「量の攻撃」からの保護を担います。

</details>

<details>
<summary>問3の解答例</summary>

GuardDutyは脅威の「検出」、Inspectorは脆弱性の「診断」、Security Hubは結果の「集約」です。シナリオは警告の一元管理の話なので、Security Hubが合います。

</details>

<details>
<summary>問4の解答例</summary>

AWS Artifactから、第三者監査のレポート(ISOやSOCなどの基準への準拠を示す文書)をダウンロードして提出します。ただしArtifactが証明するのは共有責任のうちAWS側(クラウド本体)だけです。自社のデータの扱い・アクセス権・アプリの設定といった利用者側の部分は、自社で証明する必要があります。

</details>

## 確認クイズ

### Q1. 暗号鍵の作成と管理を行うマネージドサービスはどれですか。

- A. KMS
- B. WAF
- C. SQS
- D. Glue

<details>
<summary>答え</summary>

**A** — 鍵の管理はKMSです。保存時の暗号化の設定とセットで問われます。

</details>

### Q2. 「SQLインジェクションなどのWebアプリを狙う攻撃を防ぐ」サービスはどれですか。

- A. Shield
- B. WAF
- C. GuardDuty
- D. Artifact

<details>
<summary>答え</summary>

**B** — リクエストの中身を検査して弾くのがWAFです。ShieldはDDoS(量の攻撃)への盾です。

</details>

### Q3. DDoS攻撃からの保護を主目的とするサービスはどれですか。

- A. Inspector
- B. KMS
- C. Shield
- D. Security Hub

<details>
<summary>答え</summary>

**C** — DDoSといえばShieldです。標準の保護はすべての利用者に自動で効いています。

</details>

### Q4. 「アカウント内の怪しいアクティビティを、ログの分析で自動検出する」サービスはどれですか。

- A. GuardDuty
- B. Artifact
- C. QuickSight
- D. Route 53

<details>
<summary>答え</summary>

**A** — 脅威検出はGuardDuty(警備員)です。診断のInspector、集約のSecurity Hubと動詞で区別します。

</details>

### Q5. AWSの第三者監査レポート(コンプライアンス文書)を入手する窓口はどれですか。

- A. Security Hub
- B. Artifact
- C. Inspector
- D. マネジメントコンソールのヘルプページ

<details>
<summary>答え</summary>

**B** — 監査レポートのダウンロード窓口はArtifactです。証明されるのはAWS側(クラウド本体)の準拠である点も覚えておいてください。

</details>

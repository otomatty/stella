# レッスン6-1 演習 — AI・MLと分析

対象トピック: 6-1-1 〜 6-1-4

## 手元で試す

「分析の川」と「AIの3層」を1枚にまとめるワークです。

1. 紙の上半分に、左から右へ矢印を1本引き、「受ける → ためる → 調べる → 見せる」と4つの持ち場を書く
2. それぞれの下にサービス名を置く(Kinesis / S3・Redshift / Athena・Redshift / QuickSight)
3. 紙の下半分に3段の階段を描き、上から「AIサービス(呼ぶだけ)」「SageMaker(作る)」「インフラ(土台)」と書く
4. AIサービスの段に、用途→名前の対応を4つ書く(画像=Rekognition / 文字起こし=Transcribe / 読み上げ=Polly / 翻訳=Translate)
5. 最後に、自分の業務で「たまっているのに調べられていないデータ」を1つ思い浮かべ、川のどの持ち場のサービスがあれば調べられるかを1文で書く

書き終えたら、紙を見ないで「Kinesis・Redshift・QuickSightの持ち場」を口頭で言えるか確認してください。

## 演習問題

### 問1(基本)

「機械学習の専門知識がないチームが、アプリに画像認識機能を足したい」場合、AI/MLの3層のどの層を選びますか。層の名前と具体的なサービス名を書いてください。

### 問2(基本)

TranscribeとPollyの違いを、変換の「向き」が分かるように1文ずつで書いてください。

### 問3(応用)

「S3にたまったアクセスログを、データベースへ取り込まずにSQLで調べたい」に合うサービスと、その特徴(サーバー・課金)を2文で書いてください。

### 問4(応用)

「店舗のPOSから流れ込む売上データをリアルタイムに受け取り、分析用の倉庫にため、経営層向けのダッシュボードで見せたい」という要件に、3つのサービスを流れの順に当ててください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

最上層のAIサービス層を選びます。出来合いの機能を呼ぶだけで使え、モデルを作る作業が不要だからです。画像認識ならRekognitionです。独自モデルの構築が必要になったときに、初めてSageMakerの層へ降ります。

</details>

<details>
<summary>問2の解答例</summary>

Transcribeは音声を文字に変換する文字起こしのサービスです。Pollyは文字を音声に変換する読み上げのサービスです。向きが逆の対として覚えます。

</details>

<details>
<summary>問3の解答例</summary>

Athenaです。S3上のデータへ直接SQLを実行できるため、データベースへの取り込み(引っ越し)が不要です。サーバーレスなのでインフラの用意も要らず、クエリの実行に対して課金されます。

</details>

<details>
<summary>問4の解答例</summary>

受けるのがKinesis(ストリーミングデータの取り込み)、ためて集計するのがRedshift(データウェアハウス)、見せるのがQuickSight(ダッシュボード)です。「受ける→ためる→見せる」の川の順に並べます。

</details>

## 確認クイズ

### Q1. 「独自の機械学習モデルを構築・訓練・デプロイしたい」に合うサービスはどれですか。

- A. Rekognition
- B. SageMaker
- C. QuickSight
- D. Route 53

<details>
<summary>答え</summary>

**B** — 「作る」ならSageMakerです。Rekognitionは出来合いの画像認識を「呼ぶだけ」の層です。

</details>

### Q2. 画像や動画の中の物体・顔を認識するサービスはどれですか。

- A. Polly
- B. Translate
- C. Rekognition
- D. Transcribe

<details>
<summary>答え</summary>

**C** — 画像認識はRekognitionです。recognition(認識)という英単語の意味で覚えます。

</details>

### Q3. 「S3のデータをそのままSQLで検索する、サーバーレスの分析サービス」はどれですか。

- A. Athena
- B. RDS
- C. ElastiCache
- D. EBS

<details>
<summary>答え</summary>

**A** — Athenaは置いたまま調べる道具です。RDSは業務データを日々さばくデータベースで、役割が違います。

</details>

### Q4. リアルタイムに流れ込むストリーミングデータの受け口になるサービスはどれですか。

- A. QuickSight
- B. Kinesis
- C. Glue
- D. Polly

<details>
<summary>答え</summary>

**B** — 流れ続けるデータを受けるのはKinesisです。QuickSightは見せる係、Glueは整理(カタログ・変換)の係です。

</details>

### Q5. 分析専用のデータウェアハウスにあたるサービスはどれですか。

- A. DynamoDB
- B. Redshift
- C. EFS
- D. CloudFront

<details>
<summary>答え</summary>

**B** — 大量データの集計を担う分析の倉庫がRedshiftです。業務のトランザクションをさばくRDS/DynamoDBと混同しないでください。

</details>

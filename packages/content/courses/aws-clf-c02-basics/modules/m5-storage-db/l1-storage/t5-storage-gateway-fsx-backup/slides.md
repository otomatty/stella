---
id: 5-1-5
title: ストレージの脇を固める3つ
takeaway: "オンプレとの橋渡しはStorage Gateway、Windows向けの高機能共有はFSx、バックアップの一元管理はAWS Backup"
introduces: [Storage Gateway, FSx, AWS Backup]
requires: [S3, EBS, EFS, オンプレミス, ファイルストレージ]
header: "AWS Cloud Practitioner 入門"
---

<!-- _class: lead -->

# 5-1-5
# ストレージの脇を固める3つ

AWS Cloud Practitioner 入門 — Module 5 / レッスン5-1

<!-- ノート: ストレージの締め。本線3方式(S3・EBS・EFS)の脇を固める3サービスを役割の一語で覚えます。 -->

---

## なぜ必要か

- 社内のファイルサーバーを使い続けながら、保管はS3に寄せたい
- Windowsのファイル共有(Active Directory連携)はEFSでは要件が合わない
- EBSやEFSのバックアップ設定が、サービスごとにバラバラになりがち

<!-- ノート: つかみ。本線の3方式では拾いきれない「あるある」を3つ並べます。 -->

---

## 結論

**オンプレとの橋渡しはStorage Gateway、Windows向けの高機能共有はFSx、バックアップの一元管理はAWS Backup**

- **Storage Gateway** = 社内からS3などへの出入口になるハイブリッドストレージ
- **FSx** = Windows File ServerやLustreなど専用品の共有ストレージ
- **AWS Backup** = 複数サービスのバックアップをまとめて計画・管理

<!-- ノート: 結論。橋・専用品・まとめ役、と役割の一語で区別します。 -->

---

## 最小の例

| サービス | 一言 | 向く場面 |
| --- | --- | --- |
| **Storage Gateway** | オンプレとの橋 | 社内の使い勝手のままS3へ保管 |
| **FSx** | 専用品の共有 | WindowsのファイルサーバーをAWSで |
| **AWS Backup** | バックアップのまとめ役 | EBS・EFS・RDSなどを一括で世代管理 |

<!-- ノート: FSxは「for Windows File Server」のように、for の後ろに専用品の名前が付きます。 -->

---

## 試験での聞かれ方

- 「オンプレミスのアプリからクラウドのストレージをシームレスに使いたい」→ Storage Gateway
- 「Active Directoryと統合したWindowsのファイル共有」→ FSx
- 「複数のAWSサービスのバックアップを一元的に自動化」→ AWS Backup

<!-- ノート: 補強枠。EFSとFSxの2択は「Linux標準ならEFS、Windowsや高性能計算の専用品ならFSx」。 -->

---

<!-- _class: summary -->

## まとめ

**オンプレとの橋渡しはStorage Gateway、Windows向けの高機能共有はFSx、バックアップの一元管理はAWS Backup**

<!-- ノート: 再掲のみ。次のレッスンはデータベース、形のあるデータの置き場です、と口頭で引き。 -->

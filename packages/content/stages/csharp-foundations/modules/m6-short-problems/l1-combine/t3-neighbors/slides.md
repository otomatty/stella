---
sourceRefs: [SRC-mslearn-csharp-arrays-20261106, SRC-mslearn-csharp-indexer-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-comparison-20261106]
id: 6-1-3
title: 隣の値を比べる
takeaway: "隣は i と i+1 だけを比べ、ループは n-1 までです。"
introduces: [隣]
requires: [配列, 添字, for, 比較]
header: "C# の基礎"
---
<!-- _class: lead -->
# 隣の値を比べる
<!-- ノート: 二重ループは使いません。 -->
---
# 隣は i と i+1 です
1行目の N は 2 以上、2行目が N 個です。
<!-- ノート: 見る組は、隣り合う二つだけです。 -->
---
# ループは n-1 までです
隣は i と i+1 だけを比べ、ループは n-1 までです。
<!-- ノート: i が n-1 になると、i+1 は配列の外です。 -->
---
# 差が負なら符号を反転する
```csharp
int difference = int.Parse(parts[i + 1]) - int.Parse(parts[i]);
if (difference < 0) difference = -difference;
```
<!-- ノート: 右が小さい組を、最大から落とさないためです。 -->
---
# 二つの条件を同時に使う
左が閾値未満、かつ右が閾値以上、のような組は && で数えます。N が 1 なら組はなく、0 です。
<!-- ノート: 増えた組を全部数えるのではありません。 -->
---
<!-- _class: summary -->
# まとめ
隣は i と i+1 だけを比べ、ループは n-1 までです。
<!-- ノート: 答えは WriteLine で出します。 -->

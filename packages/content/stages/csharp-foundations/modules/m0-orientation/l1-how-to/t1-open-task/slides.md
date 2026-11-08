---
sourceRefs: []
id: 0-1-1
title: 課題を VS Code で開く
takeaway: "課題は VS Code で開き、1 問を 1 ファイルに書きます。"
introduces: [課題, VS Code, Answers]
requires: []
header: "C# の基礎"
---
<!-- _class: lead -->
# 課題を VS Code で開く
<!-- ノート: 課題の置き場所と、書くファイルを決めます。 -->
---
# 1 問が 1 ファイルです
編集するのは、問題ごとの `src` のファイルです。
<!-- ノート: 問題ごとにファイルを分けます。 -->
---
# Answers のメソッドに 1 つ
クラスは `public static partial class Answers` です。メソッドは、そのファイルに 1 つだけ書きます。
<!-- ノート: 単元の課題一覧から VS Code で開きます。 -->
---
# 入口は書きません
```csharp
public static partial class Answers
{
    public static void Q01CountUp(int n)
    {
        // ここに書く
    }
}
```
<!-- ノート: テストがメソッドを呼びます。ファイル名は問題の id です。 -->
---
<!-- _class: summary -->
# まとめ
課題は VS Code で開き、1 問を 1 ファイルに書きます。
<!-- ノート: プログラムの入口と、メソッドを呼び出す行は書きません。 -->

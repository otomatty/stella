# 文字列の処理を自分で選ぶ

`src/<id>.cs` に、その問題のメソッドを 1 つ書きます。クラスは `public static partial class Answers` です。プログラムの入口と、メソッドを呼び出す行は書きません。テストがメソッドを呼びます。

1 問確認して提出し、次の問題へ進みます。全部の問題を提出すると、この課題は合格になります。

S01、S04、S07、S08 は `string`、S02 と S10 は `bool`、S03、S05、S06 は `int` です。S09 は `void` で 2 行出します。空や短い文字列は、切る前に長さを見ます。

| 問題 | ファイル | メソッド |
| --- | --- | --- |
| S01 | `src/s01-ends-joined.cs` | `public static string S01EndsJoined(string s)` |
| S02 | `src/s02-is-code.cs` | `public static bool S02IsCode(string s)` |
| S03 | `src/s03-count-other.cs` | `public static int S03CountOther(string s, char c)` |
| S04 | `src/s04-head2-if6.cs` | `public static string S04Head2If6(string s)` |
| S05 | `src/s05-count-blanks.cs` | `public static int S05CountBlanks(string s)` |
| S06 | `src/s06-last-index-of.cs` | `public static int S06LastIndexOf(string s, char c)` |
| S07 | `src/s07-swap-halves.cs` | `public static string S07SwapHalves(string s)` |
| S08 | `src/s08-all-upper.cs` | `public static string S08AllUpper(string s)` |
| S09 | `src/s09-print-digit-and-upper.cs` | `public static void S09PrintDigitAndUpper(string s)` |
| S10 | `src/s10-same-ends.cs` | `public static bool S10SameEnds(string s)` |

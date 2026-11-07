// Q24 左2・右2（4文字以上）
// 部分文字列は Substring で切ります。数値にしないので、先頭の 0 は残します。
// 構文: Substring
// 引数: string s
// 出力: 先頭2文字と末尾2文字を2行
// テスト: "2026" → 20 と 26 / "abcd" → ab と cd

public static partial class Answers
{
    public static void Q24PrintLeft2Right2(string s)
    {
        Console.WriteLine(s.Substring(0, 2));
        Console.WriteLine(s.Substring(s.Length - 2, 2));
    }
}

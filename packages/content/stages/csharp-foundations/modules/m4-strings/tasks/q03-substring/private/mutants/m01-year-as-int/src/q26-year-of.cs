// Q26 先頭4文字が年（8桁）を int にせず返す
// 部分文字列は Substring で切ります。数値にしないので、先頭の 0 は残します。
// 構文: Substring(0, 4)
// 引数: string s
// 戻り値: string
// テスト: "20260903" → "2026" / "09990101" → "0999"

public static partial class Answers
{
    public static string Q26YearOf(string s)
    {
        return int.Parse(s.Substring(0, 4)).ToString();
    }
}

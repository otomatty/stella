// Q30 先頭を除いた残り
// 部分文字列は Substring で切ります。数値にしないので、先頭の 0 は残します。
// 構文: Substring(1)
// 引数: string s（1文字以上）
// 戻り値: string
// テスト: "abc" → "bc" / "A" → "" / "2026" → "026"

public static partial class Answers
{
    public static string Q30WithoutFirst(string s)
    {
        return s.Substring(1);
    }
}

// Q25 真ん中2文字（6文字の想定）
// 部分文字列は Substring で切ります。数値にしないので、先頭の 0 は残します。
// 構文: Substring(2, 2)
// 引数: string s
// 戻り値: string
// テスト: "abcdef" → "cd" / "123456" → "34"

public static partial class Answers
{
    public static string Q25Middle2(string s)
    {
        return s.Substring(2, 2);
    }
}

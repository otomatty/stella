// Q17 長さがちょうど n か（中身は見ない）
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 引数: string s, int n
// 例: ("abc", 3) → true / ("ab", 3) → false

public static partial class Answers
{
    public static bool Q17IsLength(string s, int n)
    {
        return s.Length == n;
    }
}

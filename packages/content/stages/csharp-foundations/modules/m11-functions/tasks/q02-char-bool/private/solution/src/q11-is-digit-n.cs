// Q11 ★ ちょうど N 桁の数字か
// 数値に変換しない。空文字は長さ 0 として false になることが多い。
// 構文: .Length、for、'0'〜'9'
// 引数: string s, int n
// 戻り値: bool
// 関数名: IsDigitN
// 例: ("12345", 5) → true / ("12345", 8) → false / ("12345678", 8) → true / ("", 8) → false / ("1234567a", 8) → false

public static partial class Answers
{
    public static bool Q11IsDigitN(string s, int n)
    {
        if (s.Length != n) return false;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9') return false;
        }
        return true;
    }
}

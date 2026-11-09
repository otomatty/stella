// 接続練習
// 文字列を for で 1 文字ずつ見ます。回数は s.Length、見るものは s[i] です。空文字はループが 0 回なので個数は 0 です。全部数字かは、1 つでも外れたら false、空は false です。
// 構文: .Length、for、'0'〜'9'
// 引数: string s
// 戻り値: bool（長さちょうど8かつ全部数字）
// テスト: "20260903" → true / "" → false / "1234567a" → false / "1234567" → false

public static partial class Answers
{
    public static bool ConnectEightDigits(string s)
    {
        if (s.Length != 8)
        {
            return false;
        }
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9')
            {
                return false;
            }
        }
        return true;
    }
}

// Q17 文字 c を含むか
// 文字列を for で 1 文字ずつ見ます。回数は s.Length、見るものは s[i] です。空文字はループが 0 回なので個数は 0 です。全部数字かは、1 つでも外れたら false、空は false です。
// 構文: for、==
// 引数: string s, char c
// 戻り値: bool
// テスト: ("abc", 'b') → true / ("abc", 'z') → false / ("", 'a') → false

public static partial class Answers
{
    public static bool Q17ContainsChar(string s, char c)
    {
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == c)
            {
                return true;
            }
        }
        return false;
    }
}

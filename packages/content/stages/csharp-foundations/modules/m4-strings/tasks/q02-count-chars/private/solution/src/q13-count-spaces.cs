// Q13 空白（半角）の個数
// 文字列を for で 1 文字ずつ見ます。回数は s.Length、見るものは s[i] です。空文字はループが 0 回なので個数は 0 です。全部数字かは、1 つでも外れたら false、空は false です。
// 構文: for、== ' '
// 引数: string s
// 戻り値: int
// テスト: "a b c" → 2 / "abc" → 0 / "   " → 3

public static partial class Answers
{
    public static int Q13CountSpaces(string s)
    {
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == ' ')
            {
                count = count + 1;
            }
        }
        return count;
    }
}

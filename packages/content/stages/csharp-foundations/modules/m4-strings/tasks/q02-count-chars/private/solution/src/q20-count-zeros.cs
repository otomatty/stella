// Q20 '0' の個数
// 文字列を for で 1 文字ずつ見ます。回数は s.Length、見るものは s[i] です。空文字はループが 0 回なので個数は 0 です。全部数字かは、1 つでも外れたら false、空は false です。
// 構文: for、== '0'
// 引数: string s
// 戻り値: int
// テスト: "2026" → 1 / "111" → 0 / "00" → 2

public static partial class Answers
{
    public static int Q20CountZeros(string s)
    {
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == '0')
            {
                count = count + 1;
            }
        }
        return count;
    }
}

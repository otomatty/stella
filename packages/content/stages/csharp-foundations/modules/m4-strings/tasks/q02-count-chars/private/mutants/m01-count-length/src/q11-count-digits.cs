// Q11 ★ 半角数字の個数
// 文字列を for で 1 文字ずつ見ます。回数は s.Length、見るものは s[i] です。空文字はループが 0 回なので個数は 0 です。全部数字かは、1 つでも外れたら false、空は false です。
// 構文: for、'0'〜'9'
// 引数: string s
// 戻り値: int
// テスト: "2026" → 4 / "20a6" → 3 / "abc" → 0 / "" → 0

public static partial class Answers
{
    public static int Q11CountDigits(string s)
    {
        return s.Length;
    }
}

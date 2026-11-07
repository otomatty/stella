// Q27 数字の個数
// 戻り値は int または string。表示せず return する。
// 引数: string s
// 戻り値: int
// 例: "20a6" → 3 / "" → 0

public static partial class Answers
{
    public static int Q27CountDigits(string s)
    {
        int c = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] >= '0' && s[i] <= '9') c = c + 1;
        }
        return c;
    }
}

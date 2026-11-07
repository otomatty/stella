// R2
// 半角数字 4 文字なら空文字、それ以外 Err を返す。画面出力は呼び出し側だけで行う。

public static partial class Answers
{
    public static string R2Check(string s)
    {
        if (s.Length != 4) return "Err";
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9') return "Err";
        }
        return "";
    }
}

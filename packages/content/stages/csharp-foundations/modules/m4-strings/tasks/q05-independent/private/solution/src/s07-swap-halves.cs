// S07 前後を交換
// 4文字のsを受け取り、後ろ2文字の後に前2文字をつなげて返す。
// 例: abcd→cdab、0012→1200

public static partial class Answers
{
    public static string S07SwapHalves(string s)
    {
        return s.Substring(2, 2) + s.Substring(0, 2);
    }
}

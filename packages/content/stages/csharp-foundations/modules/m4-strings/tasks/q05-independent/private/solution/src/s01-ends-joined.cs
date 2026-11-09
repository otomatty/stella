// S01 端の表示
// 文字列sが空ならemptyを返し、そうでなければ先頭と末尾を連結した文字列を返す。
// 例: abc→ac、x→xx、空→empty

public static partial class Answers
{
    public static string S01EndsJoined(string s)
    {
        if (s.Length == 0)
        {
            return "empty";
        }
        return "" + s[0] + s[s.Length - 1];
    }
}

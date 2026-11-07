// R2
// 
// 2文字以上なら先頭2文字、短ければErrを返す。

public static partial class Answers
{
    public static string R2Head(string s)
    {
        string result = s.Substring(0, 2);
        if (s.Length < 2) return "Err";
        return result;
    }
}

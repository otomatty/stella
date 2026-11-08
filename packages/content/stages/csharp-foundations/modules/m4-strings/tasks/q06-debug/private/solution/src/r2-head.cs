// R2
// 
// 2文字以上なら先頭2文字、短ければErrを返す。

public static partial class Answers
{
    public static string R2Head(string s)
    {
        if (s.Length < 2)
        {
            return "Err";
        }
        return s.Substring(0, 2);
    }
}

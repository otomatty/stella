// S04 受付番号の前半
// 文字列sが6文字なら先頭2文字、そうでなければErrを返す。
// 例: 001234→00、123→Err

public static partial class Answers
{
    public static string S04Head2If6(string s)
    {
        if (s.Length == 6)
        {
            return s.Substring(0, 2);
        }
        return "Err";
    }
}

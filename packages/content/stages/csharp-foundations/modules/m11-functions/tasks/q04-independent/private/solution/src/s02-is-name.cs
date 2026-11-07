// S02 名前の部品
// 空でなく全字が半角大文字かを返す IsUpper を作る。その関数を使い、長さ 2〜5 で大文字のみなら true を返す IsName を作る。
// 例: AB→true、A→false、Ab→false

public static partial class Answers
{
    public static bool S02IsName(string s)
    {
        static bool IsUpper(string text)
        {
            if (text.Length == 0) return false;
            for (int i = 0; i < text.Length; i++)
            {
                if (text[i] < 'A' || text[i] > 'Z') return false;
            }
            return true;
        }
        if (s.Length < 2 || s.Length > 5) return false;
        return IsUpper(s);
    }
}

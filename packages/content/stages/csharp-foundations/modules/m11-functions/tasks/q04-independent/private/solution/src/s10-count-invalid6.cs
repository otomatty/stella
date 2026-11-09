// S10 検査の件数
// IsDigitN を使い、文字列配列のうち半角数字 6 文字でない要素の個数を返す。string[] は要素が文字列である配列。空の配列もある。
// 例: ["012345","12345a",""]→2、[]→0

public static partial class Answers
{
    public static int S10CountInvalid6(string[] a)
    {
        static bool IsDigitN(string text, int length)
        {
            if (text.Length != length) return false;
            for (int i = 0; i < text.Length; i++)
            {
                if (text[i] < '0' || text[i] > '9') return false;
            }
            return true;
        }
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (!IsDigitN(a[i], 6)) c = c + 1;
        }
        return c;
    }
}

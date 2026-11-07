// S03 異なる文字
// 文字列sと文字cを受け取り、c以外の文字の個数を返す。
// 例: banana,a→3、空,a→0

public static partial class Answers
{
    public static int S03CountOther(string s, char c)
    {
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] != c)
            {
                count = count + 1;
            }
        }
        return count;
    }
}

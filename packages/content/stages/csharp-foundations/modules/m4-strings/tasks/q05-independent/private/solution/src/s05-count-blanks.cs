// S05 区切りの個数
// 文字列sの半角空白と全角空白の合計個数を返す。ほかの文字は数えない。
// 例: a b　c→2、空→0

public static partial class Answers
{
    public static int S05CountBlanks(string s)
    {
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == ' ' || s[i] == '\u3000')
            {
                count = count + 1;
            }
        }
        return count;
    }
}

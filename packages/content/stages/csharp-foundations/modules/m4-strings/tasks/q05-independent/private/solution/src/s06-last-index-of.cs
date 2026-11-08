// S06 最後の該当位置
// 文字列sと文字cを受け取り、最後にcが現れる0始まりの位置を返す。なければ-1。
// 例: banana,a→5、abc,z→-1

public static partial class Answers
{
    public static int S06LastIndexOf(string s, char c)
    {
        int last = -1;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == c)
            {
                last = i;
            }
        }
        return last;
    }
}

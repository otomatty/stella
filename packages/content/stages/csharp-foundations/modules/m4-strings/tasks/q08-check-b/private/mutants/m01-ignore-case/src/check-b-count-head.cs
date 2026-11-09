// 配布文
// 
// 文字列sが空なら0。そうでなければ、先頭と同じ文字がs全体に何個あるか返す。0〜20文字、nullなし。
// 
// 例: abaca→3

public static partial class Answers
{
    public static int CheckBCountHead(string s)
    {
        if (s.Length == 0)
        {
            return 0;
        }
        char head = char.ToLower(s[0]);
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (char.ToLower(s[i]) == head)
            {
                count = count + 1;
            }
        }
        return count;
    }
}

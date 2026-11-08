// Q07 ★ 3の倍数
// 整数 n を受け取り、3の倍数なら Yes、そうでなければ No を返す。
// 例: 9 → Yes / 10 → No / 0 → Yes

public static partial class Answers
{
    public static string Q07MultipleOf3(int n)
    {
        if (n % 3 == 0)
        {
            return "Yes";
        }
        else
        {
            return "No";
        }
    }
}

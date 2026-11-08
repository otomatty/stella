// Q28 ★ かつ
// 整数 age, score を受け取り、18 以上かつ 60 以上なら OK、そうでなければ NG を返す。
// 例: 18, 60 → OK / 18, 59 → NG / 17, 100 → NG

public static partial class Answers
{
    public static string Q28CanApply(int age, int score)
    {
        if (age >= 18 || score >= 60)
        {
            return "OK";
        }
        else
        {
            return "NG";
        }
    }
}

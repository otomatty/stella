// Q11 ★ 合格点（以上）
// 整数 score を受け取り、60 以上なら pass、未満なら fail を返す。
// 例: 60 → pass / 59 → fail / 100 → pass

public static partial class Answers
{
    public static string Q11PassFail(int score)
    {
        if (score > 60)
        {
            return "pass";
        }
        else
        {
            return "fail";
        }
    }
}

// Q18 ★ 3段階の成績
// 整数 score を受け取り、80 以上なら A、60 以上 80 未満なら B、60 未満なら C を返す。
// 例: 80 → A / 79 → B / 60 → B / 59 → C

public static partial class Answers
{
    public static string Q18Grade3(int score)
    {
        if (score >= 80)
        {
            return "A";
        }
        else if (score >= 60)
        {
            return "B";
        }
        else
        {
            return "C";
        }
    }
}

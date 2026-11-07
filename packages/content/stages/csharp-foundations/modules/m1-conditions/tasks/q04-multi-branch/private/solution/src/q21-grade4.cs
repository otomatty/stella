// Q21 4段階の成績
// 整数 score を受け取り、90 以上なら A、70 以上なら B、50 以上なら C、それ以外は D を返す。
// 例: 90 → A / 89 → B / 70 → B / 50 → C / 49 → D

public static partial class Answers
{
    public static string Q21Grade4(int score)
    {
        if (score >= 90)
        {
            return "A";
        }
        else if (score >= 70)
        {
            return "B";
        }
        else if (score >= 50)
        {
            return "C";
        }
        else
        {
            return "D";
        }
    }
}

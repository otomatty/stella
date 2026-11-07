// Q09 4で割り切れるか
// 整数 year を受け取り、4で割り切れれば leap、そうでなければ common を返す。
// 例: 2024 → leap / 2023 → common / 2000 → leap

public static partial class Answers
{
    public static string Q09LeapYear(int year)
    {
        if (year % 4 == 0)
        {
            return "leap";
        }
        else
        {
            return "common";
        }
    }
}

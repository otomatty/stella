// Q16 以上（年齢）
// 整数 age を受け取り、20 以上なら adult、そうでなければ child を返す。
// 例: 20 → adult / 19 → child / 0 → child

public static partial class Answers
{
    public static string Q16AgeGroup(int age)
    {
        if (age >= 20)
        {
            return "adult";
        }
        else
        {
            return "child";
        }
    }
}

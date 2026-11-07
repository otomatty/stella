// Q29 pass / fail（60以上）
// 戻り値は int または string。表示せず return する。
// 戻り値: string
// 例: 60 → pass / 59 → fail

public static partial class Answers
{
    public static string Q29PassFail(int score)
    {
        if (score >= 60) return "pass";
        return "fail";
    }
}

// Q30 ice / water / steam（0未満 ice、100より大きい steam、それ以外は water）
// 戻り値は int または string。表示せず return する。
// 戻り値: string
// 例: -1 → ice / 0 → water / 100 → water / 101 → steam

public static partial class Answers
{
    public static string Q30WaterState(int t)
    {
        if (t < 0) return "ice";
        if (t > 100) return "steam";
        return "water";
    }
}

// Q05 4で割り切れるか
// 中で表示しない。必ず return する。条件そのものを返す。
// 関数名: DivisibleBy4
// 例: 2024 → true / 2023 → false / 2000 → true

public static partial class Answers
{
    public static bool Q05DivisibleBy4(int n)
    {
        return n % 4 == 0;
    }
}

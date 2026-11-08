// Q01 ★ 偶数か
// 中で表示しない。必ず return する。条件そのものを返す。
// 構文: %、return
// 引数: int n
// 戻り値: bool
// 関数名: IsEven
// 例: 7 → false / 8 → true / 0 → true

public static partial class Answers
{
    public static bool Q01IsEven(int n)
    {
        return n % 2 == 0;
    }
}

// Q21 ★ 大きい方
// 戻り値は int または string。表示せず return する。
// 構文: if、return
// 引数: int a, int b
// 戻り値: int
// 例: (3, 10) → 10 / (10, 3) → 10 / (4, 4) → 4

public static partial class Answers
{
    public static int Q21Max2(int a, int b)
    {
        if (a >= b) return a;
        return b;
    }
}

// S03 超過分
// 整数 n, k から、n が k を超えた分だけを返す Excess を作る。超えていなければ 0。配列の各値について Excess を呼び、超過分の合計を返す関数も作る。
// 例: [3,8,6],5→4

public static partial class Answers
{
    public static int S03SumExcess(int[] a, int k)
    {
        static int Excess(int value, int limit)
        {
            if (value > limit) return value - limit;
            return 0;
        }
        int s = 0;
        for (int i = 0; i < a.Length; i++) s = s + Excess(a[i], k);
        return s;
    }
}

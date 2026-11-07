// S01 範囲の部品
// 整数 n, l, r を受け取り、l 以上 r 以下かを bool で返す InRange を作る。次に、配列 a の範囲内の個数を返す CountInRange を、その関数を呼んで作る。l≦r。
// 例: [1,3,5],2,4→1

public static partial class Answers
{
    public static int S01CountInRange(int[] a, int l, int r)
    {
        static bool InRange(int value, int low, int high)
        {
            return value >= low && value <= high;
        }
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (InRange(a[i], l, r)) c = c + 1;
        }
        return c;
    }
}

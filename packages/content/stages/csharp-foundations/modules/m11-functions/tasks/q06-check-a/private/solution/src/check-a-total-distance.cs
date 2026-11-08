// 確認A 隣の距離
// 関数の問題は戻り値を確認する。null はない。指定のない配列の長さは 0〜20、整数は -100〜100。
// 整数 a, b から差の絶対値を返す Distance を作る。次に配列 a の隣との差の絶対値の合計を返す TotalDistance を Distance を呼んで作る。空または 1 個なら 0。値は -100〜100。
// 例: [4,1,6]→8

public static partial class Answers
{
    public static int CheckATotalDistance(int[] a)
    {
        static int Distance(int left, int right)
        {
            if (left >= right) return left - right;
            return right - left;
        }
        if (a.Length <= 1) return 0;
        int sum = 0;
        for (int i = 0; i < a.Length - 1; i++) sum = sum + Distance(a[i], a[i + 1]);
        return sum;
    }
}

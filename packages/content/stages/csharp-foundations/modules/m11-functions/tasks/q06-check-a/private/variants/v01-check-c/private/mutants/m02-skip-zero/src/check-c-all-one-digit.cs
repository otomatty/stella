// 確認C 1桁だけ
// 関数の問題は戻り値を確認する。null はない。指定のない配列の長さは 0〜20、整数は -100〜100。
// 整数 n が 0〜9 なら true を返す IsOneDigit を作る。次に配列のすべての値がその条件を満たすかを、IsOneDigit を呼んで返す。空なら true。
// 例: [0,9]→true

public static partial class Answers
{
    public static bool CheckCAllOneDigit(int[] a)
    {
        static bool IsOneDigit(int n)
        {
            return n >= 1 && n <= 9;
        }
        for (int i = 0; i < a.Length; i++)
        {
            if (!IsOneDigit(a[i])) return false;
        }
        return true;
    }
}

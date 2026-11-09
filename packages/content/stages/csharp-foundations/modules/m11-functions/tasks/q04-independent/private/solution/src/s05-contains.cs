// S05 位置を返す
// 配列 a と k を受け取り、最初の k の位置を返す Find を作る。なければ -1。次に Find を呼び、k を含むか bool で返す関数を作る。
// 例: [2,7,2],7→位置1・true、[],7→位置-1・false

public static partial class Answers
{
    public static bool S05Contains(int[] a, int k)
    {
        static int Find(int[] values, int target)
        {
            for (int i = 0; i < values.Length; i++)
            {
                if (values[i] == target) return i;
            }
            return -1;
        }
        return Find(a, k) != -1;
    }
}

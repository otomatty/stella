// 到達A 残金
// 入力の各行は半角空白区切り。null 入力なし。
// 1行に購入額pと所持金mを受け取る。購入後の残金を出す。買えなければ-1。0≦p,m≦10000。

public static partial class Answers
{
    public static void DaRemaining()
    {
        string[] parts = Console.ReadLine().Split();
        int p = int.Parse(parts[0]);
        int m = int.Parse(parts[1]);
        if (p > m)
        {
            Console.WriteLine(-1);
        }
        else
        {
            Console.WriteLine(m - p);
        }
    }
}

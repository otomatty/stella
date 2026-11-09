// S10 範囲に入るか
// 1行目に l と r、2行目 N、続く N 行に整数。l 以上 r 以下なら IN、それ以外 OUT を各行に表示する。0≦N≦20、l≦r。
// 例: 2 5 / 3 / 2 / 6 / 5→IN / OUT / IN

public static partial class Answers
{
    public static void S10PrintInOut()
    {
        string[] range = Console.ReadLine().Split();
        int left = int.Parse(range[0]);
        int right = int.Parse(range[1]);
        int n = int.Parse(Console.ReadLine());
        for (int i = 0; i < n; i++)
        {
            int value = int.Parse(Console.ReadLine());
            if (value >= left && value <= right)
            {
                Console.WriteLine("IN");
            }
            else
            {
                Console.WriteLine("OUT");
            }
        }
    }
}

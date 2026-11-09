// S10 残量の検査
// 1行目に残量xとN、続くN行に使用量。使えるときだけ減らす。使えなかった回数を表示する。残量と使用量は0〜100。0≦N≦20。
// 例: 5 3 / 6 / 3 / 3 → 2

public static partial class Answers
{
    public static void S10Cannot()
    {
        string[] header = Console.ReadLine().Split();
        int left = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int fail = 0;
        for (int i = 0; i < n; i++)
        {
            int use = int.Parse(Console.ReadLine());
            if (use <= left)
            {
                left = left - use;
            }
            else
            {
                fail = fail + 1;
            }
        }
        Console.WriteLine(fail);
    }
}

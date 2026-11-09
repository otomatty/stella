// 最初の値xに増減を順に加える。初期値も含めた途中の最大値を1行目、最後の値を2行目に表示する。
// 入力は1行目にxとN、続くN行に増減。0≦N≦20、値と増減は-100〜100。初期値だけのN=0もある。
// 例: 3 2 / -6 / 4 → 3 / 1

public static partial class Answers
{
    public static void Q26MaxFinal()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int best = current;
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
            if (current > best)
            {
                best = current;
            }
        }
        Console.WriteLine(best);
        Console.WriteLine(current);
    }
}

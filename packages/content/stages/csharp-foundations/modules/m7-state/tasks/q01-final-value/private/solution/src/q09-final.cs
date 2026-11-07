// 最初の値xに、各行の増減を順に加える。最後の値を表示する。
// 入力は1行目にxとN、続くN行に増減。0≦N≦20、値と増減は-100〜100。初期値だけのN=0もある。
// 例: 7 3 / -10 / 0 / 8 → 5

public static partial class Answers
{
    public static void Q09Final()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
        }
        Console.WriteLine(current);
    }
}

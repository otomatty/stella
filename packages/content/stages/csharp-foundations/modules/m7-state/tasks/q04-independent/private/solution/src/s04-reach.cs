// S04 到着した操作
// 1行目にx、目標t、N、続くN行の増減。初期値または更新後に初めてt以上になった操作番号を表示。初期値なら0、到達しなければ-1。0≦N≦20、x・t・増減は-100〜100。
// 例: 0 5 3 / 2 / 4 / -3 → 2

public static partial class Answers
{
    public static void S04Reach()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int target = int.Parse(header[1]);
        int n = int.Parse(header[2]);
        if (current >= target)
        {
            Console.WriteLine(0);
            return;
        }
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
            if (current >= target)
            {
                Console.WriteLine(i + 1);
                return;
            }
        }
        Console.WriteLine(-1);
    }
}

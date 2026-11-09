// S05 途中の最小
// 1行目xとN、続くN行に増減。初期値を含めた最小値と最後の値を2行表示。0≦N≦20、xと増減は-100〜100。
// 例: 3 3 / -5 / 4 / -1 → -2 / 1

public static partial class Answers
{
    public static void S05Min()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int worst = current;
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
            if (current < worst)
            {
                worst = current;
            }
        }
        Console.WriteLine(worst);
        Console.WriteLine(current);
    }
}

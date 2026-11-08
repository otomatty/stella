// S02 電池の充電
// 1行目に初期電池量x、容量c、N。続くN行の増減を適用する。0未満なら0、cを超えたらcにする。最後の量を表示。0≦x≦c≦100。0≦N≦20、増減は-100〜100。
// 例: 4 5 3 / 3 / -8 / 2 → 2

public static partial class Answers
{
    public static void S02Battery()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int capacity = int.Parse(header[1]);
        int n = int.Parse(header[2]);
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
            if (current < 0)
            {
                current = 0;
            }
            if (current > capacity)
            {
                current = capacity;
            }
        }
        Console.WriteLine(current);
    }
}

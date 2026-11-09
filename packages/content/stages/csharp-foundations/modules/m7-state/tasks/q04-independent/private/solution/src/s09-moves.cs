// S09 移動指示
// 1行目N、続くN行にLかR。位置0からLなら1減らし、Rなら1増やす。訪れた最小位置と最大位置を初期位置も含めて2行表示。0≦N≦20。
// 例: 4 / L / R / R / L → -1 / 1

public static partial class Answers
{
    public static void S09Moves()
    {
        int n = int.Parse(Console.ReadLine());
        int pos = 0;
        int min = 0;
        int max = 0;
        for (int i = 0; i < n; i++)
        {
            string move = Console.ReadLine();
            if (move == "L")
            {
                pos = pos - 1;
            }
            else
            {
                pos = pos + 1;
            }
            if (pos < min)
            {
                min = pos;
            }
            if (pos > max)
            {
                max = pos;
            }
        }
        Console.WriteLine(min);
        Console.WriteLine(max);
    }
}

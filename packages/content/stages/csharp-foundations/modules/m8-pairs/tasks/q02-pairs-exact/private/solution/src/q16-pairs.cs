// Q16 同じ売り場から二つ
// 異なる位置の商品を二つ選び、合計がちょうどKの組の個数を表示する。順序違いは同じ組。同じ商品を2回選べない。同じ価格の別商品は選べる。入力は1行目N K、2行目N個の価格。1≦N≦20、0≦価格,K≦100。
// 例: 3 12 / 3 6 9 → 1

public static partial class Answers
{
    public static void Q16Pairs()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int k = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                if (int.Parse(parts[i]) + int.Parse(parts[j]) == k) count++;
            }
        }
        Console.WriteLine(count);
    }
}

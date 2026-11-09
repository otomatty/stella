// 到達B 順位の価格
// 入力の各行は半角空白区切り。名前は半角英字1〜10文字。null入力なし。
// 1行目N K、2行目N個の価格。小さい順でK番目の価格と、その価格と等しい商品の個数を2行表示。同じ価格の別商品も順位の1個として数える。1≦K≦N≦20、価格は0〜100。

public static partial class Answers
{
    public static void CbKthPrice()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int k = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = int.Parse(parts[i]);
        Array.Sort(a);
        int price = a[k - 1];
        int count = 0;
        for (int i = 0; i < n; i++)
            if (a[i] == price) count = count + 1;
        Console.WriteLine(price);
        Console.WriteLine(count);
    }
}

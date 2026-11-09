// S10 貯まる日
// 1行に現在額x、目標t、毎日の入金d、毎日の支出cを受け取る。1日ごとに入金、その後支出を行う。支出後の金額が初めてt以上になるまでの日数を表示する。初めからx≧tなら0日。0≦x,t≦1000、0≦c<d≦100。必ずいつか到達する。
// 例: 2 11 5 2 → 3

public static partial class Answers
{
    public static void S10DaysToReach()
    {
        string[] parts = Console.ReadLine().Split();
        int current = int.Parse(parts[0]);
        int t = int.Parse(parts[1]);
        int d = int.Parse(parts[2]);
        int c = int.Parse(parts[3]);
        if (current >= t)
        {
            Console.WriteLine(0);
            return;
        }
        int days = 0;
        while (current < t)
        {
            current = current + d - c;
            days = days + 1;
        }
        Console.WriteLine(days);
    }
}

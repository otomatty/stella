public class Q12SumEvensTests
{
    [Theory(DisplayName = "Q12 1から N の偶数の合計")]
    [InlineData(6, 12)]
    [InlineData(1, 0)]
    [InlineData(5, 6)]
    public void Q12SumEvens(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q12SumEvens(n));
    }
}

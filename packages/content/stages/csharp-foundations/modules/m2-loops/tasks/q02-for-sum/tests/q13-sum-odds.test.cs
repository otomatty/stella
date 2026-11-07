public class Q13SumOddsTests
{
    [Theory(DisplayName = "Q13 1から N の奇数の合計")]
    [InlineData(5, 9)]
    [InlineData(1, 1)]
    [InlineData(4, 4)]
    public void Q13SumOdds(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q13SumOdds(n));
    }
}

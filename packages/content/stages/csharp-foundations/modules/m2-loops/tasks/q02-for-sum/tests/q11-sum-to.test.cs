public class Q11SumToTests
{
    [Theory(DisplayName = "Q11 1から N の合計")]
    [InlineData(4, 10)]
    [InlineData(1, 1)]
    [InlineData(10, 55)]
    public void Q11SumTo(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q11SumTo(n));
    }
}

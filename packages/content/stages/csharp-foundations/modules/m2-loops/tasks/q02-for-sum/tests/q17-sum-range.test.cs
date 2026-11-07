public class Q17SumRangeTests
{
    [Theory(DisplayName = "Q17 Aから B の合計")]
    [InlineData(3, 6, 18)]
    [InlineData(5, 5, 5)]
    [InlineData(1, 10, 55)]
    public void Q17SumRange(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q17SumRange(a, b));
    }
}

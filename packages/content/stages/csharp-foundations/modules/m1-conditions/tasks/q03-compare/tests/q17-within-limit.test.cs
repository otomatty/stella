public class Q17WithinLimitTests
{
    [Theory(DisplayName = "Q17 以下")]
    [InlineData(100, "limit")]
    [InlineData(101, "over")]
    [InlineData(0, "limit")]
    public void Q17WithinLimit(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q17WithinLimit(n));
    }
}

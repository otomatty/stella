public class Q29InRangeTests
{
    [Theory(DisplayName = "Q29 範囲")]
    [InlineData(5, "in")]
    [InlineData(11, "in")]
    [InlineData(4, "out")]
    [InlineData(12, "out")]
    public void Q29InRange(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q29InRange(n));
    }
}

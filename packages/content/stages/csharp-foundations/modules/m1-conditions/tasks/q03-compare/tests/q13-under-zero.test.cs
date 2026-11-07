public class Q13UnderZeroTests
{
    [Theory(DisplayName = "Q13 未満")]
    [InlineData(-1, "under")]
    [InlineData(0, "ok")]
    [InlineData(5, "ok")]
    public void Q13UnderZero(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q13UnderZero(n));
    }
}

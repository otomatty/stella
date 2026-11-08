public class Q32OnlyOnePositiveTests
{
    [Theory(DisplayName = "Q32 片方だけ正")]
    [InlineData(1, -1, "one")]
    [InlineData(1, 2, "other")]
    [InlineData(-1, -2, "other")]
    [InlineData(5, 0, "one")]
    public void Q32OnlyOnePositive(int a, int b, string expected)
    {
        Assert.Equal(expected, Answers.Q32OnlyOnePositive(a, b));
    }
}

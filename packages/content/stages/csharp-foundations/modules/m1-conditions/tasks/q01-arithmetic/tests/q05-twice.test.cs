public class Q05TwiceTests
{
    [Theory(DisplayName = "Q05 2倍")]
    [InlineData(7, 14)]
    [InlineData(0, 0)]
    [InlineData(-3, -6)]
    public void Q05Twice(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q05Twice(n));
    }
}

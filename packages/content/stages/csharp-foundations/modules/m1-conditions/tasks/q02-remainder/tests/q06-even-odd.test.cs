public class Q06EvenOddTests
{
    [Theory(DisplayName = "Q06 偶数と奇数")]
    [InlineData(7, "odd")]
    [InlineData(8, "even")]
    [InlineData(0, "even")]
    public void Q06EvenOdd(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q06EvenOdd(n));
    }
}

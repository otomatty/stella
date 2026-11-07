public class Q24LargerTests
{
    [Theory(DisplayName = "Q24 大きい方")]
    [InlineData(3, 10, 10)]
    [InlineData(10, 3, 10)]
    [InlineData(4, 4, 4)]
    public void Q24Larger(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q24Larger(a, b));
    }
}

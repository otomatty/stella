public class Q26AbsDiffTests
{
    [Theory(DisplayName = "Q26 差の絶対値")]
    [InlineData(10, 3, 7)]
    [InlineData(3, 10, 7)]
    [InlineData(4, 4, 0)]
    public void Q26AbsDiff(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q26AbsDiff(a, b));
    }
}

public class Q01DifferenceTests
{
    [Theory(DisplayName = "Q01 差")]
    [InlineData(12, 5, 7)]
    [InlineData(5, 12, -7)]
    [InlineData(8, 8, 0)]
    public void Q01Difference(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q01Difference(a, b));
    }
}

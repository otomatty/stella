public class Q31BothNonZeroTests
{
    [Theory(DisplayName = "Q31 両方ゼロでない")]
    [InlineData(1, 2, "ok")]
    [InlineData(0, 2, "ng")]
    [InlineData(1, 0, "ng")]
    [InlineData(0, 0, "ng")]
    public void Q31BothNonZero(int a, int b, string expected)
    {
        Assert.Equal(expected, Answers.Q31BothNonZero(a, b));
    }
}

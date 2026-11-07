public class Q30MaxPositiveTests
{
    [Theory(DisplayName = "Q30 0より大きいものだけでの最大。すべて 0 以下なら 0")]
    [InlineData(3, -9, 4, 4)]
    [InlineData(-1, -2, -3, 0)]
    [InlineData(0, 5, 1, 5)]
    public void Q30MaxPositive(int a, int b, int c, int expected)
    {
        Assert.Equal(expected, Answers.Q30MaxPositive(a, b, c));
    }
}

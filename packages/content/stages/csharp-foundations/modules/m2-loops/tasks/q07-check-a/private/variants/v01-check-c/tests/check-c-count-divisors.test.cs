public class CheckCCountDivisorsTests
{
    [Theory(DisplayName = "確認C 割り切る個数")]
    [InlineData(6, 4)]
    [InlineData(1, 1)]
    [InlineData(7, 2)]
    [InlineData(9, 3)]
    public void CheckCCountDivisors(int n, int expected)
    {
        Assert.Equal(expected, Answers.CheckCCountDivisors(n));
    }
}

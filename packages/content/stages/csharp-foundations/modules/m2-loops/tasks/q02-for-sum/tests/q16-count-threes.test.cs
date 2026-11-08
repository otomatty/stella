public class Q16CountThreesTests
{
    [Theory(DisplayName = "Q16 1から N のうち3の倍数の個数")]
    [InlineData(10, 3)]
    [InlineData(2, 0)]
    [InlineData(3, 1)]
    public void Q16CountThrees(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q16CountThrees(n));
    }
}

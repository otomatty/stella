public class R2CountEvensTests
{
    [Theory(DisplayName = "R2 1から n の偶数の個数")]
    [InlineData(4, 2)]
    [InlineData(2, 1)]
    [InlineData(0, 0)]
    [InlineData(1, 0)]
    [InlineData(5, 2)]
    public void R2CountEvens(int n, int expected)
    {
        Assert.Equal(expected, Answers.R2CountEvens(n));
    }
}

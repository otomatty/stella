public class R1SumTests
{
    [Theory(DisplayName = "R1 1から n の合計")]
    [InlineData(4, 10)]
    [InlineData(3, 6)]
    [InlineData(0, 0)]
    [InlineData(1, 1)]
    [InlineData(20, 210)]
    public void R1Sum(int n, int expected)
    {
        Assert.Equal(expected, Answers.R1Sum(n));
    }
}

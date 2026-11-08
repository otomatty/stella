public class Q15SumSquaresTests
{
    [Theory(DisplayName = "Q15 1から N の平方の合計")]
    [InlineData(3, 14)]
    [InlineData(1, 1)]
    [InlineData(4, 30)]
    public void Q15SumSquares(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q15SumSquares(n));
    }
}

public class Q02SumOfThreeTests
{
    [Theory(DisplayName = "Q02 3つの合計")]
    [InlineData(1, 2, 3, 6)]
    [InlineData(0, 0, 0, 0)]
    [InlineData(-1, 4, 1, 4)]
    public void Q02SumOfThree(int a, int b, int c, int expected)
    {
        Assert.Equal(expected, Answers.Q02SumOfThree(a, b, c));
    }
}

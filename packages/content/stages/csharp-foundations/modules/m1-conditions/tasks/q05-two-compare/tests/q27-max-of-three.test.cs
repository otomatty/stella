public class Q27MaxOfThreeTests
{
    [Theory(DisplayName = "Q27 3つの最大")]
    [InlineData(3, 9, 4, 9)]
    [InlineData(9, 3, 4, 9)]
    [InlineData(1, 1, 1, 1)]
    [InlineData(1, 2, 9, 9)]
    public void Q27MaxOfThree(int a, int b, int c, int expected)
    {
        Assert.Equal(expected, Answers.Q27MaxOfThree(a, b, c));
    }
}

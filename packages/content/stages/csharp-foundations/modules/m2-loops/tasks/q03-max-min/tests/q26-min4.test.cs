public class Q26Min4Tests
{
    [Theory(DisplayName = "Q26 4つの最小")]
    [InlineData(8, 2, 5, 2, 2)]
    [InlineData(1, 4, 4, 0, 0)]
    [InlineData(7, 7, 7, 7, 7)]
    public void Q26Min4(int a, int b, int c, int d, int expected)
    {
        Assert.Equal(expected, Answers.Q26Min4(a, b, c, d));
    }
}

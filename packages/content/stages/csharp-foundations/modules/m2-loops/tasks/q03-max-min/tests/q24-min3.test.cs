public class Q24Min3Tests
{
    [Theory(DisplayName = "Q24 3つの最小")]
    [InlineData(3, 9, 4, 3)]
    [InlineData(9, 3, 4, 3)]
    [InlineData(1, 1, 1, 1)]
    public void Q24Min3(int a, int b, int c, int expected)
    {
        Assert.Equal(expected, Answers.Q24Min3(a, b, c));
    }
}

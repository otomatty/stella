public class Q23Max3Tests
{
    [Theory(DisplayName = "Q23 3つの最大")]
    [InlineData(3, 9, 4, 9)]
    [InlineData(9, 3, 4, 9)]
    [InlineData(1, 1, 1, 1)]
    public void Q23Max3(int a, int b, int c, int expected)
    {
        Assert.Equal(expected, Answers.Q23Max3(a, b, c));
    }
}

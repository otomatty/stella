public class Q27Max2Tests
{
    [Theory(DisplayName = "Q27 2つの最大")]
    [InlineData(3, 10, 10)]
    [InlineData(10, 3, 10)]
    [InlineData(4, 4, 4)]
    public void Q27Max2(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q27Max2(a, b));
    }
}

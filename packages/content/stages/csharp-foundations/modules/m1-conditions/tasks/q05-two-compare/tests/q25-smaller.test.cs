public class Q25SmallerTests
{
    [Theory(DisplayName = "Q25 小さい方")]
    [InlineData(3, 10, 3)]
    [InlineData(10, 3, 3)]
    [InlineData(4, 4, 4)]
    public void Q25Smaller(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q25Smaller(a, b));
    }
}

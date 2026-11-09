public class Q03RemainderTests
{
    [Theory(DisplayName = "Q03 余り")]
    [InlineData(12, 5, 2)]
    [InlineData(20, 6, 2)]
    [InlineData(9, 3, 0)]
    public void Q03Remainder(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q03Remainder(a, b));
    }
}

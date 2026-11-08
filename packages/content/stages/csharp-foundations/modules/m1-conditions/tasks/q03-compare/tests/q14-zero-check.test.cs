public class Q14ZeroCheckTests
{
    [Theory(DisplayName = "Q14 ゼロか")]
    [InlineData(0, "zero")]
    [InlineData(1, "nonzero")]
    [InlineData(-1, "nonzero")]
    public void Q14ZeroCheck(int n, string expected)
    {
        Assert.Equal(expected, Answers.Q14ZeroCheck(n));
    }
}

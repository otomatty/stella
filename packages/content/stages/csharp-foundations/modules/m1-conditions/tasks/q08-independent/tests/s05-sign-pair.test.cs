public class S05SignPairTests
{
    [Theory(DisplayName = "S05 符号の組")]
    [InlineData(-2, -3, "same")]
    [InlineData(0, 3, "different")]
    [InlineData(2, -3, "different")]
    [InlineData(2, 3, "same")]
    [InlineData(-1, 0, "different")]
    [InlineData(0, 0, "different")]
    public void S05SignPair(int a, int b, string expected)
    {
        Assert.Equal(expected, Answers.S05SignPair(a, b));
    }
}

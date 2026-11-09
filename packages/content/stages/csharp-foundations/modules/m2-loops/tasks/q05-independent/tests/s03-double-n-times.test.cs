public class S03DoubleNTimesTests
{
    [Theory(DisplayName = "S03 倍にする")]
    [InlineData(0, 1)]
    [InlineData(3, 8)]
    [InlineData(1, 2)]
    [InlineData(10, 1024)]
    public void S03DoubleNTimes(int n, int expected)
    {
        Assert.Equal(expected, Answers.S03DoubleNTimes(n));
    }
}

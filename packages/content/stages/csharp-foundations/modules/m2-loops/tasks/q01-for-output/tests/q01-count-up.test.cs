public class Q01CountUpTests
{
    [Theory(DisplayName = "Q01 1から N")]
    [InlineData(4, "1\n2\n3\n4\n")]
    [InlineData(1, "1\n")]
    [InlineData(6, "1\n2\n3\n4\n5\n6\n")]
    public void Q01CountUp(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q01CountUp(n)));
    }
}

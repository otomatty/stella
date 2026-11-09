public class Q06RepeatNTests
{
    [Theory(DisplayName = "Q06 Nを N 行")]
    [InlineData(3, "3\n3\n3\n")]
    [InlineData(1, "1\n")]
    [InlineData(4, "4\n4\n4\n4\n")]
    public void Q06RepeatN(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q06RepeatN(n)));
    }
}

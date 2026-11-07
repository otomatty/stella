public class S04ReachTests
{
    [Theory(DisplayName = "S04 到達した操作")]
    [InlineData("0 5 3\n2\n4\n-3\n", "2\n")]
    [InlineData("5 5 1\n1\n", "0\n")]
    [InlineData("0 10 2\n1\n1\n", "-1\n")]
    public void S04Reach(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S04Reach())));
    }
}

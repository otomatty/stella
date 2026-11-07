public class S07WaitingTests
{
    [Theory(DisplayName = "S07 待ち人数")]
    [InlineData("3\n5\n0\n4\n", "1\n")]
    [InlineData("3\n1\n1\n1\n", "0\n")]
    [InlineData("0\n", "0\n")]
    public void S07Waiting(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S07Waiting())));
    }
}

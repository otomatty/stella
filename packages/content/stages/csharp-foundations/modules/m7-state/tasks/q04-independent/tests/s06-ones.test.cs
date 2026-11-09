public class S06OnesTests
{
    [Theory(DisplayName = "S06 1の連続")]
    [InlineData("7\n1 1 0 1 1 1 0\n", "3\n")]
    [InlineData("1\n0\n", "0\n")]
    [InlineData("3\n1 1 1\n", "3\n")]
    public void S06Ones(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S06Ones())));
    }
}

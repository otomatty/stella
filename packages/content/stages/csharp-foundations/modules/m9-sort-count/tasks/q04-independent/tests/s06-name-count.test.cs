public class S06NameCountTests
{
    [Theory(DisplayName = "S06 指定名")]
    [InlineData("3\nTom\ntom\nTom\nTom\n", "2\n")]
    [InlineData("1\nTom\ntom\n", "0\n")]
    public void S06NameCount(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S06NameCount())));
    }
}

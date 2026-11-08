public class S10TimesTests
{
    [Theory(DisplayName = "S10 掛け算")]
    [InlineData("2 3\n", "1 2 3\n2 4 6\n")]
    [InlineData("1 1\n", "1\n")]
    public void S10Times(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S10Times())));
    }
}

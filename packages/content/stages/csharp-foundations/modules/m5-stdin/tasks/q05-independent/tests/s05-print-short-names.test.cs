public class S05PrintShortNamesTests
{
    [Theory(DisplayName = "S05 短い名前")]
    [InlineData("3\ntom\nalice\nyu\n", "tom\nyu\n")]
    [InlineData("1\nabcd\n", "")]
    [InlineData("4\na\nbb\nccc\ndddd\n", "a\nbb\nccc\n")]
    public void S05PrintShortNames(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S05PrintShortNames())));
    }
}

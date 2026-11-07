public class CheckBCountShortTests
{
    [Theory(DisplayName = "確認B 短い名前の件数")]
    [InlineData("3\naki\nyuki\nbo\n3\n", "2\n")]
    [InlineData("1\naa\n2\n", "1\n")]
    [InlineData("2\nabc\ndef\n1\n", "0\n")]
    public void CheckBCountShort(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckBCountShort())));
    }
}

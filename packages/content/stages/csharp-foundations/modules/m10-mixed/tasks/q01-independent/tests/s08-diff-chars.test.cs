public class S08DiffCharsTests
{
    [Theory(DisplayName = "S08 検査結果")]
    [InlineData("AB12\nAb13\n", "2\n")]
    [InlineData("ABC\nAB\n", "-1\n")]
    [InlineData("\n\n", "0\n")]
    [InlineData("a\na\n", "0\n")]
    public void S08DiffChars(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S08DiffChars())));
    }
}

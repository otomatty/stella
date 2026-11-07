public class DbSameLengthTests
{
    [Theory(DisplayName = "到達B 長さ")]
    [InlineData("ab\nXY\n", "SAME\n")]
    [InlineData("a\nab\n", "DIFFERENT\n")]
    [InlineData("\n\n", "SAME\n")]
    public void DbSameLength(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.DbSameLength())));
    }
}

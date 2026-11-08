public class R2DigitsYesTests
{
    [Theory(DisplayName = "R2 数字だけ")]
    [InlineData("a12\n", "No\n")]
    [InlineData("123\n", "Yes\n")]
    [InlineData("\n", "No\n")]
    [InlineData("12a\n", "No\n")]
    public void R2DigitsYes(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.R2DigitsYes())));
    }
}

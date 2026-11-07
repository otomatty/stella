public class Q02AcrossTests
{
    [Theory(DisplayName = "Q02 K以上の組")]
    [InlineData("1 1 0\n0\n0\n", "1\n")]
    [InlineData("1 1 100\n100\n100\n", "1\n")]
    public void Q02Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q02Across())));
    }
}

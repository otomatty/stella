public class Q13Diff2Tests
{
    [Theory(DisplayName = "Q13 2つの差")]
    [InlineData("12 5\n", "7\n")]
    [InlineData("5 12\n", "-7\n")]
    [InlineData("8 8\n", "0\n")]
    public void Q13Diff2(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q13Diff2())));
    }
}

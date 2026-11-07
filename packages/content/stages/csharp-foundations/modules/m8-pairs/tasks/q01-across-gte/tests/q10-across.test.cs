public class Q10AcrossTests
{
    [Theory(DisplayName = "Q10 K以上の組")]
    [InlineData("3 2 10\n2 7 7\n3 8\n", "5\n")]
    [InlineData("1 1 10\n2\n7\n", "0\n")]
    public void Q10Across(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q10Across())));
    }
}

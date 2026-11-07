public class Q14RemainingTests
{
    [Theory(DisplayName = "Q14 残金")]
    [InlineData("20 3\n3\n4\n5\n", "8\n")]
    [InlineData("20 0\n", "20\n")]
    public void Q14Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q14Remaining())));
    }
}

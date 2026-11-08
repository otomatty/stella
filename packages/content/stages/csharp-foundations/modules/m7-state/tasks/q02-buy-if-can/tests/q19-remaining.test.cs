public class Q19RemainingTests
{
    [Theory(DisplayName = "Q19 残金")]
    [InlineData("10 2\n11\n12\n", "10\n")]
    [InlineData("10 0\n", "10\n")]
    public void Q19Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q19Remaining())));
    }
}

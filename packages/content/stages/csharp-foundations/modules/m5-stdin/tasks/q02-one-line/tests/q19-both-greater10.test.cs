public class Q19BothGreater10Tests
{
    [Theory(DisplayName = "Q19 どちらも10より大きい")]
    [InlineData("11 12\n", "both\n")]
    [InlineData("11 10\n", "no\n")]
    [InlineData("10 12\n", "no\n")]
    public void Q19BothGreater10(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q19BothGreater10())));
    }
}

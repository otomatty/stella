public class S03SumAbsDiffTests
{
    [Theory(DisplayName = "S03 記録の変化")]
    [InlineData("4\n5 2 2 8\n", "9\n")]
    [InlineData("1\n5\n", "0\n")]
    [InlineData("2\n1 1\n", "0\n")]
    public void S03SumAbsDiff(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S03SumAbsDiff())));
    }
}

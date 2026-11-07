public class Q33SumAbsDiffTests
{
    [Theory(DisplayName = "Q33 差の合計")]
    [InlineData("4\n3 10 6 20\n", "25\n")]
    [InlineData("2\n3 10\n", "7\n")]
    [InlineData("2\n5 5\n", "0\n")]
    public void Q33SumAbsDiff(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q33SumAbsDiff())));
    }
}

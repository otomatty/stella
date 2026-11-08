public class CheckCScoreGapTests
{
    [Theory(DisplayName = "確認C 以上と未満の差")]
    [InlineData("4 50\n40 50 60 10\n", "60\n")]
    [InlineData("1 50\n50\n", "50\n")]
    [InlineData("2 50\n10 20\n", "-30\n")]
    public void CheckCScoreGap(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckCScoreGap())));
    }
}

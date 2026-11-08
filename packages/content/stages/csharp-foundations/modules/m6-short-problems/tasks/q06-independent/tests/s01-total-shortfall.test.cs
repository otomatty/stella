public class S01TotalShortfallTests
{
    [Theory(DisplayName = "S01 追加点")]
    [InlineData("3 60\n40 60 75\n", "20\n")]
    [InlineData("2 60\n60 80\n", "0\n")]
    [InlineData("1 60\n0\n", "60\n")]
    public void S01TotalShortfall(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S01TotalShortfall())));
    }
}

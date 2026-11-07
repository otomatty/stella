public class Q05CountEqTests
{
    [Theory(DisplayName = "Q05 ちょうど P")]
    [InlineData("5\n50 60 80 59 100\n60\n", "1\n")]
    [InlineData("1\n50\n60\n", "0\n")]
    public void Q05CountEq(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q05CountEq())));
    }
}

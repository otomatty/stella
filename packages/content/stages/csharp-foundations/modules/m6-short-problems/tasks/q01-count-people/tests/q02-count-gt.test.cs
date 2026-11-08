public class Q02CountGtTests
{
    [Theory(DisplayName = "Q02 P より大きい")]
    [InlineData("5\n50 60 80 59 100\n60\n", "2\n")]
    [InlineData("1\n60\n60\n", "0\n")]
    public void Q02CountGt(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q02CountGt())));
    }
}

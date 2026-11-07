public class Q28CountNTests
{
    [Theory(DisplayName = "Q28 Nそのもの")]
    [InlineData("4\n", "4\n")]
    [InlineData("1\n", "1\n")]
    [InlineData("20\n", "20\n")]
    public void Q28CountN(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q28CountN())));
    }
}

public class Q02FinalTests
{
    [Theory(DisplayName = "Q02 最後の値")]
    [InlineData("0 3\n1\n2\n3\n", "6\n")]
    [InlineData("0 0\n", "0\n")]
    public void Q02Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q02Final())));
    }
}

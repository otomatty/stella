public class Q02PlusOneTests
{
    [Theory(DisplayName = "Q02 +1")]
    [InlineData("7\n", "8\n")]
    [InlineData("0\n", "1\n")]
    [InlineData("-1\n", "0\n")]
    public void Q02PlusOne(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q02PlusOne())));
    }
}

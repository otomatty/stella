public class Q27FirstOfTests
{
    [Theory(DisplayName = "Q27 先頭の値")]
    [InlineData("4\n3 9 4 11\n", "3\n")]
    [InlineData("1\n8\n", "8\n")]
    public void Q27FirstOf(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q27FirstOf())));
    }
}

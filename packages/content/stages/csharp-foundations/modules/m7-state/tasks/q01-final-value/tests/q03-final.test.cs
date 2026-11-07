public class Q03FinalTests
{
    [Theory(DisplayName = "Q03 最後の値")]
    [InlineData("8 1\n-8\n", "0\n")]
    [InlineData("8 0\n", "8\n")]
    public void Q03Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q03Final())));
    }
}

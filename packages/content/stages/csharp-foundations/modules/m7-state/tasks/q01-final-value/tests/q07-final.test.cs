public class Q07FinalTests
{
    [Theory(DisplayName = "Q07 最後の値")]
    [InlineData("10 0\n", "10\n")]
    [InlineData("-100 1\n100\n", "0\n")]
    public void Q07Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q07Final())));
    }
}

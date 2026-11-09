public class S09MinBalanceTests
{
    [Theory(DisplayName = "S09 残高と不足")]
    [InlineData("2 3\n-5\n2\n4\n", "-3\n2\n")]
    [InlineData("10 2\n1\n1\n", "10\n0\n")]
    public void S09MinBalance(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S09MinBalance())));
    }
}

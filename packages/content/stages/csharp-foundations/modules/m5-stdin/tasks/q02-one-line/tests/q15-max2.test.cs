public class Q15Max2Tests
{
    [Theory(DisplayName = "Q15 大きい方")]
    [InlineData("3 10\n", "10\n")]
    [InlineData("10 3\n", "10\n")]
    [InlineData("4 4\n", "4\n")]
    public void Q15Max2(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q15Max2())));
    }
}

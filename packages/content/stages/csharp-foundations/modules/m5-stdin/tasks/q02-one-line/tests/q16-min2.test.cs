public class Q16Min2Tests
{
    [Theory(DisplayName = "Q16 小さい方")]
    [InlineData("3 10\n", "3\n")]
    [InlineData("10 3\n", "3\n")]
    [InlineData("4 4\n", "4\n")]
    public void Q16Min2(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q16Min2())));
    }
}
